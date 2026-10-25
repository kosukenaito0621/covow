import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { jstThisMonth, jstToday, jstYearMonthOfInstant, yearMonthOf } from "@shared/date/jst";
import type { MessageKey } from "@shared/i18n";
import { remainingAfterPlanChange } from "@shared/money/summary";
import {
  categoriesQuery,
  type Expense,
  type Plan,
  summaryQuery,
  useCreateExpense,
  useCreatePlan,
  useDeleteExpense,
  useUpdateExpense,
  useUpdatePlan,
} from "../../api/data";
import { errorKey, spaceQuery } from "../../api/space";
import { ConfirmDialog } from "../../components/glass/ConfirmDialog";
import { useT } from "../../i18n/I18nProvider";
import { useTour } from "../../tour/TourProvider";
import { ExpenseFormSheet } from "./ExpenseFormSheet";
import { PlanFormSheet } from "./PlanFormSheet";

/**
 * 予定の登録・編集シートを開く仕組み（ホーム・予定一覧・予定の詳細で共通）。
 * 「いまの残額 → 登録後」は今月の集計と shared/money の関数で出す（予定日が別の月なら今月は変わらない）。
 */
/** 伴走ガイドで入れておく見本（データの言語は画面の言語に合わせる） */
const SAMPLES = {
  plan: { en: { title: "Humidifier", amount: 9800 }, ja: { title: "加湿器", amount: 9800 } },
  expense: { en: { title: "Lunch", amount: 1200 }, ja: { title: "ランチ", amount: 1200 } },
} as const;

export function usePlanForm(onSaved?: (plan: Plan) => void) {
  const { locale } = useT();
  const tour = useTour();
  const [state, setState] = useState<{ open: boolean; plan: Plan | null; key: number }>({ open: false, plan: null, key: 0 });
  const [error, setError] = useState<MessageKey | null>(null);
  const month = jstThisMonth();
  const summary = useQuery({ ...summaryQuery(month), enabled: state.open });
  const categories = useQuery(categoriesQuery);
  const space = useQuery(spaceQuery);
  const create = useCreatePlan();
  const update = useUpdatePlan();

  const open = (plan: Plan | null = null) => {
    setError(null);
    setState((s) => ({ open: true, plan, key: s.key + 1 }));
  };
  const close = () => setState((s) => ({ ...s, open: false }));

  const element = (
    <PlanFormSheet
      key={`plan-${state.key}`}
      open={state.open}
      onClose={close}
      plan={state.plan}
      sample={!state.plan && tour.active?.id === "add-plan" ? SAMPLES.plan[locale] : null}
      categories={categories.data ?? []}
      members={(space.data?.members ?? []).map((m) => ({ id: m.id, name: m.displayName }))}
      previewRemaining={(amount, date) => {
        if (!summary.data) return null;
        const before = state.plan
          ? {
              id: state.plan.id,
              plannedAmount: state.plan.plannedAmount,
              plannedDate: state.plan.plannedDate,
              createdAt: state.plan.createdAt,
              status: state.plan.status,
            }
          : null;
        const createdMonth = state.plan ? jstYearMonthOfInstant(state.plan.createdAt) : month;
        return remainingAfterPlanChange(summary.data, before, { amount, yearMonth: date ? yearMonthOf(date) : createdMonth });
      }}
      pending={create.isPending || update.isPending}
      error={error}
      onSubmit={(body) => {
        setError(null);
        const done = ({ plan }: { plan: Plan }) => {
          close();
          onSaved?.(plan);
        };
        const fail = (e: unknown) => setError(errorKey(e));
        if (state.plan) update.mutate({ id: state.plan.id, ...body }, { onSuccess: done, onError: fail });
        else create.mutate(body, { onSuccess: done, onError: fail });
      }}
    />
  );
  return { open, element };
}

/** 支出の記録・編集シート（ホーム・支出一覧で共通）。削除は確認してから */
export function useExpenseForm() {
  const { t, locale } = useT();
  const tour = useTour();
  const [state, setState] = useState<{ open: boolean; expense: Expense | null; key: number }>({ open: false, expense: null, key: 0 });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<MessageKey | null>(null);
  const categories = useQuery(categoriesQuery);
  const create = useCreateExpense();
  const update = useUpdateExpense();
  const remove = useDeleteExpense();

  const open = (expense: Expense | null = null) => {
    setError(null);
    setState((s) => ({ open: true, expense, key: s.key + 1 }));
  };
  const close = () => setState((s) => ({ ...s, open: false }));
  const fail = (e: unknown) => setError(errorKey(e));

  const element = (
    <>
      <ExpenseFormSheet
        key={`expense-${state.key}`}
        open={state.open && !confirmDelete}
        onClose={close}
        expense={state.expense}
        sample={!state.expense && tour.active?.id === "expense" ? SAMPLES.expense[locale] : null}
        today={jstToday()}
        categories={categories.data ?? []}
        pending={create.isPending || update.isPending}
        error={error}
        onDelete={() => setConfirmDelete(true)}
        onSubmit={(body) => {
          setError(null);
          if (state.expense) update.mutate({ id: state.expense.id, ...body }, { onSuccess: close, onError: fail });
          else create.mutate(body, { onSuccess: close, onError: fail });
        }}
      />
      <ConfirmDialog
        open={confirmDelete}
        title={t("expense.deleteConfirm")}
        confirmLabel={t("plan.delete")}
        busy={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (!state.expense) return;
          remove.mutate(state.expense.id, {
            onSuccess: () => {
              setConfirmDelete(false);
              close();
            },
            onError: (e) => {
              setConfirmDelete(false);
              fail(e);
            },
          });
        }}
      />
    </>
  );
  return { open, element };
}
