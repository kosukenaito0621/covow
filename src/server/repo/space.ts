import { and, asc, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { DEFAULT_CATEGORIES, INVITE_TTL_HOURS, MAX_SPACE_MEMBERS } from "../../shared/constants";
import type { Locale } from "../../shared/i18n";
import { randomToken, sha256Hex } from "../auth/tokens";
import type { Db } from "../db/client";
import { invites, spaceMembers, spaces, users } from "../db/schema";
import { fromConstraint, RepoError } from "./errors";

/*
 * スペースとメンバー・招待の読み書き。権限の確認は require-member.ts とこのファイル（repo/）だけで行う。
 * 「誰がどのスペースの何を変えてよいか」は、すべて SQL の WHERE に space_id と本人を入れて守る。
 * 同時に操作されても壊れないよう、条件つきの更新と DB の制約（1人1スペースの UNIQUE・4人上限のトリガー）に頼る。
 */

const nowIso = () => new Date().toISOString();

/** 本人が入っているスペース（なければ null） */
export async function findMembership(db: Db, userId: string) {
  return (
    (await db
      .select({ spaceId: spaceMembers.spaceId, role: spaceMembers.role })
      .from(spaceMembers)
      .where(eq(spaceMembers.userId, userId))
      .get()) ?? null
  );
}

/** スペースを作り、作った人を最初のメンバーにして、初期カテゴリを入れる（全部まとめて成功か失敗） */
export async function createSpace(db: Db, input: { userId: string; name: string; locale: Locale }) {
  const now = nowIso();
  const spaceId = crypto.randomUUID();
  const d1 = db.$client;
  const statements = [
    d1.prepare("INSERT INTO spaces (id, name, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").bind(spaceId, input.name, input.userId, now, now),
    // すでにどこかのスペースにいれば、UNIQUE（1人1スペース）で失敗し、スペースごと取り消される
    d1.prepare("INSERT INTO space_members (space_id, user_id, role, joined_at) VALUES (?, ?, 'owner', ?)").bind(spaceId, input.userId, now),
    ...DEFAULT_CATEGORIES[input.locale].map((name, i) =>
      d1
        .prepare("INSERT INTO categories (id, space_id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(crypto.randomUUID(), spaceId, name, i, now, now),
    ),
  ];
  try {
    await d1.batch(statements);
  } catch (e) {
    throw fromConstraint(e) ?? e;
  }
  return { id: spaceId, name: input.name };
}

/** スペース名とメンバー（参加した順） */
export async function getSpace(db: Db, spaceId: string) {
  const space = await db.select({ id: spaces.id, name: spaces.name }).from(spaces).where(eq(spaces.id, spaceId)).get();
  if (!space) throw new RepoError("NOT_FOUND");
  const members = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      role: spaceMembers.role,
      joinedAt: spaceMembers.joinedAt,
    })
    .from(spaceMembers)
    .innerJoin(users, eq(users.id, spaceMembers.userId))
    .where(eq(spaceMembers.spaceId, spaceId))
    // 参加した順。同じ時刻なら作った人（owner）を先に、そのあとは ID の順で、いつも同じ並びにする
    .orderBy(asc(spaceMembers.joinedAt), sql`${spaceMembers.role} != 'owner'`, asc(users.id))
    .all();
  return { ...space, members, maxMembers: MAX_SPACE_MEMBERS };
}

export async function renameSpace(db: Db, spaceId: string, name: string) {
  await db.update(spaces).set({ name, updatedAt: nowIso() }).where(eq(spaces.id, spaceId));
}

/** ほかのメンバーを外す。自分は「抜ける」を使う。同じスペースのメンバーでなければ 404（いるかどうかも教えない） */
export async function removeMember(db: Db, spaceId: string, actorId: string, targetId: string) {
  if (targetId === actorId) throw new RepoError("CANNOT_REMOVE_SELF");
  const res = await db.$client
    .prepare("DELETE FROM space_members WHERE space_id = ? AND user_id = ?")
    .bind(spaceId, targetId)
    .run();
  if (res.meta.changes === 0) throw new RepoError("NOT_FOUND");
}

/**
 * スペースから抜ける。最後の1人は抜けられない（データを消すことになるため。v1 の決定）。
 * 2人が同時に抜けても0人にならないよう、「ほかにメンバーがいるとき」を DELETE の条件に入れる。
 */
export async function leaveSpace(db: Db, spaceId: string, userId: string) {
  const res = await db.$client
    .prepare(
      `DELETE FROM space_members WHERE space_id = ? AND user_id = ?
         AND (SELECT COUNT(*) FROM space_members WHERE space_id = ?) > 1`,
    )
    .bind(spaceId, userId, spaceId)
    .run();
  if (res.meta.changes === 0) throw new RepoError("LAST_MEMBER");
}

const memberCount = async (db: Db, spaceId: string) =>
  (await db.select({ userId: spaceMembers.userId }).from(spaceMembers).where(eq(spaceMembers.spaceId, spaceId)).all()).length;

/** 有効な招待（使われておらず、取り消されておらず、期限内）のうち新しいもの */
export async function getActiveInvite(db: Db, spaceId: string, now = nowIso()) {
  return (
    (await db
      .select({ id: invites.id, expiresAt: invites.expiresAt, createdAt: invites.createdAt })
      .from(invites)
      .where(and(eq(invites.spaceId, spaceId), isNull(invites.usedAt), isNull(invites.revokedAt), gt(invites.expiresAt, now)))
      .orderBy(desc(invites.createdAt))
      .get()) ?? null
  );
}

/**
 * 招待リンクを発行する。前のリンクは取り消す（有効なリンクはいつも1本）。
 * トークンは DB にはハッシュだけを入れ、そのものはこの戻り値でだけ渡す。
 */
export async function createInvite(db: Db, spaceId: string, userId: string) {
  if ((await memberCount(db, spaceId)) >= MAX_SPACE_MEMBERS) throw new RepoError("SPACE_FULL");
  const now = new Date();
  const token = randomToken();
  const expiresAt = new Date(now.getTime() + INVITE_TTL_HOURS * 60 * 60 * 1000).toISOString();
  const d1 = db.$client;
  await d1.batch([
    d1
      .prepare("UPDATE invites SET revoked_at = ? WHERE space_id = ? AND used_at IS NULL AND revoked_at IS NULL")
      .bind(now.toISOString(), spaceId),
    d1
      .prepare("INSERT INTO invites (id, space_id, token_hash, created_by, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), spaceId, await sha256Hex(token), userId, expiresAt, now.toISOString()),
  ]);
  return { token, expiresAt };
}

export async function revokeInvites(db: Db, spaceId: string) {
  await db
    .update(invites)
    .set({ revokedAt: nowIso() })
    .where(and(eq(invites.spaceId, spaceId), isNull(invites.usedAt), isNull(invites.revokedAt)));
}

export type InviteStatus = "valid" | "expired" | "used" | "revoked" | "full";

/** 招待リンクの中身（ログイン前でも見られる）。見せるのはスペース名と招待した人の表示名だけ */
export async function peekInvite(db: Db, token: string, now = nowIso()) {
  const row = await db
    .select({
      id: invites.id,
      spaceId: invites.spaceId,
      expiresAt: invites.expiresAt,
      usedAt: invites.usedAt,
      revokedAt: invites.revokedAt,
      spaceName: spaces.name,
      inviterName: users.displayName,
    })
    .from(invites)
    .innerJoin(spaces, eq(spaces.id, invites.spaceId))
    .innerJoin(users, eq(users.id, invites.createdBy))
    .where(eq(invites.tokenHash, await sha256Hex(token)))
    .get();
  if (!row) throw new RepoError("INVITE_NOT_FOUND");
  let status: InviteStatus = "valid";
  if (row.revokedAt) status = "revoked";
  else if (row.usedAt) status = "used";
  else if (row.expiresAt <= now) status = "expired";
  else if ((await memberCount(db, row.spaceId)) >= MAX_SPACE_MEMBERS) status = "full";
  return { ...row, status };
}

const STATUS_ERROR = { expired: "INVITE_EXPIRED", used: "INVITE_USED", revoked: "INVITE_REVOKED", full: "SPACE_FULL" } as const;

/**
 * 招待を受けてスペースに入る。
 * 1. 招待を「使用済み」にする（まだ使われていない・期限内のときだけ）
 * 2. 1で自分が使用済みにできたときだけ、メンバーに加える
 * をまとめて行う。同じリンクで2人が同時に参加しても、入れるのは1人だけ。
 * 満員（4人）ならトリガーで、すでに別のスペースにいれば UNIQUE で失敗し、1も取り消される。
 */
export async function acceptInvite(db: Db, token: string, userId: string) {
  const invite = await peekInvite(db, token);
  if (invite.status !== "valid") throw new RepoError(STATUS_ERROR[invite.status]);
  if (await findMembership(db, userId)) throw new RepoError("ALREADY_IN_SPACE");
  const now = nowIso();
  const d1 = db.$client;
  let results: D1Result[];
  try {
    results = await d1.batch([
      d1
        .prepare(
          "UPDATE invites SET used_at = ?, used_by = ? WHERE id = ? AND used_at IS NULL AND revoked_at IS NULL AND expires_at > ?",
        )
        .bind(now, userId, invite.id, now),
      d1
        .prepare(
          `INSERT INTO space_members (space_id, user_id, role, joined_at)
           SELECT ?, ?, 'member', ? WHERE EXISTS (SELECT 1 FROM invites WHERE id = ? AND used_by = ? AND used_at = ?)`,
        )
        .bind(invite.spaceId, userId, now, invite.id, userId, now),
    ]);
  } catch (e) {
    throw fromConstraint(e) ?? e;
  }
  // 0件＝ほかの人が先に使った・その間に取り消された
  if (results[1]?.meta.changes !== 1) throw new RepoError("INVITE_USED");
  return { id: invite.spaceId, name: invite.spaceName };
}
