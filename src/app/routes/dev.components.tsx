import { createFileRoute, notFound } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

// 開発環境だけで表示する部品の一覧。本番ビルドでは import.meta.env.DEV が false になり、中身は含まれない。
const Gallery = import.meta.env.DEV ? lazy(() => import("../dev/ComponentGallery")) : null;

export const Route = createFileRoute("/dev/components")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  component: () =>
    Gallery ? (
      <Suspense fallback={null}>
        <Gallery />
      </Suspense>
    ) : null,
});
