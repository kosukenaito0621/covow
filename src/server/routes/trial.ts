import { Hono } from "hono";
import { isLocale } from "../../shared/i18n";
import { isThemeId } from "../../shared/theme";
import { setSessionCookie } from "../auth/cookies";
import { currentSpaceId, requireMember } from "../middleware/require-member";
import { currentUser } from "../middleware/session";
import { createTrial, partnerVisit, TrialLimitError } from "../trial/trial";
import type { AppEnv } from "../types";

export const trialRoutes = new Hono<AppEnv>()
  // 体験版を始める。すでに本物のアカウントでログインしている人は使わない（409）
  .post("/", async (c) => {
    if (c.var.user && !c.var.user.isGuest) return c.json({ code: "ALREADY_SIGNED_IN", message: "ログイン中です" }, 409);
    const body = (await c.req.json().catch(() => ({}))) as { lang?: unknown; theme?: unknown };
    // IP は回数の上限にだけ使い、保存しない（日付つきのハッシュにする）
    const ip = c.req.header("CF-Connecting-IP") ?? "local";
    try {
      const { token, expiresAt } = await createTrial(c.var.db, {
        ip,
        locale: isLocale(body.lang) ? body.lang : "en",
        theme: isThemeId(body.theme) ? body.theme : "aurora",
      });
      setSessionCookie(c, token);
      return c.json({ expiresAt }, 201);
    } catch (e) {
      if (e instanceof TrialLimitError) return c.json({ code: "TRIAL_LIMIT", message: "今日はこれ以上作れません" }, 429);
      throw e;
    }
  })
  // メンバー役（はるさん）が予定を1つ追加しに来る。体験版だけ
  .post("/partner-visit", requireMember(), async (c) => {
    const user = currentUser(c);
    if (!user.isGuest) return c.json({ code: "NOT_FOUND", message: "NOT_FOUND" }, 404);
    const plan = await partnerVisit(c.var.db, { spaceId: currentSpaceId(c), youId: user.id, locale: user.locale });
    if (!plan) return c.json({ code: "NOT_FOUND", message: "NOT_FOUND" }, 404);
    return c.json({ plan }, 201);
  });
