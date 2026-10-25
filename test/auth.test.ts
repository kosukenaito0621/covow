import { env, exports } from "cloudflare:workers";
import { afterEach, describe, expect, it } from "vitest";
import { safeNext } from "../src/server/routes/auth";
import { sha256Hex } from "../src/server/auth/tokens";
import { mockGoogleToken } from "./helpers/google";

const ORIGIN = "http://localhost:5173";
const call = (path: string, init?: RequestInit) => exports.default.fetch(`${ORIGIN}${path}`, { redirect: "manual", ...init });

/** Set-Cookie から「名前=値」を取り出す（値が空＝削除） */
function cookies(res: Response): Record<string, { value: string; raw: string }> {
  const out: Record<string, { value: string; raw: string }> = {};
  for (const raw of res.headers.getSetCookie()) {
    const [pair] = raw.split(";");
    const i = pair!.indexOf("=");
    out[pair!.slice(0, i)] = { value: decodeURIComponent(pair!.slice(i + 1)), raw };
  }
  return out;
}

/** ログイン開始から Google の画面へ移るところまで。Google に渡した値と、ブラウザに残る Cookie を返す */
async function start(query = "") {
  const res = await call(`/api/auth/google${query}`);
  const google = new URL(res.headers.get("Location")!);
  const oauthCookie = cookies(res)["__Host-covow_oauth"]!;
  return { res, google, cookie: `__Host-covow_oauth=${encodeURIComponent(oauthCookie.value)}`, oauthCookie };
}

/** Google から戻ってきたことにする */
async function callback(cookie: string | null, params: Record<string, string>) {
  return call(`/api/auth/google/callback?${new URLSearchParams(params)}`, cookie ? { headers: { Cookie: cookie } } : undefined);
}

let restore: (() => void) | null = null;
afterEach(() => {
  restore?.();
  restore = null;
});

async function login(claims: Record<string, unknown> = {}, query = "?next=/plans&lang=ja&theme=frost") {
  const s = await start(query);
  const nonce = s.google.searchParams.get("nonce")!;
  const mock = mockGoogleToken({ nonce, ...claims });
  restore = mock.restore;
  const res = await callback(s.cookie, { code: "auth-code", state: s.google.searchParams.get("state")! });
  const session = cookies(res)["__Host-covow_session"];
  return { res, session, mock, start: s };
}

describe("Google ログインの開始", () => {
  it("state・PKCE（S256）・nonce を付けて Google へ移り、その値を短命の Cookie に入れる", async () => {
    const { res, google, oauthCookie } = await start("?next=/plans");
    expect(res.status).toBe(302);
    expect(google.origin + google.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(google.searchParams.get("client_id")).toBe("test-client-id");
    expect(google.searchParams.get("redirect_uri")).toBe(`${ORIGIN}/api/auth/google/callback`);
    expect(google.searchParams.get("code_challenge_method")).toBe("S256");
    expect(google.searchParams.get("scope")).toBe("openid email profile");
    for (const k of ["state", "nonce", "code_challenge"]) expect(google.searchParams.get(k)?.length).toBeGreaterThan(20);
    expect(oauthCookie.raw).toMatch(/HttpOnly/i);
    expect(oauthCookie.raw).toMatch(/Secure/i);
    expect(oauthCookie.raw).toMatch(/Max-Age=600/);
    const saved = JSON.parse(oauthCookie.value);
    expect(saved.state).toBe(google.searchParams.get("state"));
    expect(saved.next).toBe("/plans");
  });

  it("戻り先は自分のサイトの中だけ", () => {
    expect(safeNext("/plans?x=1")).toBe("/plans?x=1");
    for (const bad of [undefined, "", "https://evil.example", "//evil.example", "/\\evil.example", "plans", "/a b"]) {
      expect(safeNext(bad), String(bad)).toBe("/");
    }
  });
});

describe("Google から戻ってきたとき", () => {
  it("成功：ユーザーを作り、ログインの Cookie を付けて戻り先へ。言語とテーマはログイン前の設定を引き継ぐ", async () => {
    const { res, session, mock } = await login();
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(`${ORIGIN}/plans`);
    expect(session?.raw).toMatch(/HttpOnly/i);
    expect(session?.raw).toMatch(/SameSite=Lax/i);
    // PKCE の verifier を Google に送っている
    expect(mock.requests[0]?.get("code_verifier")?.length).toBeGreaterThan(40);
    expect(mock.requests[0]?.get("redirect_uri")).toBe(`${ORIGIN}/api/auth/google/callback`);

    const me = await call("/api/me", { headers: { Cookie: `__Host-covow_session=${session!.value}` } });
    expect(me.status).toBe(200);
    const body = await me.json<{ user: Record<string, unknown>; space: unknown }>();
    expect(body.user).toMatchObject({ email: "aoi@example.com", displayName: "Aoi", locale: "ja", theme: "frost" });
    expect(body.user).not.toHaveProperty("googleSub");
    expect(body.space).toBeNull();

    // DB にはトークンそのものではなくハッシュが入る
    const row = await env.DB.prepare("SELECT id FROM sessions WHERE id = ?").bind(await sha256Hex(session!.value)).first();
    expect(row).not.toBeNull();
    const plain = await env.DB.prepare("SELECT id FROM sessions WHERE id = ?").bind(session!.value).first();
    expect(plain).toBeNull();
  });

  it("2回目のログイン：同じユーザーのまま。メールアドレスは更新し、表示名と設定は変えない", async () => {
    const first = await login({ sub: "sub-repeat", email: "old@example.com", name: "First" });
    const cookie = `__Host-covow_session=${first.session!.value}`;
    await call("/api/me", { method: "PATCH", headers: { Cookie: cookie, Origin: ORIGIN }, body: JSON.stringify({ displayName: "あおい" }) });
    restore?.();
    const second = await login({ sub: "sub-repeat", email: "new@example.com", name: "Second" }, "?lang=en&theme=dusk");
    const me = await call("/api/me", { headers: { Cookie: `__Host-covow_session=${second.session!.value}` } });
    const body = await me.json<{ user: Record<string, unknown> }>();
    expect(body.user).toMatchObject({ email: "new@example.com", displayName: "あおい", locale: "ja", theme: "frost" });
    const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM users WHERE google_sub = 'sub-repeat'").first<{ n: number }>();
    expect(count?.n).toBe(1);
  });

  it("state が違えばログインさせない", async () => {
    const s = await start();
    const mock = mockGoogleToken({ nonce: s.google.searchParams.get("nonce") });
    restore = mock.restore;
    const res = await callback(s.cookie, { code: "auth-code", state: "attacker-state" });
    expect(res.headers.get("Location")).toBe(`${ORIGIN}/login?error=failed`);
    expect(cookies(res)["__Host-covow_session"]).toBeUndefined();
    expect(mock.requests).toHaveLength(0);
  });

  it("ID トークンの nonce が違えばログインさせない", async () => {
    const { res, session } = await login({ nonce: "other-nonce" });
    expect(res.headers.get("Location")).toBe(`${ORIGIN}/login?error=failed`);
    expect(session).toBeUndefined();
  });

  it("別のアプリ向けの ID トークン（aud が違う）や、メールアドレスが未確認の人はログインさせない", async () => {
    for (const claims of [{ aud: "someone-else" }, { email_verified: false }]) {
      const { res, session } = await login(claims);
      expect(res.headers.get("Location"), JSON.stringify(claims)).toBe(`${ORIGIN}/login?error=failed`);
      expect(session).toBeUndefined();
      restore?.();
      restore = null;
    }
  });

  it("Google の画面でキャンセルした・Cookie がない（時間切れ）ときは、理由つきでログイン画面へ", async () => {
    const s = await start();
    const cancelled = await callback(s.cookie, { error: "access_denied", state: s.google.searchParams.get("state")! });
    expect(cancelled.headers.get("Location")).toBe(`${ORIGIN}/login?error=cancelled`);
    const expired = await callback(null, { code: "x", state: "y" });
    expect(expired.headers.get("Location")).toBe(`${ORIGIN}/login?error=expired`);
  });
});

describe("ログイン中の本人", () => {
  it("ログインしていなければ 401", async () => {
    expect((await call("/api/me")).status).toBe(401);
    expect((await call("/api/me", { headers: { Cookie: "__Host-covow_session=not-a-real-token" } })).status).toBe(401);
  });

  it("言語・テーマ・表示名を変えられる。決まった値以外は 422、別サイトからは 403", async () => {
    const { session } = await login({ sub: "sub-prefs" });
    const headers = { Cookie: `__Host-covow_session=${session!.value}`, Origin: ORIGIN };
    const ok = await call("/api/me", { method: "PATCH", headers, body: JSON.stringify({ locale: "en", theme: "sakura" }) });
    expect(ok.status).toBe(200);
    expect((await ok.json<{ user: Record<string, unknown> }>()).user).toMatchObject({ locale: "en", theme: "sakura" });

    for (const body of [{ theme: "neon" }, { locale: "fr" }, { displayName: "   " }, {}, { email: "x@example.com" }]) {
      const res = await call("/api/me", { method: "PATCH", headers, body: JSON.stringify(body) });
      expect(res.status, JSON.stringify(body)).toBe(422);
    }
    const cross = await call("/api/me", {
      method: "PATCH",
      headers: { ...headers, Origin: "https://evil.example" },
      body: JSON.stringify({ theme: "dusk" }),
    });
    expect(cross.status).toBe(403);
  });

  it("ログアウトすると DB のセッションが消え、同じ Cookie では入れない", async () => {
    const { session } = await login({ sub: "sub-logout" });
    const cookie = `__Host-covow_session=${session!.value}`;
    const res = await call("/api/auth/logout", { method: "POST", headers: { Cookie: cookie, Origin: ORIGIN } });
    expect(res.status).toBe(204);
    expect(cookies(res)["__Host-covow_session"]?.value).toBe("");
    expect((await call("/api/me", { headers: { Cookie: cookie } })).status).toBe(401);
  });

  it("期限切れのセッションは使えず、DB からも消える。残りが15日を切ったら30日後まで延ばす", async () => {
    const { session } = await login({ sub: "sub-expiry" });
    const cookie = `__Host-covow_session=${session!.value}`;
    const id = await sha256Hex(session!.value);
    const day = 24 * 60 * 60 * 1000;

    await env.DB.prepare("UPDATE sessions SET expires_at = ? WHERE id = ?").bind(new Date(Date.now() + 5 * day).toISOString(), id).run();
    const renewed = await call("/api/me", { headers: { Cookie: cookie } });
    expect(renewed.status).toBe(200);
    expect(cookies(renewed)["__Host-covow_session"]?.value).toBe(session!.value);
    const row = await env.DB.prepare("SELECT expires_at FROM sessions WHERE id = ?").bind(id).first<{ expires_at: string }>();
    expect(new Date(row!.expires_at).getTime()).toBeGreaterThan(Date.now() + 29 * day);

    // 期限に余裕があるときは書き込まない
    const quiet = await call("/api/me", { headers: { Cookie: cookie } });
    expect(cookies(quiet)["__Host-covow_session"]).toBeUndefined();

    await env.DB.prepare("UPDATE sessions SET expires_at = ? WHERE id = ?").bind(new Date(Date.now() - 1000).toISOString(), id).run();
    expect((await call("/api/me", { headers: { Cookie: cookie } })).status).toBe(401);
    expect(await env.DB.prepare("SELECT id FROM sessions WHERE id = ?").bind(id).first()).toBeNull();
  });
});
