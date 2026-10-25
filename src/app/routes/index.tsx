import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

// フェーズ6でホーム画面に置き換える
function Home() {
  return (
    <main className="app-shell">
      <h1 className="text-2xl font-semibold">COVOW</h1>
      <p className="text-body">Decide together. Spend better.</p>
    </main>
  );
}
