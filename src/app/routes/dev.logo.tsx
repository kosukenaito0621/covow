import { createFileRoute, notFound } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

// ロゴの候補（開発環境だけ）。本番ビルドには含めない。
const LogoConcepts = import.meta.env.DEV ? lazy(() => import("../dev/LogoConcepts")) : null;

export const Route = createFileRoute("/dev/logo")({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  component: () =>
    LogoConcepts ? (
      <Suspense fallback={null}>
        <LogoConcepts />
      </Suspense>
    ) : null,
});
