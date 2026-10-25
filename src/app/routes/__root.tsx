import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { AuroraBackdrop } from "../components/backdrop/AuroraBackdrop";

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: () => (
    <main className="app-shell">
      <p className="text-body">Not found / ページが見つかりませんでした</p>
    </main>
  ),
});

function RootLayout() {
  return (
    <>
      {/* どの画面でも、背景にテーマのオーロラとシルエットを置く */}
      <AuroraBackdrop />
      <Outlet />
    </>
  );
}
