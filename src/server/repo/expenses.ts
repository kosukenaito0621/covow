import type { YearMonth } from "../../shared/date/jst";
import type { ExpenseInput } from "../../shared/schemas";
import type { Db } from "../db/client";
import { assertCategoryInSpace } from "./categories";
import { RepoError } from "./errors";

/*
 * 支出。予定から作られた支出（purchase_plan_id あり）も一覧に出し、金額・日付などは直せる。
 * ただし支出一覧からは消せない（予定の詳細で「未購入に戻す」か予定を削除する。確認事項③の案A）。
 */

export interface ExpenseRow {
  id: string;
  title: string;
  actualAmount: number;
  spentAt: string;
  categoryId: string | null;
  categoryName: string | null;
  memo: string | null;
  purchasePlanId: string | null;
  recordedBy: string;
  recordedByName: string;
  createdAt: string;
}

const SELECT = `
  SELECT e.id, e.title, e.actual_amount AS actualAmount, e.spent_at AS spentAt, e.category_id AS categoryId, c.name AS categoryName,
         e.memo, e.purchase_plan_id AS purchasePlanId, e.recorded_by AS recordedBy, u.display_name AS recordedByName, e.created_at AS createdAt
    FROM expenses e
    JOIN users u ON u.id = e.recorded_by
    LEFT JOIN categories c ON c.id = e.category_id`;

/** 月の支出（新しい日付から） */
export async function listExpenses(db: Db, spaceId: string, ym: YearMonth): Promise<ExpenseRow[]> {
  const res = await db.$client
    .prepare(`${SELECT} WHERE e.space_id = ? AND e.spent_at >= ? AND e.spent_at <= ? ORDER BY e.spent_at DESC, e.created_at DESC`)
    .bind(spaceId, `${ym}-01`, `${ym}-31`)
    .all<ExpenseRow>();
  return res.results;
}

/** 期間の支出（集計用。日付は YYYY-MM-DD の文字列どうしで比べる） */
export async function listExpensesBetween(db: Db, spaceId: string, from: string, to: string) {
  const res = await db.$client
    .prepare(
      `SELECT id, actual_amount AS actualAmount, spent_at AS spentAt, purchase_plan_id AS purchasePlanId, category_id AS categoryId, recorded_by AS recordedBy
         FROM expenses WHERE space_id = ? AND spent_at >= ? AND spent_at <= ?`,
    )
    .bind(spaceId, from, to)
    .all<{ id: string; actualAmount: number; spentAt: string; purchasePlanId: string | null; categoryId: string | null; recordedBy: string }>();
  return res.results;
}

export async function getExpense(db: Db, spaceId: string, id: string): Promise<ExpenseRow> {
  const row = await db.$client.prepare(`${SELECT} WHERE e.id = ? AND e.space_id = ?`).bind(id, spaceId).first<ExpenseRow>();
  if (!row) throw new RepoError("NOT_FOUND");
  return row;
}

/** 予定なしの支出を記録する（purchase_plan_id は受け取らない） */
export async function createExpense(db: Db, spaceId: string, userId: string, input: ExpenseInput) {
  await assertCategoryInSpace(db, spaceId, input.categoryId);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.$client
    .prepare(
      `INSERT INTO expenses (id, space_id, purchase_plan_id, recorded_by, title, actual_amount, category_id, spent_at, memo, created_at, updated_at)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, spaceId, userId, input.title, input.actualAmount, input.categoryId, input.spentAt, input.memo, now, now)
    .run();
  return getExpense(db, spaceId, id);
}

export async function updateExpense(db: Db, spaceId: string, id: string, input: ExpenseInput) {
  await assertCategoryInSpace(db, spaceId, input.categoryId);
  const res = await db.$client
    .prepare(
      `UPDATE expenses SET title = ?, actual_amount = ?, category_id = ?, spent_at = ?, memo = ?, updated_at = ?
       WHERE id = ? AND space_id = ?`,
    )
    .bind(input.title, input.actualAmount, input.categoryId, input.spentAt, input.memo, new Date().toISOString(), id, spaceId)
    .run();
  if (res.meta.changes === 0) throw new RepoError("NOT_FOUND");
  return getExpense(db, spaceId, id);
}

export async function deleteExpense(db: Db, spaceId: string, id: string) {
  const res = await db.$client
    .prepare("DELETE FROM expenses WHERE id = ? AND space_id = ? AND purchase_plan_id IS NULL")
    .bind(id, spaceId)
    .run();
  if (res.meta.changes === 1) return;
  const row = await db.$client
    .prepare("SELECT purchase_plan_id AS planId FROM expenses WHERE id = ? AND space_id = ?")
    .bind(id, spaceId)
    .first<{ planId: string | null }>();
  throw new RepoError(row ? "FROM_PLAN" : "NOT_FOUND");
}

