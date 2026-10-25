import { defineConfig } from "drizzle-kit";

// SQL の生成だけに使う。適用は wrangler d1 migrations apply で行う。
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/server/db/schema.ts",
  out: "./migrations",
});
