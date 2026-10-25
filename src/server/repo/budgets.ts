import { and, asc, eq, gte, lte } from "drizzle-orm";
import { BUDGET_FUTURE_MONTHS } from "../../shared/constants";
import { addMonths, type YearMonth } from "../../shared/date/jst";
import type { Db } from "../db/client";
import { budgets } from "../db/schema";

/** from〜to の月の予算（行のない月は「未設定」なので返さない） */
export const listBudgets = (db: Db, spaceId: string, from: YearMonth, to: YearMonth) =>
  db
    .select({ yearMonth: budgets.yearMonth, amount: budgets.budgetAmount })
    .from(budgets)
    .where(and(eq(budgets.spaceId, spaceId), gte(budgets.yearMonth, from), lte(budgets.yearMonth, to)))
    .orderBy(asc(budgets.yearMonth))
    .all();

export async function getBudget(db: Db, spaceId: string, ym: YearMonth): Promise<number | null> {
  const row = await db
    .select({ amount: budgets.budgetAmount })
    .from(budgets)
    .where(and(eq(budgets.spaceId, spaceId), eq(budgets.yearMonth, ym)))
    .get();
  return row?.amount ?? null;
}

/**
 * 月の予算を決める。applyToFuture なら翌月から12か月先までも同じ金額にする（作る・上書きする）。
 * 過去の月は、その月を指定したときだけ変わる（指示書 7.7）。
 */
export async function putBudget(db: Db, spaceId: string, ym: YearMonth, amount: number, applyToFuture: boolean) {
  const months = [ym, ...(applyToFuture ? Array.from({ length: BUDGET_FUTURE_MONTHS }, (_, i) => addMonths(ym, i + 1)) : [])];
  const now = new Date().toISOString();
  const d1 = db.$client;
  await d1.batch(
    months.map((m) =>
      d1
        .prepare(
          `INSERT INTO budgets (id, space_id, year_month, budget_amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT (space_id, year_month) DO UPDATE SET budget_amount = excluded.budget_amount, updated_at = excluded.updated_at`,
        )
        .bind(crypto.randomUUID(), spaceId, m, amount, now, now),
    ),
  );
  return months;
}
