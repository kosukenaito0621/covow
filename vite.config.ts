import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      routesDirectory: "./src/app/routes",
      generatedRouteTree: "./src/app/routeTree.gen.ts",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
    cloudflare(),
    // ホーム画面に置けるアプリ（PWA）。オフラインでも画面の枠は開けるが、お金のデータ（/api）は一切ためない
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "script-defer",
      includeAssets: ["favicon.svg", "icons/apple-touch-icon-180.png"],
      manifest: {
        name: "COVOW",
        short_name: "COVOW",
        description: "Decide together. Spend better.",
        lang: "en",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#060A18",
        theme_color: "#060A18",
        // ロゴが決まるまでの仮のアイコン（public/icons）
        icons: [
          { src: "/icons/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html",
        // API とログインの行き来は、必ずサーバーに問い合わせる（ためない・代わりに画面を返さない）
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
      },
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
});
