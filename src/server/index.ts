import { Hono } from "hono";
import { createDb } from "./db/client";
import { originCheck } from "./middleware/origin-check";
import { securityHeaders } from "./middleware/security-headers";
import { session } from "./middleware/session";
import { authRoutes } from "./routes/auth";
import { meRoutes } from "./routes/me";
import type { AppEnv } from "./types";

export type { AppEnv } from "./types";

const app = new Hono<AppEnv>()
  .basePath("/api")
  .use("*", securityHeaders())
  .use("*", originCheck())
  .use("*", async (c, next) => {
    c.set("db", createDb(c.env.DB));
    await next();
  })
  .use("*", session())
  .get("/health", (c) => c.json({ ok: true }))
  .route("/auth", authRoutes)
  .route("/me", meRoutes);

app.notFound((c) => c.json({ code: "NOT_FOUND", message: "見つかりませんでした" }, 404));

app.onError((err, c) => {
  // 金額・商品名・トークンなどを含めないよう、エラーの種類だけを記録する
  console.error("unhandled_error", err instanceof Error ? err.name : "unknown");
  return c.json({ code: "INTERNAL", message: "問題が発生しました。時間をおいてもう一度お試しください" }, 500);
});

export type AppType = typeof app;

export default app;
