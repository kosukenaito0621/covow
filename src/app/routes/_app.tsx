import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { meQuery } from "../api/me";
import { FloatingNav } from "../components/glass/FloatingNav";
import { PreferencesSync } from "../components/PreferencesSync";

/*
 * ログインが必要な画面のまとまり（ホーム・予定・分析・設定）。
 * ログインしていなければログイン画面へ送り、戻り先を ?next= で渡す。
 */
export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context, location }) => {
    const me = await context.queryClient.ensureQueryData(meQuery);
    if (!me) throw redirect({ to: "/login", search: { next: location.href } });
  },
  component: AppLayout,
});

function AppLayout() {
  const { data: me } = useQuery(meQuery);
  return (
    <>
      {me && <PreferencesSync me={me} />}
      <Outlet />
      <FloatingNav />
    </>
  );
}
