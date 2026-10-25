import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { meQuery } from "../api/me";
import { FloatingNav } from "../components/glass/FloatingNav";
import { PreferencesSync } from "../components/PreferencesSync";
import { TrialBanner } from "../components/TrialBanner";
import { Coach } from "../tour/Coach";
import { TourProvider } from "../tour/TourProvider";

/*
 * ログインが必要な画面のまとまり（ホーム・予定・分析・設定）。
 * ログインしていなければログイン画面へ送り、戻り先を ?next= で渡す。スペースがなければ初期設定へ送る。
 * 体験版なら上に「体験版・残り時間」を出す。伴走ガイド（やってみましょう）のコーチもここに置く。
 */
export const Route = createFileRoute("/_app")({
  beforeLoad: async ({ context, location }) => {
    const me = await context.queryClient.ensureQueryData(meQuery);
    if (!me) throw redirect({ to: "/login", search: { next: location.href } });
    // まだスペースがない人は、初期設定へ
    if (!me.space) throw redirect({ to: "/onboarding" });
  },
  component: AppLayout,
});

function AppLayout() {
  const { data: me } = useQuery(meQuery);
  return (
    <TourProvider userId={me?.user.id ?? null} isGuest={!!me?.user.isGuest}>
      {me && <PreferencesSync me={me} />}
      {me?.user.isGuest && me.user.guestExpiresAt && <TrialBanner expiresAt={me.user.guestExpiresAt} />}
      <Outlet />
      <Coach />
      <FloatingNav />
    </TourProvider>
  );
}
