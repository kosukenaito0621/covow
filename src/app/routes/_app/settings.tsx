import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { INVITE_TTL_HOURS } from "@shared/constants";
import type { MessageKey } from "@shared/i18n";
import { addMonths, jstThisMonth } from "@shared/date/jst";
import { budgetsQuery, categoriesQuery } from "../../api/data";
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
import { useBudgetSheet } from "../../screens/forms/BudgetSheet";
import { useCategorySheet } from "../../screens/forms/CategorySheet";
import { SettingsScreen } from "../../screens/SettingsScreen";
import { useTour } from "../../tour/TourProvider";
import { useNews } from "../../news/useNews";
import { NewsSheet } from "../../screens/NewsSheet";
import type { InviteState, SpaceCardProps } from "../../screens/SpaceCard";

export const Route = createFileRoute("/_app/settings")({
  component: Settings,
});

function Settings() {
  const { data: me } = useQuery(meQuery);
  const update = useUpdateMe();
  const logout = useLogout();
  const navigate = useNavigate();
  const tour = useTour();
  const space = useSpaceCard(!!me?.user.isGuest);
  // 予算は今月から3か月分を出す（それより先・過去はホームの月の切り替えから）
  const thisMonth = jstThisMonth();
  const months = [0, 1, 2].map((i) => addMonths(thisMonth, i));
  const budgets = useQuery(budgetsQuery(months[0]!, months[2]!));
  const categories = useQuery(categoriesQuery);
  const budgetSheet = useBudgetSheet();
  const categorySheet = useCategorySheet(categories.data ?? []);
  const news = useNews(me?.user.id ?? null);
  // 開いた時点で読んでいなかったもの（一覧の「New」の印）。開いたら全部読んだことにする
  const [newsOpen, setNewsOpen] = useState<ReadonlySet<string> | null>(null);
  if (!me) return null;
  return (
    <main className="app-shell flex flex-col gap-5">
      <SettingsScreen
        data={{
          me: { name: me.user.displayName, email: me.user.email },
          space: space.props,
          budgets: months.map((m) => ({ yearMonth: m, amount: budgets.data?.find((b) => b.yearMonth === m)?.amount ?? null })),
          categories: categories.data ?? null,
        }}
        spaceFallback={space.fallback}
        actions={{
          onPreferenceChange: (patch) => update.mutate(patch),
          onBudget: (ym, amount) => budgetSheet.open(ym, amount),
          onCategory: (id) => categorySheet.open(id),
          onNews: () => {
            setNewsOpen(news.unreadIds);
            news.markAllRead();
          },
          newsUnread: news.unread,
          onTour: () => tour.reset(),
          isGuest: me.user.isGuest,
          onSignOut: () => logout.mutate(undefined, { onSuccess: () => void navigate({ to: "/login" }) }),
          signingOut: logout.isPending,
          signOutError: logout.isError,
        }}
      />
      {budgetSheet.element}
      {categorySheet.element}
      <NewsSheet open={newsOpen !== null} onClose={() => setNewsOpen(null)} items={news.items} unreadIds={newsOpen ?? new Set()} />
    </main>
  );
}

/** スペースの欄に渡す値と操作。読み込み中・失敗のときは代わりの表示（fallback）を返す */
function useSpaceCard(isGuest: boolean): { props: SpaceCardProps | null; fallback: ReactNode } {
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
      locked: isGuest,
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
            .then(() => navigate({ to: "/onboarding" }))
            .then(() => forgetSpaceData(qc)),
        ),
    },
  };
}
