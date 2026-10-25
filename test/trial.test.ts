import { createExecutionContext, createScheduledController, waitOnExecutionContext } from "cloudflare:test";
import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import worker from "../src/server/index";
import { TRIAL_DAILY_LIMIT } from "../src/server/trial/trial";
import { makeSpace, makeUser, ORIGIN } from "./helpers/users";

/** 体験版を始めて、その人として API を呼べるようにする */
async function startTrial(ip: string, body: Record<string, unknown> = { lang: "ja", theme: "sakura" }) {
  const res = await exports.default.fetch(`${ORIGIN}/api/trial`, {
    method: "POST",
    headers: { Origin: ORIGIN, "Content-Type": "application/json", "CF-Connecting-IP": ip },
    body: JSON.stringify(body),
  });
  const raw = res.headers.getSetCookie().find((c) => c.startsWith("__Host-covow_session="));
  const cookie = raw?.split(";")[0] ?? "";
  const call = (path: string, init: { method?: string; body?: unknown } = {}) =>
    exports.default.fetch(`${ORIGIN}/api${path}`, {
      method: init.method ?? "GET",
      headers: { Cookie: cookie, ...(init.method && init.method !== "GET" ? { Origin: ORIGIN } : {}), "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  return { res, cookie, call };
}

describe("体験版", () => {
  it("仮のアカウントと、使い込んだ見本のスペース（メンバー役のはるさん・予算・支出・予定）ができる", async () => {
    const t = await startTrial("10.0.0.1");
    expect(t.res.status).toBe(201);
    const me = await (await t.call("/me")).json<{ user: { isGuest: boolean; guestExpiresAt: string; locale: string; theme: string }; space: { name: string } }>();
    expect(me.user).toMatchObject({ isGuest: true, locale: "ja", theme: "sakura" });
    expect(new Date(me.user.guestExpiresAt).getTime()).toBeGreaterThan(Date.now() + 23 * 3600_000);
    expect(me.space.name).toBe("ふたりの家");

    const space = await (await t.call("/space")).json<{ members: { displayName: string }[] }>();
    expect(space.members.map((m) => m.displayName)).toEqual(["ゲスト", "はる"]);
    const plans = (await (await t.call("/plans")).json<{ plans: { status: string }[] }>()).plans;
    expect(plans.length).toBeGreaterThanOrEqual(7);
    expect(new Set(plans.map((p) => p.status))).toEqual(new Set(["planned", "purchased", "canceled"]));
    const summary = await (await t.call("/summary")).json<{ budget: number; actualTotal: number }>();
    expect(summary.budget).toBe(180000);
    expect(summary.actualTotal).toBeGreaterThan(0);
    const cats = (await (await t.call("/categories")).json<{ categories: { name: string }[] }>()).categories;
    expect(cats[0]?.name).toBe("食費");
  });

  it("Mix で始めると、画面の言語は Mix のまま、見本データは日本語", async () => {
    const t = await startTrial("10.0.0.9", { lang: "mix", theme: "aurora" });
    const me = await (await t.call("/me")).json<{ user: { locale: string }; space: { name: string } }>();
    expect(me.user.locale).toBe("mix");
    expect(me.space.name).toBe("ふたりの家");
  });

  it("招待・参加・メンバーを外す・抜ける・スペース作成はお休み（403 TRIAL_LOCKED）", async () => {
    const t = await startTrial("10.0.0.2");
    for (const [method, path] of [
      ["POST", "/space/invite"],
      ["POST", "/space/leave"],
      ["POST", "/space"],
      ["POST", "/invites/some-token/accept"],
      ["DELETE", `/space/members/${crypto.randomUUID()}`],
    ] as const) {
      const res = await t.call(path, { method, body: {} });
      expect([res.status, (await res.json<{ code: string }>()).code], `${method} ${path}`).toEqual([403, "TRIAL_LOCKED"]);
    }
    // ふだんの操作はできる
    expect((await t.call("/plans", { method: "POST", body: { title: "テスト", plannedAmount: 1000 } })).status).toBe(201);
  });

  it("メンバー役を呼ぶと、はるさんが予定を1つ追加する。本物のアカウントでは使えない", async () => {
    const t = await startTrial("10.0.0.3");
    const before = (await (await t.call("/plans")).json<{ plans: unknown[] }>()).plans.length;
    const res = await t.call("/trial/partner-visit", { method: "POST" });
    expect(res.status).toBe(201);
    const plans = (await (await t.call("/plans")).json<{ plans: { createdByName: string; title: string }[] }>()).plans;
    expect(plans.length).toBe(before + 1);
    expect(plans.some((p) => p.title === "バスタオル" && p.createdByName === "はる")).toBe(true);

    const real = await makeUser("Real");
    await makeSpace(real);
    expect((await real.call("/trial/partner-visit", { method: "POST" })).status).toBe(404);
    expect((await real.call("/trial", { method: "POST", body: {} })).status).toBe(409);
  });

  it(`同じ IP からは1日 ${TRIAL_DAILY_LIMIT} 回まで（それ以上は 429）。IP そのものは保存しない`, async () => {
    for (let i = 0; i < TRIAL_DAILY_LIMIT; i++) expect((await startTrial("10.9.9.9")).res.status).toBe(201);
    const over = await startTrial("10.9.9.9");
    expect(over.res.status).toBe(429);
    const stored = await env.DB.prepare("SELECT key FROM trial_quota").all<{ key: string }>();
    expect(stored.results.some((r) => r.key.includes("10.9.9.9"))).toBe(false);
  });

  it("体験版のログインは延長されない", async () => {
    const t = await startTrial("10.0.0.4");
    await t.call("/me");
    expect(t.res.headers.getSetCookie().length).toBeGreaterThan(0);
    const again = await t.call("/me");
    expect(again.headers.getSetCookie().some((c) => c.startsWith("__Host-covow_session="))).toBe(false);
  });

  it("毎日の定期処理で、期限の過ぎた体験版だけがスペースごと消える", async () => {
    const old = await startTrial("10.0.0.5");
    const fresh = await startTrial("10.0.0.6");
    const real = await makeUser("Keep");
    const realSpace = await makeSpace(real);
    const oldMe = await (await old.call("/me")).json<{ user: { id: string }; space: { id: string } }>();
    await env.DB.prepare("UPDATE users SET guest_expires_at = ? WHERE id = ? OR id IN (SELECT user_id FROM space_members WHERE space_id = ?)")
      .bind(new Date(Date.now() - 1000).toISOString(), oldMe.user.id, oldMe.space.id)
      .run();

    const ctx = createExecutionContext();
    await worker.scheduled(createScheduledController({ scheduledTime: new Date(), cron: "0 18 * * *" }), env, ctx);
    await waitOnExecutionContext(ctx);

    const count = async (sql: string, ...args: string[]) => (await env.DB.prepare(sql).bind(...args).first<{ n: number }>())!.n;
    expect(await count("SELECT COUNT(*) AS n FROM spaces WHERE id = ?", oldMe.space.id)).toBe(0);
    expect(await count("SELECT COUNT(*) AS n FROM expenses WHERE space_id = ?", oldMe.space.id)).toBe(0);
    expect(await count("SELECT COUNT(*) AS n FROM users WHERE id = ?", oldMe.user.id)).toBe(0);
    expect((await old.call("/me")).status).toBe(401);
    // まだ期限内の体験版と、本物のアカウントはそのまま
    expect((await fresh.call("/space")).status).toBe(200);
    expect(await count("SELECT COUNT(*) AS n FROM spaces WHERE id = ?", realSpace.id)).toBe(1);
  });
});
