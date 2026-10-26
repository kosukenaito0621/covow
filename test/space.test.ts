import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { sha256Hex } from "../src/server/auth/tokens";
import { join, makeInvite, makeSpace, makeUser, ORIGIN } from "./helpers/users";

type SpaceBody = { id: string; name: string; maxMembers: number; members: { id: string; displayName: string; isMe: boolean; role: string }[] };

const memberCount = async (spaceId: string) =>
  (await env.DB.prepare("SELECT COUNT(*) AS n FROM space_members WHERE space_id = ?").bind(spaceId).first<{ n: number }>())!.n;

const code = async (res: Response) => (await res.json<{ code: string }>()).code;

describe("スペースを作る", () => {
  it("ログインしていなければ 401、スペースがなければ 403 NO_SPACE", async () => {
    expect((await exports.default.fetch(`${ORIGIN}/api/space`)).status).toBe(401);
    const a = await makeUser("Aoi");
    const res = await a.call("/space");
    expect(res.status).toBe(403);
    expect(await code(res)).toBe("NO_SPACE");
  });

  it("作った人が最初のメンバーになり、作った人の言語で初期カテゴリが入る。2つ目は作れない", async () => {
    const a = await makeUser("Aoi", "ja");
    const space = await makeSpace(a, "ふたりの家");
    const cats = await env.DB.prepare("SELECT name FROM categories WHERE space_id = ? ORDER BY sort_order").bind(space.id).all<{ name: string }>();
    expect(cats.results.map((r) => r.name)[0]).toBe("食費");
    expect(cats.results).toHaveLength(10);

    const me = await (await a.call("/me")).json<{ space: { id: string } | null }>();
    expect(me.space?.id).toBe(space.id);

    const second = await a.call("/space", { method: "POST", body: { name: "Other" } });
    expect(second.status).toBe(409);
    expect(await code(second)).toBe("ALREADY_IN_SPACE");
    const owned = await env.DB.prepare("SELECT COUNT(*) AS n FROM spaces WHERE created_by = ?").bind(a.id).first<{ n: number }>();
    expect(owned?.n).toBe(1);
  });

  it("英語の人には英語のカテゴリ", async () => {
    const a = await makeUser("Ann", "en");
    const space = await makeSpace(a);
    const first = await env.DB.prepare("SELECT name FROM categories WHERE space_id = ? AND sort_order = 0").bind(space.id).first<{ name: string }>();
    expect(first?.name).toBe("Groceries");
  });

  it("Mix の人には日本語のカテゴリ（データは日本語）", async () => {
    const a = await makeUser("Mix", "mix");
    const space = await makeSpace(a);
    const first = await env.DB.prepare("SELECT name FROM categories WHERE space_id = ? AND sort_order = 0").bind(space.id).first<{ name: string }>();
    expect(first?.name).toBe("食費");
  });

  it("名前が空なら 422、別サイトからは 403", async () => {
    const a = await makeUser("Aoi");
    expect((await a.call("/space", { method: "POST", body: { name: "   " } })).status).toBe(422);
    expect((await a.call("/space", { method: "POST", body: { name: "Home" }, origin: "https://evil.example" })).status).toBe(403);
  });

  it("名前を変えられる", async () => {
    const a = await makeUser("Aoi");
    await makeSpace(a);
    expect((await a.call("/space", { method: "PATCH", body: { name: "Our place" } })).status).toBe(200);
    expect((await (await a.call("/space")).json<SpaceBody>()).name).toBe("Our place");
  });
});

describe("招待リンク", () => {
  it("発行 → ログイン前でも中身を確認 → 参加。使ったリンクは2回目は使えない", async () => {
    const a = await makeUser("Aoi");
    const b = await makeUser("Haru");
    const c = await makeUser("Mio");
    await makeSpace(a, "Home");
    const token = await makeInvite(a);

    // DB にはトークンそのものは入っていない
    expect(await env.DB.prepare("SELECT id FROM invites WHERE token_hash = ?").bind(token).first()).toBeNull();
    expect(await env.DB.prepare("SELECT id FROM invites WHERE token_hash = ?").bind(await sha256Hex(token)).first()).not.toBeNull();

    const peek = await exports.default.fetch(`${ORIGIN}/api/invites/${token}`);
    const info = await peek.json<Record<string, unknown>>();
    expect(info).toMatchObject({ status: "valid", spaceName: "Home", inviterName: "Aoi" });
    expect(JSON.stringify(info)).not.toContain("@example.com");

    expect((await join(b, token)).status).toBe(200);
    const space = await (await b.call("/space")).json<SpaceBody>();
    expect(space.members.map((m) => [m.displayName, m.isMe])).toEqual([
      ["Aoi", false],
      ["Haru", true],
    ]);
    expect(space.maxMembers).toBe(4);

    expect(await (await exports.default.fetch(`${ORIGIN}/api/invites/${token}`)).json()).toMatchObject({ status: "used" });
    const again = await join(c, token);
    expect(again.status).toBe(410);
    expect(await code(again)).toBe("INVITE_USED");
  });

  it("新しいリンクを出すと前のリンクは取り消される。取り消し・期限切れ・存在しないリンクでは参加できない", async () => {
    const a = await makeUser("Aoi");
    const b = await makeUser("Haru");
    await makeSpace(a);
    const old = await makeInvite(a);
    const fresh = await makeInvite(a);
    const r1 = await join(b, old);
    expect([r1.status, await code(r1)]).toEqual([410, "INVITE_REVOKED"]);

    await env.DB.prepare("UPDATE invites SET expires_at = ? WHERE token_hash = ?")
      .bind(new Date(Date.now() - 1000).toISOString(), await sha256Hex(fresh))
      .run();
    const r2 = await join(b, fresh);
    expect([r2.status, await code(r2)]).toEqual([410, "INVITE_EXPIRED"]);

    const r3 = await join(b, "no-such-token");
    expect([r3.status, await code(r3)]).toEqual([404, "INVITE_NOT_FOUND"]);

    const third = await makeInvite(a);
    expect((await a.call("/space/invite", { method: "DELETE" })).status).toBe(204);
    expect((await (await a.call("/space/invite")).json<{ active: unknown }>()).active).toBeNull();
    const r4 = await join(b, third);
    expect([r4.status, await code(r4)]).toEqual([410, "INVITE_REVOKED"]);
    expect(await memberCount((await (await a.call("/space")).json<SpaceBody>()).id)).toBe(1);
  });

  it("有効なリンクがあるかは分かるが、URL は返さない", async () => {
    const a = await makeUser("Aoi");
    await makeSpace(a);
    await makeInvite(a);
    const body = await (await a.call("/space/invite")).json<{ active: { expiresAt: string } | null }>();
    expect(body.active?.expiresAt).toBeTruthy();
    expect(JSON.stringify(body)).not.toContain("/invite/");
  });

  it("4人そろったら、リンクは出せず、出してあったリンクでも参加できない（5人目は DB でも拒否）", async () => {
    const [a, b, c, d, e] = await Promise.all(["A", "B", "C", "D", "E"].map((n) => makeUser(n)));
    const space = await makeSpace(a!);
    expect((await join(b!, await makeInvite(a!))).status).toBe(200);
    expect((await join(c!, await makeInvite(b!))).status).toBe(200);
    const pending = await makeInvite(c!);
    // 出してあったリンクとは別のリンクで4人目が入る（新しいリンクを出すと前のは取り消されるので、DB に直接入れる）
    await env.DB.prepare("INSERT INTO space_members (space_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)")
      .bind(space.id, d!.id, new Date().toISOString())
      .run();
    expect(await memberCount(space.id)).toBe(4);

    expect(await (await exports.default.fetch(`${ORIGIN}/api/invites/${pending}`)).json()).toMatchObject({ status: "full" });
    const late = await join(e!, pending);
    expect([late.status, await code(late)]).toEqual([409, "SPACE_FULL"]);
    const issue = await a!.call("/space/invite", { method: "POST" });
    expect([issue.status, await code(issue)]).toEqual([409, "SPACE_FULL"]);

    await expect(
      env.DB.prepare("INSERT INTO space_members (space_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)")
        .bind(space.id, e!.id, new Date().toISOString())
        .run(),
    ).rejects.toThrow(/SPACE_FULL/);
    expect(await memberCount(space.id)).toBe(4);
  });

  it("同じリンクで2人が同時に参加しても、入れるのは1人だけ", async () => {
    const a = await makeUser("Aoi");
    const [b, c] = await Promise.all([makeUser("Haru"), makeUser("Mio")]);
    const space = await makeSpace(a);
    const token = await makeInvite(a);
    const results = await Promise.all([join(b, token), join(c, token)]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 410]);
    expect(await memberCount(space.id)).toBe(2);
  });

  it("すでに別のスペースにいる人は参加できず、リンクは使われずに残る", async () => {
    const a = await makeUser("Aoi");
    const b = await makeUser("Haru");
    await makeSpace(a);
    await makeSpace(b);
    const token = await makeInvite(a);
    const res = await join(b, token);
    expect([res.status, await code(res)]).toEqual([409, "ALREADY_IN_SPACE"]);
    expect(await (await exports.default.fetch(`${ORIGIN}/api/invites/${token}`)).json()).toMatchObject({ status: "valid" });
  });
});

describe("メンバーを外す・抜ける", () => {
  it("外されたメンバーは、ログインしたままでもすぐにスペースを見られなくなる", async () => {
    const a = await makeUser("Aoi");
    const b = await makeUser("Haru");
    await makeSpace(a);
    await join(b, await makeInvite(a));
    expect((await b.call("/space")).status).toBe(200);

    expect((await a.call(`/space/members/${b.id}`, { method: "DELETE" })).status).toBe(204);
    const after = await b.call("/space");
    expect([after.status, await code(after)]).toEqual([403, "NO_SPACE"]);
    // ログイン自体は続いている
    expect((await b.call("/me")).status).toBe(200);
  });

  it("自分は外せない（抜けるを使う）。ほかのスペースの人やいない人は 404 で、何も変わらない", async () => {
    const a = await makeUser("Aoi");
    const other = await makeUser("Other");
    await makeSpace(a);
    const otherSpace = await makeSpace(other);
    const self = await a.call(`/space/members/${a.id}`, { method: "DELETE" });
    expect([self.status, await code(self)]).toEqual([409, "CANNOT_REMOVE_SELF"]);
    expect((await a.call(`/space/members/${other.id}`, { method: "DELETE" })).status).toBe(404);
    expect((await a.call(`/space/members/${crypto.randomUUID()}`, { method: "DELETE" })).status).toBe(404);
    expect(await memberCount(otherSpace.id)).toBe(1);
  });

  it("最後の1人は抜けられない。2人なら抜けられて、残った人のスペースはそのまま", async () => {
    const a = await makeUser("Aoi");
    const b = await makeUser("Haru");
    const space = await makeSpace(a);
    const alone = await a.call("/space/leave", { method: "POST" });
    expect([alone.status, await code(alone)]).toEqual([409, "LAST_MEMBER"]);

    await join(b, await makeInvite(a));
    expect((await a.call("/space/leave", { method: "POST" })).status).toBe(204);
    expect((await a.call("/space")).status).toBe(403);
    expect((await b.call("/space")).status).toBe(200);
    expect(await memberCount(space.id)).toBe(1);
    // 抜けた人は、また新しいスペースを作れる
    expect((await a.call("/space", { method: "POST", body: { name: "New" } })).status).toBe(201);
  });

  it("2人が同時に抜けようとしても、0人にはならない", async () => {
    const a = await makeUser("Aoi");
    const b = await makeUser("Haru");
    const space = await makeSpace(a);
    await join(b, await makeInvite(a));
    const results = await Promise.all([a.call("/space/leave", { method: "POST" }), b.call("/space/leave", { method: "POST" })]);
    expect(results.map((r) => r.status).sort()).toEqual([204, 409]);
    expect(await memberCount(space.id)).toBe(1);
  });
});
