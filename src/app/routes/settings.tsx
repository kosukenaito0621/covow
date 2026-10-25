import { createFileRoute } from "@tanstack/react-router";

// フェーズ5〜6で設定画面を実装する（いまはナビの遷移先として置いているだけ）
export const Route = createFileRoute("/settings")({
  component: () => <main className="app-shell" />,
});
