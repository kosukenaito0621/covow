import { addMonths, type IsoDate, type YearMonth } from "../date/jst";
import { expenseMonth, planMonth } from "./month";
import type { ExpenseLike, PlanLike } from "./summary";

export const UNCATEGORIZED_LABEL = "未分類";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/**
 * 予定と実績の差：購入済みの予定だけで、予定金額の合計と実際の金額の合計を比べる。
 * 月は支出日（実際に買った月）で決める。diff = 実際 − 予定（マイナス＝予定より少なく済んだ）。
 */
export const planVsActual = (input: {
  yearMonth: YearMonth;
  plans: readonly PlanLike[];
  expenses: readonly ExpenseLike[];
}): { count: number; plannedTotal: number; actualTotal: number; diff: number } => {
  const purchased = new Map(input.plans.filter((p) => p.status === "purchased").map((p) => [p.id, p]));
  const pairs = input.expenses
    .filter((e) => e.purchasePlanId !== null && expenseMonth(e) === input.yearMonth)
    .flatMap((e) => {
      const p = purchased.get(e.purchasePlanId!);
      return p ? [{ planned: p.plannedAmount, actual: e.actualAmount }] : [];
    });
  const plannedTotal = sum(pairs.map((x) => x.planned));
  const actualTotal = sum(pairs.map((x) => x.actual));
  return { count: pairs.length, plannedTotal, actualTotal, diff: actualTotal - plannedTotal };
};

export interface CategoryRow {
  categoryId: string | null;
  name: string;
  amount: number;
  ratio: number;
}

/** カテゴリ別の実支出。カテゴリなし・削除済みのカテゴリは「未分類」にまとめる */
export const categoryBreakdown = (input: {
  yearMonth: YearMonth;
  expenses: readonly ExpenseLike[];
  categories: readonly { id: string; name: string }[];
}): { total: number; rows: CategoryRow[] } => {
  const names = new Map(input.categories.map((c) => [c.id, c.name]));
  const totals = new Map<string | null, number>();
  for (const e of input.expenses) {
    if (expenseMonth(e) !== input.yearMonth) continue;
    const key = e.categoryId && names.has(e.categoryId) ? e.categoryId : null;
    totals.set(key, (totals.get(key) ?? 0) + e.actualAmount);
  }
  const total = sum([...totals.values()]);
  const rows = [...totals.entries()]
    .map(([categoryId, amount]) => ({
      categoryId,
      name: categoryId === null ? UNCATEGORIZED_LABEL : names.get(categoryId)!,
      amount,
      ratio: total === 0 ? 0 : amount / total,
    }))
    // 金額の大きい順。同額なら未分類を後ろに
    .sort((a, b) => b.amount - a.amount || (a.categoryId === null ? 1 : b.categoryId === null ? -1 : 0));
  return { total, rows };
};

/** 直近 N か月の実支出と予算（古い月から順に） */
export const monthlyTrend = (input: {
  endYearMonth: YearMonth;
  months: number;
  expenses: readonly ExpenseLike[];
  budgets: readonly { yearMonth: YearMonth; budgetAmount: number }[];
}): { yearMonth: YearMonth; actual: number; budget: number | null }[] => {
  const budgetByMonth = new Map(input.budgets.map((b) => [b.yearMonth, b.budgetAmount]));
  return Array.from({ length: input.months }, (_, i) => {
    const ym = addMonths(input.endYearMonth, i - input.months + 1);
    return {
      yearMonth: ym,
      actual: sum(input.expenses.filter((e) => expenseMonth(e) === ym).map((e) => e.actualAmount)),
      budget: budgetByMonth.get(ym) ?? null,
    };
  });
};

/**
 * ふたり：記録した人ごとの実支出と、その月に登録した予定の数。
 * いまのメンバー以外（外れた人）は userId: null の「元メンバー」にまとめる。
 */
export const memberBreakdown = (input: {
  yearMonth: YearMonth;
  memberIds: readonly string[];
  expenses: readonly ExpenseLike[];
  plans: readonly PlanLike[];
}): { userId: string | null; amount: number; planCount: number }[] => {
  const key = (id: string | undefined) => (id && input.memberIds.includes(id) ? id : null);
  const rows = new Map<string | null, { amount: number; planCount: number }>(
    input.memberIds.map((id) => [id, { amount: 0, planCount: 0 }]),
  );
  const row = (k: string | null) => {
    let r = rows.get(k);
    if (!r) rows.set(k, (r = { amount: 0, planCount: 0 }));
    return r;
  };
  for (const e of input.expenses) {
    if (expenseMonth(e) === input.yearMonth) row(key(e.recordedBy)).amount += e.actualAmount;
  }
  for (const p of input.plans) {
    if (planMonth(p) === input.yearMonth) row(key(p.createdBy)).planCount += 1;
  }
  return [...rows.entries()].map(([userId, r]) => ({ userId, ...r }));
};

/** 指定した日付ごとの実支出の合計（記録のない日は 0） */
export const dailySpend = (input: {
  dates: readonly IsoDate[];
  expenses: readonly ExpenseLike[];
}): { date: IsoDate; amount: number }[] =>
  input.dates.map((date) => ({
    date,
    amount: sum(input.expenses.filter((e) => e.spentAt === date).map((e) => e.actualAmount)),
  }));

/**
 * 推移のまとめ：月の平均と、予算を超えた月の数。
 * 途中の月（currentYearMonth）は金額がまだ少ないので平均から外す。予算オーバーの数には含める。
 */
export const trendStats = (
  trend: readonly { yearMonth: YearMonth; actual: number; budget: number | null }[],
  currentYearMonth: YearMonth,
): { average: number | null; overCount: number } => {
  const done = trend.filter((m) => m.yearMonth !== currentYearMonth);
  return {
    average: done.length === 0 ? null : Math.round(sum(done.map((m) => m.actual)) / done.length),
    overCount: trend.filter((m) => m.budget !== null && m.actual > m.budget).length,
  };
};

/** 全体に占める割合（0〜1）。合計が 0 なら 0 */
export const shareOf = (amount: number, total: number): number => (total === 0 ? 0 : amount / total);
