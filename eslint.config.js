import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "dev-dist", ".wrangler", ".private", ".claude", ".tanstack", "node_modules", "src/app/routeTree.gen.ts", "src/server/worker-configuration.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/app/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    languageOptions: { globals: globals.browser },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  {
    files: ["*.config.{ts,js}", "scripts/**/*.{js,mjs,ts}"],
    languageOptions: { globals: globals.node },
  },
  {
    // Playwright で実行し、一部はページ内（ブラウザ）で動くスクリプト
    files: ["scripts/measure-contrast.js"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    // ファイル全体が「page を受け取る関数式」なので、式だけの文を許可する
    rules: { "@typescript-eslint/no-unused-expressions": "off" },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // ログに金額やトークンを出さないため、console.log は使わない（error/warn だけ許可）
      "no-console": ["error", { allow: ["error", "warn"] }],
    },
  },
);
