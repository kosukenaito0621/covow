import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { jstToday } from "../src/shared/date/jst";
import { join, makeInvite, makeSpace, makeUser, ORIGIN, type TestUser } from "./helpers/users";

// COWEL との連携（COWEL の docs/superpowers/plans/2026-11-04-covow-sync.md の Task 4）。
// 設定で出す8桁の番号を COWEL が鍵に換え、その鍵で自分のスペースの変更の記録帳だけを読む。
const TODAY = jstToday();
const sync = (path: string, init: { method?: string; key?: string; body?: unknown; origin?: string } = {}) =>
  exports.default.fetch(`${ORIGIN}/api/sync${path}`, {
    method: init.method ?? "GET",
    headers: {
      ...(init.key ? { Authorization: `Bearer ${init.key}` } : {}),
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(init.origin ? { Origin: init.origin } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
async function codeFor(u: TestUser) {
  const res = await u.call("/space/sync-code", { method: "POST" });
  expect(res.status, await res.clone().text()).toBe(201);
  return (await res.json<{ code: string; expiresAt: string }>()).code;
}
async function link(u: TestUser) {
  const res = await sync("/link/exchange", { method: "POST", body: { code: await codeFor(u) } });
  expect(res.status, await res.clone().text()).toBe(200);
  return res.json<{ key: string; spaceId: string; userId: string; displayName: string }>();
}
async function pair() {
  const a = await makeUser("Aoi"), b = await makeUser("Ben");
  const space = await makeSpace(a);
  await join(b, await makeInvite(a));
  return { a, b, space };
}
const addExpense = async (u: TestUser, title: string, spentAt = TODAY) => {
  const res = await u.call("/expenses", { method: "POST", body: { title, actualAmount: 1000, spentAt } });
  expect(res.status).toBe(201);
  return (await res.json<{ expense: { id: string } }>()).expense;
};

describe("COWEL との連携", () => {
  it("番号を交換すると鍵が返り、同じ番号は2回使えない、10分を過ぎると使えない", async () => {
    const { a, space } = await pair();
    const code = await codeFor(a);
    expect(code).toMatch(/^\d{8}$/);
    const first = await sync("/link/exchange", { method: "POST", body: { code } });
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ spaceId: space.id, userId: a.id, displayName: "Aoi" });
    expect((await sync("/link/exchange", { method: "POST", body: { code } })).status).toBe(400);
    const late = await codeFor(a);
    await env.DB.prepare("UPDATE sync_link_codes SET expires_at = ? WHERE used_at IS NULL").bind(new Date(Date.now() - 1000).toISOString()).run();
    const res = await sync("/link/exchange", { method: "POST", body: { code: late } });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "CODE_INVALID" });
  });

  it("鍵で自分のスペースの変更だけが読め、after より後だけ・500件まで", async () => {
    const { a } = await pair();
    const { key } = await link(a);
    const e1 = await addExpense(a, "Bread"), e2 = await addExpense(a, "Milk");
    const all = await (await sync("/expense-changes?after=0&limit=500", { key })).json<{ changes: { seq: number; op: string; expense?: { id: string; title: string } }[]; next: number }>();
    expect(all.changes.map((c) => c.expense?.id)).toEqual([e1.id, e2.id]);
    expect(all.next).toBe(all.changes[1]!.seq);
    const rest = await (await sync(`/expense-changes?after=${all.changes[0]!.seq}&limit=500`, { key })).json<{ changes: { seq: number }[]; next: number }>();
    expect(rest.changes).toHaveLength(1);
    const none = await (await sync(`/expense-changes?after=${all.next}&limit=500`, { key })).json<{ changes: unknown[]; next: number }>();
    expect(none).toEqual({ changes: [], next: all.next });
    expect((await sync("/expense-changes?after=0&limit=501", { key })).status).toBe(422);
    await a.call(`/expenses/${e1.id}`, { method: "DELETE" });
    const after = await (await sync(`/expense-changes?after=${all.next}&limit=500`, { key })).json<{ changes: { op: string; expenseId?: string }[] }>();
    expect(after.changes).toEqual([expect.objectContaining({ op: "delete", expenseId: e1.id })]);
  });

  it("別のスペースの鍵では読めない、鍵なしと失効した鍵は401", async () => {
    const one = await pair(), two = await pair();
    await addExpense(one.a, "Only mine");
    const { key } = await link(two.a);
    const seen = await (await sync("/expense-changes?after=0&limit=500", { key })).json<{ changes: unknown[] }>();
    expect(seen.changes).toEqual([]);
    expect((await sync("/expense-changes?after=0&limit=500")).status).toBe(401);
    expect((await sync("/expense-changes?after=0&limit=500", { key: "not-a-key" })).status).toBe(401);
    expect((await two.a.call("/space/sync-revoke", { method: "POST" })).status).toBe(204);
    expect((await sync("/expense-changes?after=0&limit=500", { key })).status).toBe(401);
  });

  it("スナップショットは from 以降の支出と、その時点の cursor を返す", async () => {
    const { a } = await pair();
    await addExpense(a, "Old", "2026-10-31");
    const kept = await addExpense(a, "New", "2026-11-02");
    const { key } = await link(a);
    const snap = await (await sync("/expenses-snapshot?from=2026-11-01", { key })).json<{ expenses: { id: string; title: string }[]; cursor: number }>();
    expect(snap.expenses.map((e) => e.title)).toEqual(["New"]);
    expect(snap.expenses[0]).toMatchObject({ id: kept.id, actualAmount: 1000, spentAt: "2026-11-02", payerUserId: a.id, splitUserId: null, payerRatio: 100 });
    const max = (await env.DB.prepare("SELECT MAX(seq) AS m FROM expense_changes").first<{ m: number }>())!.m;
    expect(snap.cursor).toBeLessThanOrEqual(max);
    expect(snap.cursor).toBeGreaterThan(0);
  });

  it("exchange は Origin なしで受け付け、ほかの変更系は今までどおり Origin を要求する", async () => {
    const { a } = await pair();
    expect((await sync("/link/exchange", { method: "POST", body: { code: await codeFor(a) } })).status).toBe(200);
    expect((await a.call("/expenses", { method: "POST", body: { title: "X", actualAmount: 1, spentAt: TODAY }, origin: "https://evil.example" })).status).toBe(403);
  });

  it("番号の交換は同じ接続元から1日20回まで（当て推量を防ぐ）。超えると正しい番号でも 429", async () => {
    const { a } = await pair();
    const from = (code: string) =>
      exports.default.fetch(`${ORIGIN}/api/sync/link/exchange`, { method: "POST", headers: { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.9" }, body: JSON.stringify({ code }) });
    for (let i = 0; i < 20; i++) expect((await from(String(10000000 + i))).status).toBe(400);
    const res = await from(await codeFor(a));
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ code: "TOO_MANY_TRIES" });
    // 別の接続元はまだ使える
    expect((await sync("/link/exchange", { method: "POST", body: { code: await codeFor(a) } })).status).toBe(200);
  });

  it("members は2人の連携状態を返す", async () => {
    const { a, b } = await pair();
    const { key } = await link(a);
    const res = await (await sync("/members", { key })).json<{ members: { userId: string; displayName: string; linked: boolean }[] }>();
    expect(res.members.map((m) => [m.userId, m.linked]).sort()).toEqual([[a.id, true], [b.id, false]].sort());
    await link(b);
    const both = await (await sync("/members", { key })).json<{ members: { linked: boolean }[] }>();
    expect(both.members.every((m) => m.linked)).toBe(true);
    const status = await (await b.call("/space/sync-status")).json<{ linked: boolean }>();
    expect(status.linked).toBe(true);
  });
});
