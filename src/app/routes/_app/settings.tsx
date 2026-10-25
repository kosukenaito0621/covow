import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { meQuery, useLogout, useUpdateMe } from "../../api/me";
import { SettingsScreen } from "../../screens/SettingsScreen";

// スペース・予算・カテゴリの欄はフェーズ5〜6で追加する（いまはプロフィール・テーマ・言語・ログアウト）
export const Route = createFileRoute("/_app/settings")({
  component: Settings,
});

function Settings() {
  const { data: me } = useQuery(meQuery);
  const update = useUpdateMe();
  const logout = useLogout();
  const navigate = useNavigate();
  if (!me) return null;
  return (
    <main className="app-shell flex flex-col gap-5">
      <SettingsScreen
        data={{
          me: { name: me.user.displayName, email: me.user.email },
          space: null,
          budgets: null,
          categories: null,
        }}
        actions={{
          onPreferenceChange: (patch) => update.mutate(patch),
          onSignOut: () => logout.mutate(undefined, { onSuccess: () => void navigate({ to: "/login" }) }),
          signingOut: logout.isPending,
          signOutError: logout.isError,
        }}
      />
    </main>
  );
}
