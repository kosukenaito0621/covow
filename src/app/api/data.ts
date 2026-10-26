import { keepPreviousData, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import type { IsoDate, YearMonth } from "@shared/date/jst";
import type { MonthSummary, PlanStatus } from "@shared/money/summary";
import { type TourEvent, tourEvent } from "../tour/missions";
import type { InsightsData } from "../screens/InsightsScreen";
import { api } from "./client";

/*
 * スペースの中身（予定・支出・カテゴリ・予算・集計）の読み書き。
 * 変えたあとは、関係する一覧と集計をまとめて取り直す（金額は毎回サーバーと shared/money で計算し直す）。
 */

export interface Plan {
  id: string;
  title: string;
  plannedAmount: number;
  plannedDate: IsoDate | null;
  status: PlanStatus;
  categoryId: string | null;
  categoryName: string | null;
  memo: string | null;
  productUrl: string | null;
  createdBy: string;
  createdByName: string;
  assigneeUserId: string | null;
  assigneeName: string | null;
  createdAt: string;
  updatedAt: string;
  expense: { id: string; actualAmount: number; spentAt: IsoDate } | null;
}

export interface Expense {
  id: string;
  title: string;
  actualAmount: number;
  spentAt: IsoDate;
  categoryId: string | null;
  categoryName: string | null;
  memo: string | null;
  purchasePlanId: string | null;
  recordedBy: string;
  recordedByName: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
}

export type Summary = MonthSummary & {
  today: IsoDate;
  momRatio: number | null;
  overdueCount: number;
  upcoming: Plan[];
};

export const plansQuery = queryOptions({
  queryKey: ["plans"],
  queryFn: async () => (await api<{ plans: Plan[] }>("/plans")).plans,
});
export const planQuery = (id: string) =>
  queryOptions({ queryKey: ["plans", id], queryFn: async () => (await api<{ plan: Plan }>(`/plans/${encodeURIComponent(id)}`)).plan });
export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async () => (await api<{ categories: Category[] }>("/categories")).categories,
  staleTime: 5 * 60_000,
});
export const summaryQuery = (month: YearMonth) =>
  // 月・週を切り替えている間は前の中身を残す（灰色の仮の画面に戻さない）
  queryOptions({ queryKey: ["summary", month], queryFn: () => api<Summary>(`/summary?month=${month}`), placeholderData: keepPreviousData });
export const dailyQuery = (from: IsoDate, to: IsoDate) =>
  queryOptions({
    queryKey: ["daily", from, to],
    placeholderData: keepPreviousData,
    queryFn: async () => (await api<{ days: { date: IsoDate; amount: number }[] }>(`/daily?from=${from}&to=${to}`)).days,
  });
export const expensesQuery = (month: YearMonth) =>
  queryOptions({
    queryKey: ["expenses", month],
    placeholderData: keepPreviousData,
    queryFn: async () => (await api<{ expenses: Expense[] }>(`/expenses?month=${month}`)).expenses,
  });
export const budgetsQuery = (from: YearMonth, to: YearMonth) =>
  queryOptions({
    queryKey: ["budgets", from, to],
    queryFn: async () => (await api<{ budgets: { yearMonth: YearMonth; amount: number }[] }>(`/budgets?from=${from}&to=${to}`)).budgets,
  });

export type Insights = Omit<InsightsData, "categories"> & {
  categories: (InsightsData["categories"][number] & { categoryId: string | null })[];
  memberCount: number;
};
export const insightsQuery = (month: YearMonth) =>
  queryOptions({ queryKey: ["insights", month], queryFn: () => api<Insights>(`/insights?month=${month}`), placeholderData: keepPreviousData });

/** お金に関わる一覧と集計を、まとめて取り直す */
function useRefreshMoney() {
  const qc = useQueryClient();
  return () =>
    Promise.all(
      ["plans", "summary", "daily", "expenses", "budgets", "categories", "insights"].map((k) => qc.invalidateQueries({ queryKey: [k] })),
    );
}

export interface PlanBody {
  title: string;
  plannedAmount: string | number;
  plannedDate: IsoDate | null;
  categoryId: string | null;
  memo: string | null;
  productUrl: string | null;
  assigneeUserId: string | null;
}
export interface ExpenseBody {
  title: string;
  actualAmount: string | number;
  spentAt: IsoDate;
  categoryId: string | null;
  memo: string | null;
}

/** 書き込みをまとめて作る。onSuccess で一覧と集計を取り直し、伴走ガイドに合図を送る */
function useMoneyMutation<V, R>(fn: (v: V) => Promise<R>, event?: TourEvent) {
  const refresh = useRefreshMoney();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await refresh();
      if (event) tourEvent(event);
    },
  });
}

export const useCreatePlan = () =>
  useMoneyMutation((b: PlanBody) => api<{ plan: Plan }>("/plans", { method: "POST", body: b }), "plan-created");
export const useUpdatePlan = () =>
  useMoneyMutation(({ id, ...b }: PlanBody & { id: string }) => api<{ plan: Plan }>(`/plans/${id}`, { method: "PATCH", body: b }));
export const usePurchasePlan = () =>
  useMoneyMutation(({ id, ...b }: { id: string; actualAmount: string | number; spentAt: IsoDate }) =>
    api<{ plan: Plan }>(`/plans/${id}/purchase`, { method: "POST", body: b }),
  "plan-purchased",
  );
export const usePlanAction = () =>
  useMoneyMutation(({ id, action }: { id: string; action: "unpurchase" | "cancel" | "restore" }) =>
    api<{ plan: Plan }>(`/plans/${id}/${action}`, { method: "POST" }),
  );
export const useDeletePlan = () => useMoneyMutation((id: string) => api<void>(`/plans/${id}`, { method: "DELETE" }));

export const useCreateExpense = () =>
  useMoneyMutation((b: ExpenseBody) => api<{ expense: Expense }>("/expenses", { method: "POST", body: b }), "expense-created");
export const useUpdateExpense = () =>
  useMoneyMutation(({ id, ...b }: ExpenseBody & { id: string }) =>
    api<{ expense: Expense }>(`/expenses/${id}`, { method: "PATCH", body: b }),
  );
export const useDeleteExpense = () => useMoneyMutation((id: string) => api<void>(`/expenses/${id}`, { method: "DELETE" }));

export const usePutBudget = () =>
  useMoneyMutation(({ yearMonth, ...b }: { yearMonth: YearMonth; amount: string | number; applyToFuture: boolean }) =>
    api(`/budgets/${yearMonth}`, { method: "PUT", body: b }),
  "budget-saved",
  );

export const useCreateCategory = () => useMoneyMutation((name: string) => api("/categories", { method: "POST", body: { name } }));
export const useRenameCategory = () =>
  useMoneyMutation(({ id, name }: { id: string; name: string }) => api(`/categories/${id}`, { method: "PATCH", body: { name } }));
export const useDeleteCategory = () => useMoneyMutation((id: string) => api(`/categories/${id}`, { method: "DELETE" }));
export const useReorderCategories = () =>
  useMoneyMutation((ids: string[]) => api("/categories/order", { method: "PUT", body: { ids } }));
export const categoryUsage = (id: string) => api<{ plans: number; expenses: number }>(`/categories/${id}/usage`);
