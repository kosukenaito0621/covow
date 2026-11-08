import { Hono } from "hono";
import { z } from "zod";
import { parseBody } from "../http";
import { countExchange, exchangeLinkCode, linkMembers, listChanges, snapshot, spaceForKey } from "../repo/sync-links";
import type { AppEnv } from "../types";

/*
 * COWEL の読み取りの窓口（COWEL の docs/superpowers/plans/2026-11-04-covow-sync.md の Task 4）。
 * exchange だけは COWEL のサーバーから Origin なしで呼ばれる（番号そのものが本人の確認）。ほかは鍵（Authorization: Bearer）で、
 * そのスペースの記録帳と支出を読むだけ。データを変える操作はない。
 */
const MAX_PAGE = 500;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const bearer = (header: string | undefined) => (header?.startsWith("Bearer ") ? header.slice(7).trim() : "");

const withKey = new Hono<AppEnv>()
  .use("*", async (c, next) => {
    const spaceId = await spaceForKey(c.var.db, bearer(c.req.header("Authorization")));
    if (!spaceId) return c.json({ code: "KEY_REJECTED", message: "KEY_REJECTED" }, 401);
    c.set("spaceId", spaceId);
    await next();
  })
  .get("/expense-changes", async (c) => {
    const q = z.object({ after: z.coerce.number().int().min(0), limit: z.coerce.number().int().min(1).max(MAX_PAGE).default(MAX_PAGE) }).safeParse(c.req.query());
    if (!q.success) return c.json({ code: "VALIDATION", message: "VALIDATION" }, 422);
    return c.json(await listChanges(c.var.db, c.var.spaceId!, q.data.after, q.data.limit));
  })
  .get("/expenses-snapshot", async (c) => {
    const from = isoDate.safeParse(c.req.query("from"));
    if (!from.success) return c.json({ code: "VALIDATION", message: "VALIDATION" }, 422);
    return c.json(await snapshot(c.var.db, c.var.spaceId!, from.data));
  })
  .get("/members", async (c) => c.json({ members: await linkMembers(c.var.db, c.var.spaceId!) }));

export const syncRoutes = new Hono<AppEnv>()
  .post("/link/exchange", async (c) => {
    if (!(await countExchange(c.var.db, c.req.header("CF-Connecting-IP") ?? "local"))) return c.json({ code: "TOO_MANY_TRIES", message: "TOO_MANY_TRIES" }, 429);
    const parsed = await parseBody(c, z.object({ code: z.string().regex(/^\d{8}$/) }));
    if (!parsed.ok) return c.json({ code: "CODE_INVALID", message: "CODE_INVALID" }, 400);
    const link = await exchangeLinkCode(c.var.db, parsed.data.code);
    if (!link) return c.json({ code: "CODE_INVALID", message: "CODE_INVALID" }, 400);
    return c.json(link);
  })
  .route("/", withKey);
