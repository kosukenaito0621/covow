import { createFileRoute } from "@tanstack/react-router";

// フェーズ6で購入予定一覧を実装する（いまはナビの遷移先として置いているだけ）
export const Route = createFileRoute("/plans")({
  component: () => <main className="app-shell" />,
});
