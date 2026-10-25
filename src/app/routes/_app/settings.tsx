import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { INVITE_TTL_HOURS } from "@shared/constants";
import type { MessageKey } from "@shared/i18n";
import { meQuery, useLogout, useUpdateMe } from "../../api/me";
import {
  errorKey,
  forgetSpaceData,
  inviteQuery,
  spaceQuery,
  useCreateInvite,
  useLeaveSpace,
  useRemoveMember,
  useRenameSpace,
  useRevokeInvite,
} from "../../api/space";
import { GlassCard } from "../../components/glass/GlassCard";
import { ErrorMessage, LoadingSkeleton, Skeleton } from "../../components/ui/States";
import { SettingsScreen } from "../../screens/SettingsScreen";
import type { InviteState, SpaceCardProps } from "../../screens/SpaceCard";

// 予算・カテゴリの欄はフェーズ6で追加する
export const Route = createFileRoute("/_app/settings")({
  component: Settings,
});

function Settings() {
  const { data: me } = useQuery(meQuery);
  const update = useUpdateMe();
  const logout = useLogout();
  const navigate = useNavigate();
  const space = useSpaceCard();
  if (!me) return null;
  return (
    <main className="app-shell flex flex-col gap-5">
      <SettingsScreen
        data={{
          me: { name: me.user.displayName, email: me.user.email },
          space: space.props,
          budgets: null,
          categories: null,
        }}
        spaceFallback={space.fallback}
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

/** スペースの欄に渡す値と操作。読み込み中・失敗のときは代わりの表示（fallback）を返す */
function useSpaceCard(): { props: SpaceCardProps | null; fallback: ReactNode } {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const space = useQuery(spaceQuery);
  const invite = useQuery(inviteQuery);
  const rename = useRenameSpace();
  const create = useCreateInvite();
  const revoke = useRevokeInvite();
  const remove = useRemoveMember();
  const leave = useLeaveSpace();
  const [error, setError] = useState<MessageKey | null>(null);

  if (space.isPending || invite.isPending) {
    return {
      props: null,
      fallback: (
        <GlassCard className="p-4">
          <LoadingSkeleton>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-4 h-10 w-full" />
            <Skeleton className="mt-3 h-10 w-full" />
          </LoadingSkeleton>
        </GlassCard>
      ),
    };
  }
  if (space.isError || invite.isError) {
    return {
      props: null,
      fallback: <ErrorMessage onRetry={() => void Promise.all([space.refetch(), invite.refetch()])} />,
    };
  }

  // 失敗しても画面は閉じず、理由をスペースの欄に出す
  const run = async (p: Promise<unknown>) => {
    setError(null);
    try {
      await p;
    } catch (e) {
      setError(errorKey(e));
    }
  };

  let inviteState: InviteState = { kind: "none" };
  // 作り直した直後だけ URL を見せる（サーバーは URL をこの応答でしか返さない）
  if (create.data && invite.data.active?.expiresAt === create.data.expiresAt) {
    inviteState = { kind: "fresh", url: create.data.url, expiresAt: create.data.expiresAt };
  } else if (invite.data.active) {
    inviteState = { kind: "active", expiresAt: invite.data.active.expiresAt };
  }

  return {
    fallback: null,
    props: {
      name: space.data.name,
      members: space.data.members.map((m) => ({ id: m.id, name: m.displayName, isMe: m.isMe })),
      max: space.data.maxMembers,
      invite: inviteState,
      inviteHours: INVITE_TTL_HOURS,
      error,
      busy: create.isPending || remove.isPending || leave.isPending,
      onRename: (name) => run(rename.mutateAsync(name)),
      onCreateInvite: () => void run(create.mutateAsync()),
      onRevokeInvite: () => {
        create.reset();
        void run(revoke.mutateAsync());
      },
      onRemoveMember: (id) => run(remove.mutateAsync(id)),
      onLeave: () =>
        run(
          leave
            .mutateAsync()
            .then(() => navigate({ to: "/onboarding/space" }))
            .then(() => forgetSpaceData(qc)),
        ),
    },
  };
}
