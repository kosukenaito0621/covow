import { jstYearMonthOfInstant, yearMonthOf, type YearMonth } from "../date/jst";

/** 実支出の月：spent_at（日本時間の日付）の月 */
export const expenseMonth = (e: { spentAt: string }): YearMonth => yearMonthOf(e.spentAt);

/** 購入予定の月：planned_date の月。空なら登録日（日本時間）の月 */
export const planMonth = (p: { plannedDate: string | null; createdAt: string }): YearMonth =>
  p.plannedDate ? yearMonthOf(p.plannedDate) : jstYearMonthOfInstant(p.createdAt);

type ListedPlan = { status: "planned" | "purchased" | "canceled"; plannedDate: string | null; createdAt: string; purchase?: { date: string } };

/** 予定一覧での月：購入済みは買った日の月。ほかは planMonth（予定日、なければ登録した月） */
export const listMonthOf = (p: ListedPlan): YearMonth => (p.purchase ? yearMonthOf(p.purchase.date) : planMonth(p));

/**
 * 予定一覧に出す予定。選んだ月の分に加えて、今月を見ているときは買い忘れを防ぐため
 * 「先月以前に予定日が過ぎた未購入」と「日付のない未購入」も出す。
 */
export function plansForMonth<T extends ListedPlan>(plans: readonly T[], ym: YearMonth, today: string): T[] {
  const current = yearMonthOf(today) === ym;
  return plans.filter((p) => {
    if (listMonthOf(p) === ym) return true;
    if (!current || p.status !== "planned") return false;
    return p.plannedDate === null || p.plannedDate < today;
  });
}
