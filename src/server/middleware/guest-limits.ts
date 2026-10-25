import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../types";

/**
 * 体験版でお休みにする操作（外に影響するもの・データを離れるもの）。
 * 招待リンクの発行、ほかのスペースへの参加、メンバーを外す、スペースから抜ける。
 */
const LOCKED: { method: string; path: RegExp }[] = [
  { method: "POST", path: /^\/api\/space\/invite$/ },
  { method: "POST", path: /^\/api\/invites\/[^/]+\/accept$/ },
  { method: "DELETE", path: /^\/api\/space\/members\/[^/]+$/ },
  { method: "POST", path: /^\/api\/space\/leave$/ },
  { method: "POST", path: /^\/api\/space$/ },
];

export const guestLimits = () =>
  createMiddleware<AppEnv>(async (c, next) => {
    if (c.var.user?.isGuest && LOCKED.some((l) => l.method === c.req.method && l.path.test(c.req.path))) {
      return c.json({ code: "TRIAL_LOCKED", message: "体験版ではお休みしています" }, 403);
    }
    await next();
  });
