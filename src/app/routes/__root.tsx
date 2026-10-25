import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
  notFoundComponent: () => (
    <main className="app-shell">
      <p className="text-body">ページが見つかりませんでした</p>
    </main>
  ),
});

function RootLayout() {
  return <Outlet />;
}
