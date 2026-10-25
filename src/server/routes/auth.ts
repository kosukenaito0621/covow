import { eq } from "drizzle-orm";
import { Hono } from "hono";
import * as oauth from "oauth4webapi";
import { isLocale } from "../../shared/i18n";
import { LIMITS } from "../../shared/schemas";
import { isThemeId } from "../../shared/theme";
import { clearOAuthCookie, clearSessionCookie, readOAuthCookie, setOAuthCookie, setSessionCookie } from "../auth/cookies";
import { buildAuthorizationUrl, callbackUrl, exchangeCallback, GoogleLoginError, type GoogleProfile } from "../auth/google";
import { createSession, deleteSession } from "../auth/session";
import type { Db } from "../db/client";
import { users } from "../db/schema";
import { requireAuth } from "../middleware/session";
import type { AppEnv } from "../types";

/** ログイン後の戻り先。自分のサイトの中のパスだけ受け付ける（//evil.example などの外部は "/" にする） */
export function safeNext(raw: string | undefined): string {
  if (!raw || raw.length > 200) return "/";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  if (/[\s\\]/.test(raw)) return "/";
  return raw;
}

/** Google の情報からユーザーを作る／更新する。表示名は本人が変えたものを残すので、作るときだけ入れる */
async function upsertUser(db: Db, p: GoogleProfile, prefs: { locale: string | null; theme: string | null }) {
  const now = new Date().toISOString();
  const existing = await db.select().from(users).where(eq(users.googleSub, p.sub)).get();
  if (existing) {
    await db.update(users).set({ email: p.email, avatarUrl: p.picture, updatedAt: now }).where(eq(users.id, existing.id));
    return existing.id;
  }
  const id = crypto.randomUUID();
  const fallback = p.email.split("@")[0] ?? "";
  const displayName = Array.from((p.name ?? fallback).trim() || fallback)
    .slice(0, LIMITS.displayName)
    .join("");
  await db.insert(users).values({
    id,
    googleSub: p.sub,
    email: p.email,
    displayName,
    avatarUrl: p.picture,
    locale: isLocale(prefs.locale) ? prefs.locale : "en",
    theme: isThemeId(prefs.theme) ? prefs.theme : "aurora",
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export const authRoutes = new Hono<AppEnv>()
  // Google のログイン画面へ。?next=戻り先 ?lang= ?theme= はログイン前の画面の設定（はじめての人のアカウントに入れる）
  .get("/google", async (c) => {
    const state = oauth.generateRandomState();
    const verifier = oauth.generateRandomCodeVerifier();
    const nonce = oauth.generateRandomNonce();
    setOAuthCookie(c, {
      state,
      verifier,
      nonce,
      next: safeNext(c.req.query("next")),
      locale: c.req.query("lang") ?? null,
      theme: c.req.query("theme") ?? null,
    });
    const url = await buildAuthorizationUrl({
      clientId: c.env.GOOGLE_CLIENT_ID,
      redirectUri: callbackUrl(c.env.APP_ORIGIN),
      state,
      verifier,
      nonce,
    });
    return c.redirect(url.toString(), 302);
  })

  // Google から戻ってくる場所
  .get("/google/callback", async (c) => {
    const saved = readOAuthCookie(c);
    clearOAuthCookie(c);
    const toLogin = (error: string) => c.redirect(`${c.env.APP_ORIGIN}/login?error=${error}`, 302);
    // 10分を過ぎた・別のブラウザで開いた、など
    if (!saved) return toLogin("expired");
    let profile: GoogleProfile;
    try {
      profile = await exchangeCallback({
        currentUrl: new URL(c.req.url),
        clientId: c.env.GOOGLE_CLIENT_ID,
        clientSecret: c.env.GOOGLE_CLIENT_SECRET,
        redirectUri: callbackUrl(c.env.APP_ORIGIN),
        expected: saved,
      });
    } catch (e) {
      // 理由の種類だけを記録する（トークンやメールアドレスは残さない）
      console.warn("google_login_failed", e instanceof GoogleLoginError ? e.reason : "unknown");
      return toLogin(e instanceof GoogleLoginError ? e.reason : "failed");
    }
    // 体験版を使っていた人がログインしたら、体験版のログインのしるしは消す（データは定期処理で消える）
    if (c.var.user?.isGuest && c.var.sessionId) await deleteSession(c.var.db, c.var.sessionId);
    const userId = await upsertUser(c.var.db, profile, saved);
    const token = await createSession(c.var.db, userId);
    setSessionCookie(c, token);
    return c.redirect(`${c.env.APP_ORIGIN}${saved.next}`, 302);
  })

  .post("/logout", requireAuth(), async (c) => {
    const sessionId = c.var.sessionId;
    if (sessionId) await deleteSession(c.var.db, sessionId);
    clearSessionCookie(c);
    return c.body(null, 204);
  });
