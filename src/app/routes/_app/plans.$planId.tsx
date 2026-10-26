import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { jstThisMonth, jstToday, yearMonthOf } from "@shared/date/jst";
import type { MessageKey } from "@shared/i18n";
import { remainingAfterPlanChange } from "@shared/money/summary";
import { ApiError } from "../../api/client";
import { planQuery, plansQuery, summaryQuery, useDeletePlan, usePlanAction, usePurchasePlan } from "../../api/data";
import { errorKey } from "../../api/space";
import { GlassCard } from "../../components/glass/GlassCard";
import { CircleIconButton } from "../../components/ui/Buttons";
import { PlanDetailSkeleton } from "../../components/loading/PageSkeletons";
import { Reveal, useStartedLoading } from "../../components/ui/Reveal";
import { EmptyState, ErrorMessage } from "../../components/ui/States";
import { useT } from "../../i18n/I18nProvider";
import { usePlanForm } from "../../screens/forms/useForms";
import { PlanDetailScreen } from "../../screens/PlanDetailScreen";
import { toPlanView } from "../../screens/types";
import { useTheme } from "../../theme/ThemeProvider";

export const Route = createFileRoute("/_app/plans/$planId")({
  component: PlanDetail,
});

function PlanDetail() {
  const { planId } = Route.useParams();
  const navigate = useNavigate();
  const { t } = useT();
  const { theme } = useTheme();
  const qc = useQueryClient();
  // 一覧から開いたときは、一覧にある内容をすぐ出して、裏で最新を取る（灰色の仮の画面を出さない）
  const plan = useQuery({ ...planQuery(planId), placeholderData: () => qc.getQueryData(plansQuery.queryKey)?.find((x) => x.id === planId) });
  const reveal = useStartedLoading(plan.isPending);
  const summary = useQuery(summaryQuery(jstThisMonth()));
  const purchase = usePurchasePlan();
  const action = usePlanAction();
  const remove = useDeletePlan();
  const form = usePlanForm();
  const [error, setError] = useState<MessageKey | null>(null);
  const back = () => void navigate({ to: "/plans" });

  // 状態がぶつかったとき（すでに購入済みなど）は、最新の状態を取り直して理由を出す
  const fail = (e: unknown) => {
    setError(errorKey(e));
    if (e instanceof ApiError && e.status === 409) void plan.refetch();
  };

  if (plan.isPending) {
    return (
      <main className="app-shell flex flex-col gap-5">
        <PlanDetailSkeleton />
      </main>
    );
  }
  if (plan.isError) {
    const missing = plan.error instanceof ApiError && plan.error.status === 404;
    return (
      <main className="app-shell flex flex-col gap-5">
        <CircleIconButton tone={theme.tone.page} icon="arrowLeft" label={t("common.back")} onClick={back} />
        {missing ? (
          <GlassCard>
            <EmptyState tone={theme.tone.card} icon="plans" title={t("plan.notFound")} />
          </GlassCard>
        ) : (
          <ErrorMessage tone={theme.tone.page} onRetry={() => void plan.refetch()} />
        )}
      </main>
    );
  }

  const p = plan.data;
  return (
    <main className="app-shell flex flex-col gap-5">
      <Reveal active={reveal} className="flex flex-col gap-5">
        <PlanDetailScreen
          key={`${p.id}-${p.status}`}
          plan={toPlanView(p)}
          today={jstToday()}
          onBack={back}
          previewRemaining={(amount, date) => {
            if (!summary.data) return null;
            // 予定（今月なら予定額）を外し、買った日の月に実際の金額が入る
            const before = { id: p.id, plannedAmount: p.plannedAmount, plannedDate: p.plannedDate, createdAt: p.createdAt, status: p.status };
            return remainingAfterPlanChange(summary.data, before, { amount, yearMonth: yearMonthOf(date) });
          }}
          actions={{
            pending: purchase.isPending || action.isPending || remove.isPending,
            error,
            onEdit: () => form.open(p),
            onPurchase: async (amount, date) => {
              setError(null);
              try {
                await purchase.mutateAsync({ id: p.id, actualAmount: amount, spentAt: date });
                return true;
              } catch (e) {
                fail(e);
                return false;
              }
            },
            onUnpurchase: () => {
              setError(null);
              action.mutate({ id: p.id, action: "unpurchase" }, { onError: fail });
            },
            onCancel: () => {
              setError(null);
              action.mutate({ id: p.id, action: "cancel" }, { onError: fail });
            },
            onRestore: () => {
              setError(null);
              action.mutate({ id: p.id, action: "restore" }, { onError: fail });
            },
            onDelete: async () => {
              setError(null);
              try {
                await remove.mutateAsync(p.id);
                back();
                return true;
              } catch (e) {
                fail(e);
                return false;
              }
            },
          }}
        />
      </Reveal>
      {form.element}
    </main>
  );
}
