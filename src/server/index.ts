import { Hono } from "hono";
import { securityHeaders } from "./middleware/security-headers";

export type AppEnv = { Bindings: Env };

const app = new Hono<AppEnv>()
  .basePath("/api")
  .use("*", securityHeaders())
  .get("/health", (c) => c.json({ ok: true }));

app.notFound((c) => c.json({ code: "NOT_FOUND", message: "見つかりませんでした" }, 404));

app.onError((err, c) => {
  // 金額・商品名・トークンなどを含めないよう、エラーの種類だけを記録する
  console.error("unhandled_error", err instanceof Error ? err.name : "unknown");
  return c.json({ code: "INTERNAL", message: "問題が発生しました。時間をおいてもう一度お試しください" }, 500);
});

export type AppType = typeof app;

export default app;
