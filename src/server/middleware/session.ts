import { createMiddleware } from "hono/factory";
import { getSessionCookie, setSessionCookie } from "../auth/cookies";
import { findSession } from "../auth/session";
import type { Context } from "hono";
import type { SessionUser } from "../auth/session";
import type { AppEnv } from "../types";

/** Cookie からログイン中の本人を探して c.var.user に入れる（いなければ null） */
export const session = () =>
  createMiddleware<AppEnv>(async (c, next) => {
    c.set("user", null);
    c.set("sessionId", null);
    const token = getSessionCookie(c);
    if (token) {
      const found = await findSession(c.var.db, token);
      if (found) {
        c.set("user", found.user);
        c.set("sessionId", found.sessionId);
        if (found.renewed) setSessionCookie(c, token);
      }
    }
    await next();
  });

/** ログインしていなければ 401 */
export const requireAuth = () =>
  createMiddleware<AppEnv>(async (c, next) => {
    if (!c.var.user) return c.json({ code: "UNAUTHENTICATED", message: "ログインしてください" }, 401);
    await next();
  });

/** requireAuth の後ろで本人を取り出す */
export function currentUser(c: Context<AppEnv>): SessionUser {
  const user = c.var.user;
  if (!user) throw new Error("requireAuth の後で使ってください");
  return user;
}
