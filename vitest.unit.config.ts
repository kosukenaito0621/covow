import { defineProject } from "vitest/config";

// 純粋関数（金額計算・日付・入力検証）の単体テスト。Node で実行する。
export default defineProject({
  resolve: { tsconfigPaths: true },
  test: {
    name: "unit",
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
