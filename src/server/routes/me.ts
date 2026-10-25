import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { LOCALES } from "../../shared/i18n";
import { profileInputSchema } from "../../shared/schemas";
import { THEME_IDS } from "../../shared/theme";
import type { SessionUser } from "../auth/session";
import { spaceMembers, spaces, users } from "../db/schema";
import { currentUser, requireAuth } from "../middleware/session";
import type { AppEnv } from "../types";

/** 画面に返す本人の情報（Google の sub などの内部の値は返さない） */
const publicUser = (u: SessionUser) => ({
  id: u.id,
  email: u.email,
  displayName: u.displayName,
  avatarUrl: u.avatarUrl,
  locale: u.locale,
  theme: u.theme,
});

/** 表示名・言語・テーマのうち、送られてきたものだけを変える */
export const mePatchSchema = z
  .object({
    displayName: profileInputSchema.shape.displayName.optional(),
    locale: z.enum(LOCALES).optional(),
    theme: z.enum(THEME_IDS).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, { message: "変更する項目がありません" });

export const meRoutes = new Hono<AppEnv>()
  .use("*", requireAuth())
  .get("/", async (c) => {
    const user = currentUser(c);
    const space = await c.var.db
      .select({ id: spaces.id, name: spaces.name })
      .from(spaceMembers)
      .innerJoin(spaces, eq(spaces.id, spaceMembers.spaceId))
      .where(eq(spaceMembers.userId, user.id))
      .get();
    return c.json({ user: publicUser(user), space: space ?? null });
  })
  .patch("/", async (c) => {
    const user = currentUser(c);
    const body: unknown = await c.req.json().catch(() => null);
    const parsed = mePatchSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ code: "VALIDATION", message: parsed.error.issues[0]?.message ?? "入力を確認してください" }, 400);
    }
    const updated = await c.var.db
      .update(users)
      .set({ ...parsed.data, updatedAt: new Date().toISOString() })
      .where(eq(users.id, user.id))
      .returning()
      .get();
    return c.json({ user: publicUser(updated) });
  });
