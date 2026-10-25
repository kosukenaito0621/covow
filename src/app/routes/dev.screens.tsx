import { createFileRoute, notFound } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

// 開発環境だけで表示する予定・分析・設定の画面の見本。本番ビルドでは import.meta.env.DEV が false になり、中身は含まれない。
const Screens = import.meta.env.DEV ? lazy(() => import("../dev/ScreenPreviews")) : null;

export const Route = createFileRoute("/dev/screens")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  component: () =>
    Screens ? (
      <Suspense fallback={null}>
        <Screens />
      </Suspense>
    ) : null,
});
