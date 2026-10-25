import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { SESSION_TTL_DAYS } from "../../shared/constants";

/*
 * Cookie はすべて __Host- 付き（Secure・Path=/・Domain なし）。ほかのサブドメインから上書きされない。
 * http://localhost はブラウザが安全な場所として扱うので、開発中も Secure の Cookie が使える。
 */

const SESSION = "covow_session";
const OAUTH = "covow_oauth";

/** ログイン中であることを示す Cookie（中身はランダムなトークン。DB にはそのハッシュだけを入れる） */
export const getSessionCookie = (c: Context) => getCookie(c, SESSION, "host");

export const setSessionCookie = (c: Context, token: string) =>
  setCookie(c, SESSION, token, {
    prefix: "host",
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "Lax",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });

export const clearSessionCookie = (c: Context) => deleteCookie(c, SESSION, { prefix: "host", path: "/", secure: true });

/** Google から戻ってくるまでの10分だけ使う値（state・PKCE・nonce・戻り先） */
export interface OAuthState {
  state: string;
  verifier: string;
  nonce: string;
  next: string;
  /** はじめてログインした人のアカウントに入れる、ログイン前の言語とテーマ */
  locale: string | null;
  theme: string | null;
}

export const OAUTH_TTL_SECONDS = 10 * 60;

export const setOAuthCookie = (c: Context, value: OAuthState) =>
  setCookie(c, OAUTH, JSON.stringify(value), {
    prefix: "host",
    path: "/",
    secure: true,
    httpOnly: true,
    // Google から戻るときの画面遷移（トップレベルの GET）で送られるよう Lax にする
    sameSite: "Lax",
    maxAge: OAUTH_TTL_SECONDS,
  });

export function readOAuthCookie(c: Context): OAuthState | null {
  const raw = getCookie(c, OAUTH, "host");
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<OAuthState>;
    if (typeof v.state !== "string" || typeof v.verifier !== "string" || typeof v.nonce !== "string" || typeof v.next !== "string")
      return null;
    return {
      state: v.state,
      verifier: v.verifier,
      nonce: v.nonce,
      next: v.next,
      locale: typeof v.locale === "string" ? v.locale : null,
      theme: typeof v.theme === "string" ? v.theme : null,
    };
  } catch {
    return null;
  }
}

export const clearOAuthCookie = (c: Context) => deleteCookie(c, OAUTH, { prefix: "host", path: "/", secure: true });
