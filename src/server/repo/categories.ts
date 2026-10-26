import { and, asc, eq, sql } from "drizzle-orm";
import { presetRenames } from "../../shared/constants";
import type { BaseLocale } from "../../shared/i18n";
import type { Db } from "../db/client";
import { categories, expenses, purchasePlans } from "../db/schema";
import { fromConstraint, RepoError } from "./errors";

/*
 * カテゴリ。どの操作も WHERE に space_id を入れ、ほかのスペースのカテゴリは「ない」ものとして扱う（404）。
 */

const nowIso = () => new Date().toISOString();

export const listCategories = (db: Db, spaceId: string) =>
  db
    .select({ id: categories.id, name: categories.name, sortOrder: categories.sortOrder })
    .from(categories)
    .where(eq(categories.spaceId, spaceId))
    .orderBy(asc(categories.sortOrder), asc(categories.createdAt))
    .all();

/** このスペースのカテゴリか（予定・支出に付けるときの確認）。null（未分類）は常に OK */
export async function assertCategoryInSpace(db: Db, spaceId: string, categoryId: string | null) {
  if (categoryId === null) return;
  const row = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.spaceId, spaceId)))
    .get();
  if (!row) throw new RepoError("INVALID_REFERENCE");
}

export async function createCategory(db: Db, spaceId: string, name: string) {
  const now = nowIso();
  const id = crypto.randomUUID();
  // 並び順は最後（いまの最大＋1）
  try {
    await db.$client
      .prepare(
        `INSERT INTO categories (id, space_id, name, sort_order, created_at, updated_at)
         SELECT ?, ?, ?, COALESCE(MAX(sort_order), -1) + 1, ?, ? FROM categories WHERE space_id = ?`,
      )
      .bind(id, spaceId, name, now, now, spaceId)
      .run();
  } catch (e) {
    throw fromConstraint(e) ?? e;
  }
  return { id, name };
}

export async function renameCategory(db: Db, spaceId: string, id: string, name: string) {
  let changed: number;
  try {
    const res = await db.$client
      .prepare("UPDATE categories SET name = ?, updated_at = ? WHERE id = ? AND space_id = ?")
      .bind(name, nowIso(), id, spaceId)
      .run();
    changed = res.meta.changes;
  } catch (e) {
    throw fromConstraint(e) ?? e;
  }
  if (changed === 0) throw new RepoError("NOT_FOUND");
}

/**
 * 初期カテゴリのままの名前を、指定した言語の名前にそろえる（自分で付けた名前はそのまま）。
 * 英語で始めたあとに日本語へ切り替えた人向け。名前だけを変えるので、予定・支出のカテゴリはそのまま。変えた数を返す。
 */
export async function localizePresetCategories(db: Db, spaceId: string, to: BaseLocale): Promise<number> {
  const renames = presetRenames((await listCategories(db, spaceId)).map((c) => c.name), to);
  if (renames.length === 0) return 0;
  const now = nowIso();
  const d1 = db.$client;
  // 読んだあとに名前が変わっていたら、その行は変えない（WHERE name = 元の名前）
  const results = await d1.batch(
    renames.map((r) => d1.prepare("UPDATE categories SET name = ?, updated_at = ? WHERE space_id = ? AND name = ?").bind(r.to, now, spaceId, r.from)),
  );
  return results.reduce((a, r) => a + r.meta.changes, 0);
}

/** 並べ替え。送られた ID がこのスペースのカテゴリとちょうど同じ集まりのときだけ受け付ける */
export async function reorderCategories(db: Db, spaceId: string, ids: readonly string[]) {
  const current = await listCategories(db, spaceId);
  const same = ids.length === current.length && new Set(ids).size === ids.length && current.every((c) => ids.includes(c.id));
  if (!same) throw new RepoError("INVALID_ORDER");
  const now = nowIso();
  const d1 = db.$client;
  await d1.batch(
    ids.map((id, i) =>
      d1.prepare("UPDATE categories SET sort_order = ?, updated_at = ? WHERE id = ? AND space_id = ?").bind(i, now, id, spaceId),
    ),
  );
}

/** 削除の前に見せる件数（このカテゴリを使っている予定・支出） */
export async function categoryUsage(db: Db, spaceId: string, id: string) {
  const exists = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.spaceId, spaceId)))
    .get();
  if (!exists) throw new RepoError("NOT_FOUND");
  const [plans, exps] = await Promise.all([
    db
      .select({ n: sql<number>`COUNT(*)` })
      .from(purchasePlans)
      .where(and(eq(purchasePlans.spaceId, spaceId), eq(purchasePlans.categoryId, id)))
      .get(),
    db
      .select({ n: sql<number>`COUNT(*)` })
      .from(expenses)
      .where(and(eq(expenses.spaceId, spaceId), eq(expenses.categoryId, id)))
      .get(),
  ]);
  return { plans: plans?.n ?? 0, expenses: exps?.n ?? 0 };
}

/** 削除。使っていた予定・支出は「未分類」になる（外部キーの ON DELETE SET NULL） */
export async function deleteCategory(db: Db, spaceId: string, id: string) {
  const res = await db.$client.prepare("DELETE FROM categories WHERE id = ? AND space_id = ?").bind(id, spaceId).run();
  if (res.meta.changes === 0) throw new RepoError("NOT_FOUND");
}
