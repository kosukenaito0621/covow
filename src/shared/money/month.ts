import { jstYearMonthOfInstant, yearMonthOf, type YearMonth } from "../date/jst";

/** 実支出の月：spent_at（日本時間の日付）の月 */
export const expenseMonth = (e: { spentAt: string }): YearMonth => yearMonthOf(e.spentAt);

/** 購入予定の月：planned_date の月。空なら登録日（日本時間）の月 */
export const planMonth = (p: { plannedDate: string | null; createdAt: string }): YearMonth =>
  p.plannedDate ? yearMonthOf(p.plannedDate) : jstYearMonthOfInstant(p.createdAt);
