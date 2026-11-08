import type { Db } from "../db/client";
import { jstToday } from "../../shared/date/jst";
import { payloadSql } from "./expense-changes";

/*
 * COWEL との連携（COWEL の docs/superpowers/plans/2026-11-04-covow-sync.md の Task 4）。
 * 設定で出す8桁の番号（10分・1回限り）を COWEL が鍵に換える。鍵はそのスペースの「支出の変更の記録帳」を読むためだけに使う。
 * 番号も鍵もハッシュだけを保存し、平文はそれぞれ発行した応答でだけ返す。
 */
const CODE_TTL_MS = 10 * 60 * 1000;
const hash = async (value: string) =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)))].map((b) => b.toString(16).padStart(2, "0")).join("");
const randomDigits = () => [...crypto.getRandomValues(new Uint8Array(8))].map((b) => String(b % 10)).join("");
const randomKey = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/** 番号の交換は、同じ接続元から1日にこの回数まで（当て推量を防ぐ。数え方は体験版と同じ trial_quota） */
export const EXCHANGE_DAILY_LIMIT = 20;
/** 今日この接続元からの交換の回数を1つ増やし、上限以内なら true */
export async function countExchange(db: Db, ip: string) {
  const today = jstToday();
  const row = await db.$client
    .prepare("INSERT INTO trial_quota (key, day, count) VALUES (?, ?, 1) ON CONFLICT (key, day) DO UPDATE SET count = count + 1 RETURNING count")
    .bind(await hash(`sync-exchange:${today}:${ip}`), today)
    .first<{ count: number }>();
  return (row?.count ?? 0) <= EXCHANGE_DAILY_LIMIT;
}

/** 番号を発行する（その人のまだ使っていない番号は取り消す） */
export async function createLinkCode(db: Db, spaceId: string, userId: string) {
  const code = randomDigits(), expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString(), d1 = db.$client;
  await d1.batch([
    d1.prepare("DELETE FROM sync_link_codes WHERE user_id = ? AND used_at IS NULL").bind(userId),
    d1.prepare("INSERT INTO sync_link_codes (code_hash, space_id, user_id, expires_at) VALUES (?, ?, ?, ?)").bind(await hash(code), spaceId, userId, expiresAt),
  ]);
  return { code, expiresAt };
}

/** 番号を鍵に換える。番号は1回だけ。その人の前の鍵は失効させる（鍵は1人1本）。使えない番号なら null */
export async function exchangeLinkCode(db: Db, code: string) {
  const d1 = db.$client, now = new Date().toISOString();
  const used = await d1
    .prepare("UPDATE sync_link_codes SET used_at = ? WHERE code_hash = ? AND used_at IS NULL AND expires_at > ? RETURNING space_id AS spaceId, user_id AS userId")
    .bind(now, await hash(code), now)
    .first<{ spaceId: string; userId: string }>();
  if (!used) return null;
  const member = await d1
    .prepare("SELECT u.display_name AS displayName FROM space_members m JOIN users u ON u.id = m.user_id WHERE m.space_id = ? AND m.user_id = ?")
    .bind(used.spaceId, used.userId)
    .first<{ displayName: string }>();
  if (!member) return null;
  const key = randomKey();
  await d1.batch([
    d1.prepare("UPDATE sync_links SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL").bind(now, used.userId),
    d1.prepare("INSERT INTO sync_links (id, space_id, user_id, key_hash, created_at) VALUES (?, ?, ?, ?, ?)").bind(crypto.randomUUID(), used.spaceId, used.userId, await hash(key), now),
  ]);
  return { key, spaceId: used.spaceId, userId: used.userId, displayName: member.displayName };
}

/** 鍵からスペースを引く。失効した鍵・スペースを抜けた人の鍵は使えない */
export async function spaceForKey(db: Db, key: string): Promise<string | null> {
  if (!key) return null;
  const row = await db.$client
    .prepare(
      `SELECT l.space_id AS spaceId FROM sync_links l JOIN space_members m ON m.space_id = l.space_id AND m.user_id = l.user_id
       WHERE l.key_hash = ? AND l.revoked_at IS NULL`,
    )
    .bind(await hash(key))
    .first<{ spaceId: string }>();
  return row?.spaceId ?? null;
}

export async function revokeLink(db: Db, userId: string) {
  await db.$client.prepare("UPDATE sync_links SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL").bind(new Date().toISOString(), userId).run();
}
export async function linkStatus(db: Db, spaceId: string, userId: string) {
  const row = await db.$client.prepare("SELECT created_at AS linkedAt FROM sync_links WHERE space_id = ? AND user_id = ? AND revoked_at IS NULL").bind(spaceId, userId).first<{ linkedAt: string }>();
  return { linked: !!row, linkedAt: row?.linkedAt ?? null };
}

export async function linkMembers(db: Db, spaceId: string) {
  const rows = await db.$client
    .prepare(
      `SELECT u.id AS userId, u.display_name AS displayName,
         EXISTS (SELECT 1 FROM sync_links l WHERE l.space_id = m.space_id AND l.user_id = m.user_id AND l.revoked_at IS NULL) AS linked
       FROM space_members m JOIN users u ON u.id = m.user_id WHERE m.space_id = ? ORDER BY m.joined_at, u.id`,
    )
    .bind(spaceId)
    .all<{ userId: string; displayName: string; linked: number }>();
  return rows.results.map((r) => ({ userId: r.userId, displayName: r.displayName, linked: r.linked === 1 }));
}

type ChangeRow = { seq: number; expense_id: string; op: "upsert" | "delete"; payload: string | null };
export async function listChanges(db: Db, spaceId: string, after: number, limit: number) {
  const rows = (await db.$client
    .prepare("SELECT seq, expense_id, op, payload FROM expense_changes WHERE space_id = ? AND seq > ? ORDER BY seq LIMIT ?")
    .bind(spaceId, after, limit)
    .all<ChangeRow>()).results;
  return {
    changes: rows.map((r) => (r.op === "upsert" ? { seq: r.seq, op: r.op, expense: JSON.parse(r.payload!) as unknown } : { seq: r.seq, op: r.op, expenseId: r.expense_id })),
    next: rows.at(-1)?.seq ?? after,
  };
}

/** 初回用：from 以降の今の支出と、その時点の記録帳の最後の番号（同じ batch で読むので食い違わない） */
export async function snapshot(db: Db, spaceId: string, from: string) {
  const d1 = db.$client;
  const [expenses, last] = await d1.batch([
    d1.prepare(`SELECT ${payloadSql("c.name")} AS payload FROM expenses e LEFT JOIN categories c ON c.id = e.category_id WHERE e.space_id = ? AND e.spent_at >= ? ORDER BY e.spent_at, e.id`).bind(spaceId, from),
    d1.prepare("SELECT COALESCE(MAX(seq), 0) AS cursor FROM expense_changes WHERE space_id = ?").bind(spaceId),
  ]);
  return {
    expenses: (expenses!.results as { payload: string }[]).map((r) => JSON.parse(r.payload) as unknown),
    cursor: (last!.results[0] as { cursor: number }).cursor,
  };
}
