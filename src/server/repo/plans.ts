import type { PlanInput } from "../../shared/schemas";
import type { PlanStatus } from "../../shared/money/summary";
import type { Db } from "../db/client";
import { assertCategoryInSpace } from "./categories";
import { fromConstraint, RepoError } from "./errors";

/*
 * 購入予定。どの文も WHERE に space_id を入れて、ほかのスペースの予定は「ない」ものとして扱う（404）。
 * 「購入済みにする」「未購入に戻す」は、予定と支出を1回の batch でまとめて変える（指示書 7.4・7.5、計画 2.3）。
 */

export interface PlanRow {
  id: string;
  title: string;
  plannedAmount: number;
  plannedDate: string | null;
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
  /** 購入済みなら、紐づく支出 */
  expense: { id: string; actualAmount: number; spentAt: string } | null;
}

type RawPlan = Omit<PlanRow, "expense"> & { expenseId: string | null; actualAmount: number | null; spentAt: string | null };

const SELECT = `
  SELECT p.id, p.title, p.planned_amount AS plannedAmount, p.planned_date AS plannedDate, p.status,
         p.category_id AS categoryId, c.name AS categoryName, p.memo, p.product_url AS productUrl,
         p.created_by AS createdBy, cu.display_name AS createdByName,
         p.assignee_user_id AS assigneeUserId, au.display_name AS assigneeName,
         p.created_at AS createdAt, p.updated_at AS updatedAt,
         e.id AS expenseId, e.actual_amount AS actualAmount, e.spent_at AS spentAt
    FROM purchase_plans p
    JOIN users cu ON cu.id = p.created_by
    LEFT JOIN users au ON au.id = p.assignee_user_id
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN expenses e ON e.purchase_plan_id = p.id`;

const toRow = ({ expenseId, actualAmount, spentAt, ...p }: RawPlan): PlanRow => ({
  ...p,
  expense: expenseId && actualAmount !== null && spentAt ? { id: expenseId, actualAmount, spentAt } : null,
});

/** スペースの予定すべて（予定日の順。日付なしは後ろ） */
export async function listPlans(db: Db, spaceId: string): Promise<PlanRow[]> {
  const res = await db.$client
    .prepare(`${SELECT} WHERE p.space_id = ? ORDER BY p.planned_date IS NULL, p.planned_date, p.created_at`)
    .bind(spaceId)
    .all<RawPlan>();
  return res.results.map(toRow);
}

export async function getPlan(db: Db, spaceId: string, id: string): Promise<PlanRow> {
  const row = await db.$client.prepare(`${SELECT} WHERE p.id = ? AND p.space_id = ?`).bind(id, spaceId).first<RawPlan>();
  if (!row) throw new RepoError("NOT_FOUND");
  return toRow(row);
}

/** 購入担当者に指定できるのは、いまのメンバーだけ（null＝みんな） */
async function assertMember(db: Db, spaceId: string, userId: string | null) {
  if (userId === null) return;
  const row = await db.$client
    .prepare("SELECT 1 AS ok FROM space_members WHERE space_id = ? AND user_id = ?")
    .bind(spaceId, userId)
    .first();
  if (!row) throw new RepoError("INVALID_REFERENCE");
}

export async function createPlan(db: Db, spaceId: string, userId: string, input: PlanInput) {
  await assertCategoryInSpace(db, spaceId, input.categoryId);
  await assertMember(db, spaceId, input.assigneeUserId);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.$client
    .prepare(
      `INSERT INTO purchase_plans (id, space_id, created_by, assignee_user_id, title, planned_amount, category_id, planned_date, memo, product_url, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned', ?, ?)`,
    )
    .bind(id, spaceId, userId, input.assigneeUserId, input.title, input.plannedAmount, input.categoryId, input.plannedDate, input.memo, input.productUrl, now, now)
    .run();
  return getPlan(db, spaceId, id);
}

/** 編集。購入済みでも、商品名・予定金額・日付などは直せる（実際の金額は支出の側で直す） */
export async function updatePlan(db: Db, spaceId: string, id: string, input: PlanInput) {
  await assertCategoryInSpace(db, spaceId, input.categoryId);
  await assertMember(db, spaceId, input.assigneeUserId);
  const res = await db.$client
    .prepare(
      `UPDATE purchase_plans SET title = ?, planned_amount = ?, category_id = ?, planned_date = ?, memo = ?, product_url = ?, assignee_user_id = ?, updated_at = ?
       WHERE id = ? AND space_id = ?`,
    )
    .bind(input.title, input.plannedAmount, input.categoryId, input.plannedDate, input.memo, input.productUrl, input.assigneeUserId, new Date().toISOString(), id, spaceId)
    .run();
  if (res.meta.changes === 0) throw new RepoError("NOT_FOUND");
  return getPlan(db, spaceId, id);
}

/** 状態が合わなかったときに、404（ない）と 409（状態がぶつかる）を見分ける */
async function conflictOrNotFound(db: Db, spaceId: string, id: string, alreadyCode: "ALREADY_PURCHASED" | "STATE_CONFLICT") {
  const row = await db.$client
    .prepare("SELECT status FROM purchase_plans WHERE id = ? AND space_id = ?")
    .bind(id, spaceId)
    .first<{ status: PlanStatus }>();
  if (!row) return new RepoError("NOT_FOUND");
  return new RepoError(row.status === "purchased" ? alreadyCode : "STATE_CONFLICT");
}

/**
 * 購入済みにする（指示書 7.4）。
 * 1) 未購入のときだけ購入済みにする 2) 購入済みになった予定があるときだけ支出を作る、を1回の batch で行う。
 * 2回目の送信は 2) が UNIQUE（1つの予定に支出は1つ）で失敗して全体が取り消され、409 になる。
 */
export async function purchasePlan(db: Db, spaceId: string, userId: string, id: string, input: { actualAmount: number; spentAt: string }) {
  const now = new Date().toISOString();
  const d1 = db.$client;
  let results: D1Result[];
  try {
    results = await d1.batch([
      d1
        .prepare("UPDATE purchase_plans SET status = 'purchased', updated_at = ? WHERE id = ? AND space_id = ? AND status = 'planned'")
        .bind(now, id, spaceId),
      d1
        .prepare(
          `INSERT INTO expenses (id, space_id, purchase_plan_id, recorded_by, title, actual_amount, category_id, spent_at, memo, created_at, updated_at)
           SELECT ?, space_id, id, ?, title, ?, category_id, ?, NULL, ?, ? FROM purchase_plans WHERE id = ? AND space_id = ? AND status = 'purchased'`,
        )
        .bind(crypto.randomUUID(), userId, input.actualAmount, input.spentAt, now, now, id, spaceId),
    ]);
  } catch (e) {
    throw fromConstraint(e) ?? e;
  }
  if (results[0]?.meta.changes !== 1) throw await conflictOrNotFound(db, spaceId, id, "ALREADY_PURCHASED");
  return getPlan(db, spaceId, id);
}

/** 未購入に戻す（指示書 7.5）。紐づく支出の削除と予定の更新を1回の batch で行う */
export async function unpurchasePlan(db: Db, spaceId: string, id: string) {
  const now = new Date().toISOString();
  const d1 = db.$client;
  const results = await d1.batch([
    d1
      .prepare(
        `DELETE FROM expenses WHERE purchase_plan_id = ? AND space_id = ?
           AND EXISTS (SELECT 1 FROM purchase_plans WHERE id = ? AND space_id = ? AND status = 'purchased')`,
      )
      .bind(id, spaceId, id, spaceId),
    d1
      .prepare("UPDATE purchase_plans SET status = 'planned', updated_at = ? WHERE id = ? AND space_id = ? AND status = 'purchased'")
      .bind(now, id, spaceId),
  ]);
  if (results[1]?.meta.changes !== 1) throw await conflictOrNotFound(db, spaceId, id, "STATE_CONFLICT");
  return getPlan(db, spaceId, id);
}

/** キャンセル（未購入のときだけ）／キャンセルから未購入に戻す */
export async function setPlanCanceled(db: Db, spaceId: string, id: string, canceled: boolean) {
  const [from, to] = canceled ? ["planned", "canceled"] : ["canceled", "planned"];
  const res = await db.$client
    .prepare("UPDATE purchase_plans SET status = ?, updated_at = ? WHERE id = ? AND space_id = ? AND status = ?")
    .bind(to, new Date().toISOString(), id, spaceId, from)
    .run();
  if (res.meta.changes !== 1) throw await conflictOrNotFound(db, spaceId, id, "STATE_CONFLICT");
  return getPlan(db, spaceId, id);
}

/** 削除。購入済みなら支出は残り、予定とのつながりだけが外れる（外部キーの ON DELETE SET NULL） */
export async function deletePlan(db: Db, spaceId: string, id: string) {
  const res = await db.$client.prepare("DELETE FROM purchase_plans WHERE id = ? AND space_id = ?").bind(id, spaceId).run();
  if (res.meta.changes === 0) throw new RepoError("NOT_FOUND");
}
