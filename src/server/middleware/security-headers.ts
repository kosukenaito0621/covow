import { createMiddleware } from "hono/factory";

/**
 * API 応答のセキュリティヘッダー。
 * 静的アセット（画面）のヘッダーは public/_headers で付ける。
 */
export const securityHeaders = () =>
  createMiddleware(async (c, next) => {
    await next();
    const h = c.res.headers;
    h.set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
    h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    h.set("X-Content-Type-Options", "nosniff");
    h.set("Referrer-Policy", "strict-origin-when-cross-origin");
    h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
    h.set("Cache-Control", "no-store");
  });
