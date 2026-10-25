import { env, exports } from "cloudflare:workers";
import { createSession } from "../../src/server/auth/session";
import { createDb } from "../../src/server/db/client";
import { users } from "../../src/server/db/schema";

export const ORIGIN = "http://localhost:5173";

/** テスト用のユーザーとログインの Cookie を作る（Google ログインは通さない） */
export async function makeUser(name: string, locale: "en" | "ja" | "mix" = "en") {
  const db = createDb(env.DB);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.insert(users).values({
    id,
    googleSub: `sub-${id}`,
    email: `${name.toLowerCase()}-${id.slice(0, 6)}@example.com`,
    displayName: name,
    locale,
    createdAt: now,
    updatedAt: now,
  });
  const token = await createSession(db, id);
  const cookie = `__Host-covow_session=${token}`;
  /** この人として API を呼ぶ（変更系には自分のサイトの Origin を付ける） */
  const call = (path: string, init: { method?: string; body?: unknown; origin?: string } = {}) =>
    exports.default.fetch(`${ORIGIN}/api${path}`, {
      method: init.method ?? "GET",
      headers: {
        Cookie: cookie,
        ...(init.method && init.method !== "GET" ? { Origin: init.origin ?? ORIGIN } : {}),
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  return { id, name, cookie, call };
}

export type TestUser = Awaited<ReturnType<typeof makeUser>>;

/** スペースを作って、作った人を返す */
export async function makeSpace(owner: TestUser, name = "Home") {
  const res = await owner.call("/space", { method: "POST", body: { name } });
  if (res.status !== 201) throw new Error(`space create failed: ${res.status}`);
  return (await res.json<{ space: { id: string; name: string } }>()).space;
}

/** 招待リンクを発行し、URL の最後の部分（トークン）を返す */
export async function makeInvite(member: TestUser) {
  const res = await member.call("/space/invite", { method: "POST" });
  if (res.status !== 201) throw new Error(`invite failed: ${res.status}`);
  const { url } = await res.json<{ url: string }>();
  return url.split("/invite/")[1]!;
}

export async function join(user: TestUser, token: string) {
  return user.call(`/invites/${token}/accept`, { method: "POST" });
}
