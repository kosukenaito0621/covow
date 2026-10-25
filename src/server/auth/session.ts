import { eq } from "drizzle-orm";
import { SESSION_RENEW_THRESHOLD_DAYS, SESSION_TTL_DAYS } from "../../shared/constants";
import type { Db } from "../db/client";
import { sessions, users } from "../db/schema";
import { randomToken, sha256Hex } from "./tokens";

const DAY_MS = 24 * 60 * 60 * 1000;

export type SessionUser = typeof users.$inferSelect;

/** ログインのしるしを作る。Cookie に入れるトークンを返し、DB にはそのハッシュだけを入れる */
export async function createSession(db: Db, userId: string, now = new Date()): Promise<string> {
  const token = randomToken();
  await db.insert(sessions).values({
    id: await sha256Hex(token),
    userId,
    expiresAt: new Date(now.getTime() + SESSION_TTL_DAYS * DAY_MS).toISOString(),
    createdAt: now.toISOString(),
  });
  return token;
}

/**
 * Cookie のトークンからユーザーを探す。期限切れなら消して null。
 * 使われたときに期限を30日後へ延ばす（残りが15日を切ったときだけ書き込む）。renewed が true なら Cookie も付け直す。
 */
export async function findSession(
  db: Db,
  token: string,
  now = new Date(),
): Promise<{ user: SessionUser; sessionId: string; renewed: boolean } | null> {
  const id = await sha256Hex(token);
  const row = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id))
    .get();
  if (!row) return null;
  const expires = new Date(row.session.expiresAt).getTime();
  if (expires <= now.getTime()) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  let renewed = false;
  if (expires - now.getTime() < SESSION_RENEW_THRESHOLD_DAYS * DAY_MS) {
    await db
      .update(sessions)
      .set({ expiresAt: new Date(now.getTime() + SESSION_TTL_DAYS * DAY_MS).toISOString() })
      .where(eq(sessions.id, id));
    renewed = true;
  }
  return { user: row.user, sessionId: id, renewed };
}

export async function deleteSession(db: Db, sessionId: string) {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}
