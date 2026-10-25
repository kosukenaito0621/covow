import { createFileRoute } from "@tanstack/react-router";

// フェーズ7で分析画面を実装する（いまはナビの遷移先として置いているだけ）
export const Route = createFileRoute("/analytics")({
  component: () => <main className="app-shell" />,
});
