import { addMonths, daysInMonth, type IsoDate, type YearMonth, yearMonthOf } from "../date/jst";
import { expenseMonth, planMonth } from "./month";

export type PlanStatus = "planned" | "purchased" | "canceled";

export interface PlanLike {
  id: string;
  plannedAmount: number;
  plannedDate: string | null;
  createdAt: string;
  status: PlanStatus;
  createdBy?: string;
}

export interface ExpenseLike {
  id: string;
  actualAmount: number;
  spentAt: string;
  purchasePlanId: string | null;
  categoryId?: string | null;
  recordedBy?: string;
}

export interface MonthSummary {
  yearMonth: YearMonth;
  /** null＝未設定（0円として扱わない） */
  budget: number | null;
  actualTotal: number;
  plannedTotal: number;
  plannedCount: number;
  /** 予算 − 実支出 − 予定額。予算が未設定なら null。マイナスもそのまま返す */
  remaining: number | null;
  /** (実支出 + 予定額) ÷ 予算。予算が未設定・0円なら null */
  usageRate: number | null;
  overBudget: boolean;
  /** 予算を超える金額（超えていなければ 0） */
  overAmount: number;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export const isPlannedIn = (p: PlanLike, ym: YearMonth) => p.status === "planned" && planMonth(p) === ym;

/**
 * 月の集計（指示書 7.2）。
 * 月の実支出 = その月の支出の合計
 * 月の予定額 = その月の未購入（planned）の予定の合計
 * 利用可能残額 = 月間予算 − 月の実支出 − 月の予定額
 * 予算使用率 = (月の実支出 + 月の予定額) ÷ 月間予算
 */
export const summarizeMonth = (input: {
  yearMonth: YearMonth;
  budget: number | null;
  plans: readonly PlanLike[];
  expenses: readonly ExpenseLike[];
}): MonthSummary => {
  const { yearMonth, budget } = input;
  const monthExpenses = input.expenses.filter((e) => expenseMonth(e) === yearMonth);
  const monthPlans = input.plans.filter((p) => isPlannedIn(p, yearMonth));
  const actualTotal = sum(monthExpenses.map((e) => e.actualAmount));
  const plannedTotal = sum(monthPlans.map((p) => p.plannedAmount));
  const used = actualTotal + plannedTotal;
  const remaining = budget === null ? null : budget - used;
  return {
    yearMonth,
    budget,
    actualTotal,
    plannedTotal,
    plannedCount: monthPlans.length,
    remaining,
    usageRate: budget === null || budget === 0 ? null : used / budget,
    overBudget: remaining !== null && remaining < 0,
    overAmount: remaining !== null && remaining < 0 ? -remaining : 0,
  };
};

/** 先月以前の月に入っていて、まだ未購入の予定の件数（7.3） */
export const overduePlannedCount = (plans: readonly PlanLike[], currentYearMonth: YearMonth): number =>
  plans.filter((p) => p.status === "planned" && planMonth(p) < currentYearMonth).length;

/**
 * 登録・編集フォームの「いまの残額 → 登録後」。summary は予定日の月の集計を渡す。
 * 編集のときは before に元の予定を渡す（同じ月で未購入なら、元の金額を戻してから引く）。
 */
export const remainingAfterPlanChange = (
  summary: MonthSummary,
  before: PlanLike | null,
  after: { amount: number; yearMonth: YearMonth },
): { before: number; after: number } | null => {
  if (summary.remaining === null) return null;
  let next = summary.remaining;
  if (before && isPlannedIn(before, summary.yearMonth)) next += before.plannedAmount;
  if (after.yearMonth === summary.yearMonth) next -= after.amount;
  return { before: summary.remaining, after: next };
};

/**
 * 先月の同じ日までとの比較。
 * 表示中の月が今日を含む月なら「今日まで」と「先月の同じ日まで（なければ月末まで）」、
 * 過去の月なら月全体どうしを比べる。
 */
export const monthOverMonth = (input: {
  yearMonth: YearMonth;
  today: IsoDate;
  expenses: readonly ExpenseLike[];
}): { current: number; previous: number; diff: number; ratio: number | null } => {
  const { yearMonth, today, expenses } = input;
  const prevYm = addMonths(yearMonth, -1);
  const isCurrentMonth = yearMonthOf(today) === yearMonth;
  const day = isCurrentMonth ? Number(today.slice(8, 10)) : daysInMonth(yearMonth);
  const prevDay = isCurrentMonth ? Math.min(day, daysInMonth(prevYm)) : daysInMonth(prevYm);
  const upTo = (ym: YearMonth, d: number) =>
    sum(
      expenses
        .filter((e) => expenseMonth(e) === ym && Number(e.spentAt.slice(8, 10)) <= d)
        .map((e) => e.actualAmount),
    );
  const current = upTo(yearMonth, day);
  const previous = upTo(prevYm, prevDay);
  const diff = current - previous;
  return { current, previous, diff, ratio: previous === 0 ? null : diff / previous };
};
