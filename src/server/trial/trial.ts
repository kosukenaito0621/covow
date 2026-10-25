import { jstToday } from "../../shared/date/jst";
import type { Locale } from "../../shared/i18n";
import type { ThemeId } from "../../shared/theme";
import { randomToken, sha256Hex } from "../auth/tokens";
import type { Db } from "../db/client";
import { PARTNER_VISIT_PLAN, partnerVisitDate, SAMPLE_NAMES, sampleStatements } from "./sample";

/*
 * 体験版（ログインせずに試す）。
 * - 24時間だけ使える仮のアカウント（あなた）と、メンバー役（はる）、見本のスペースを1回の batch で作る
 * - 作れる回数は IP ごと・1日ごとに上限あり（IP そのものは保存せず、日付つきのハッシュだけ）
 * - 期限が過ぎたら、毎日の定期処理（purgeExpiredGuests）でスペースごと消す
 */

export const TRIAL_HOURS = 24;
export const TRIAL_DAILY_LIMIT = 5;

export class TrialLimitError extends Error {
  constructor() {
    super("TRIAL_LIMIT");
    this.name = "TrialLimitError";
  }
}

/** 今日この IP から作った回数を1つ増やす。上限を超えていれば TrialLimitError */
async function countTrial(db: Db, ip: string, today: string) {
  const key = await sha256Hex(`${today}:${ip}`);
  const row = await db.$client
    .prepare(
      `INSERT INTO trial_quota (key, day, count) VALUES (?, ?, 1)
       ON CONFLICT (key, day) DO UPDATE SET count = count + 1
       RETURNING count`,
    )
    .bind(key, today)
    .first<{ count: number }>();
  if ((row?.count ?? 0) > TRIAL_DAILY_LIMIT) throw new TrialLimitError();
}

/** 体験版を作り、ログインの Cookie に入れるトークンを返す */
export async function createTrial(db: Db, input: { ip: string; locale: Locale; theme: ThemeId }) {
  const now = new Date();
  const nowIso = now.toISOString();
  const today = jstToday(now);
  await countTrial(db, input.ip, today);

  const expiresAt = new Date(now.getTime() + TRIAL_HOURS * 60 * 60 * 1000).toISOString();
  const youId = crypto.randomUUID();
  const partnerId = crypto.randomUUID();
  const spaceId = crypto.randomUUID();
  const token = randomToken();
  const d1 = db.$client;
  const user = (id: string, name: string) =>
    d1
      .prepare(
        `INSERT INTO users (id, google_sub, email, display_name, avatar_url, locale, theme, is_guest, guest_expires_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, ?, ?, 1, ?, ?, ?)`,
      )
      // 仮のアカウントなので、Google の ID とメールアドレスは使えない形の値にする
      .bind(id, `guest:${id}`, `${id}@guest.invalid`, name, input.locale, input.theme, expiresAt, nowIso, nowIso);

  await d1.batch([
    user(youId, SAMPLE_NAMES.you[input.locale]),
    user(partnerId, SAMPLE_NAMES.partner[input.locale]),
    d1
      .prepare("INSERT INTO spaces (id, name, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
      .bind(spaceId, SAMPLE_NAMES.space[input.locale], youId, nowIso, nowIso),
    d1.prepare("INSERT INTO space_members (space_id, user_id, role, joined_at) VALUES (?, ?, 'owner', ?)").bind(spaceId, youId, nowIso),
    d1.prepare("INSERT INTO space_members (space_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)").bind(spaceId, partnerId, nowIso),
    ...sampleStatements({ d1, locale: input.locale, today, now: nowIso, youId, partnerId, spaceId }),
    // ログインのしるし（期限は体験版と同じ24時間。延長しない）
    d1
      .prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)")
      .bind(await sha256Hex(token), youId, expiresAt, nowIso),
  ]);
  return { token, expiresAt };
}

/** 「メンバー役を呼ぶ」：はるさんが予定を1つ追加しに来る（伴走ガイドの「一緒に使いましょう」用） */
export async function partnerVisit(db: Db, input: { spaceId: string; youId: string; locale: Locale }) {
  const d1 = db.$client;
  const partner = await d1
    .prepare(
      `SELECT u.id FROM space_members m JOIN users u ON u.id = m.user_id
       WHERE m.space_id = ? AND u.id != ? AND u.is_guest = 1 LIMIT 1`,
    )
    .bind(input.spaceId, input.youId)
    .first<{ id: string }>();
  if (!partner) return null;
  const cat = await d1
    .prepare("SELECT id FROM categories WHERE space_id = ? ORDER BY sort_order LIMIT 1 OFFSET ?")
    .bind(input.spaceId, PARTNER_VISIT_PLAN.cat)
    .first<{ id: string }>();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await d1
    .prepare(
      `INSERT INTO purchase_plans (id, space_id, created_by, assignee_user_id, title, planned_amount, category_id, planned_date, memo, product_url, status, created_at, updated_at)
       VALUES (?, ?, ?, NULL, ?, ?, ?, ?, NULL, NULL, 'planned', ?, ?)`,
    )
    .bind(id, input.spaceId, partner.id, PARTNER_VISIT_PLAN.text[input.locale], PARTNER_VISIT_PLAN.amount, cat?.id ?? null, partnerVisitDate(jstToday()), now, now)
    .run();
  return { id };
}

/**
 * 期限の過ぎた体験版を消す（毎日の定期処理）。
 * 先にスペースを消すと、予定・支出・カテゴリ・予算・メンバー・招待も一緒に消える（外部キーの ON DELETE CASCADE）。
 * そのあと仮のアカウントを消すと、ログインのしるしも消える。古い回数の記録も片付ける。
 */
export async function purgeExpiredGuests(db: Db, now = new Date()) {
  const nowIso = now.toISOString();
  const d1 = db.$client;
  const results = await d1.batch([
    d1
      .prepare(
        `DELETE FROM spaces WHERE created_by IN (
           SELECT id FROM users WHERE is_guest = 1 AND guest_expires_at <= ?)`,
      )
      .bind(nowIso),
    d1.prepare("DELETE FROM users WHERE is_guest = 1 AND guest_expires_at <= ?").bind(nowIso),
    d1.prepare("DELETE FROM trial_quota WHERE day < ?").bind(jstToday(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000))),
  ]);
  return { spaces: results[0]?.meta.changes ?? 0, users: results[1]?.meta.changes ?? 0 };
}
