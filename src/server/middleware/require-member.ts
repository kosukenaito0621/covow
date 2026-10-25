import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { findMembership } from "../repo/space";
import type { AppEnv } from "../types";

/**
 * スペースのメンバーだけを通す（ログインしていなければ 401、どこにも入っていなければ 403 NO_SPACE）。
 * 毎回 DB で確かめるので、外されたメンバーはセッションが残っていても、すぐにスペースのデータを見られなくなる。
 * 権限の確認はここと repo/ の2か所だけで行う。
 */
export const requireMember = () =>
  createMiddleware<AppEnv>(async (c, next) => {
    const user = c.var.user;
    if (!user) return c.json({ code: "UNAUTHENTICATED", message: "ログインしてください" }, 401);
    const membership = await findMembership(c.var.db, user.id);
    if (!membership) return c.json({ code: "NO_SPACE", message: "スペースに参加していません" }, 403);
    c.set("spaceId", membership.spaceId);
    await next();
  });

/** requireMember の後ろで、本人のスペースの ID を取り出す */
export function currentSpaceId(c: Context<AppEnv>): string {
  const id = c.var.spaceId;
  if (!id) throw new Error("requireMember の後で使ってください");
  return id;
}
