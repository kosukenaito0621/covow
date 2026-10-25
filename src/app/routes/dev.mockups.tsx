import { createFileRoute, notFound } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

// デザイン案の比較（開発環境だけ）。本番ビルドには含めない。
const Mockups = import.meta.env.DEV ? lazy(() => import("../dev/Mockups")) : null;

export const Route = createFileRoute("/dev/mockups")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  component: () =>
    Mockups ? (
      <Suspense fallback={null}>
        <Mockups />
      </Suspense>
    ) : null,
});
