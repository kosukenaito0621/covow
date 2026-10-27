import type { Split } from "../../shared/money/split";
import type { SplitInput } from "../../shared/schemas";
import type { Db } from "../db/client";
import { RepoError } from "./errors";

/*
 * メンバーの確認（予定の担当・割り勘の払う人と相手・表示する人の指定）。どれも、このスペースのいまのメンバーだけを受け付ける。
 */

const isMember = async (db: Db, spaceId: string, userId: string) =>
  !!(await db.$client.prepare("SELECT 1 AS ok FROM space_members WHERE space_id = ? AND user_id = ?").bind(spaceId, userId).first());

/** 指定した人がいまのメンバーでなければ 422（null は何もしない） */
export async function assertMember(db: Db, spaceId: string, userId: string | null) {
  if (userId !== null && !(await isMember(db, spaceId, userId))) throw new RepoError("INVALID_REFERENCE");
}

/**
 * 入力の割り勘を決める。base は省いたときの値（作るときは「登録した人が 100%」、直すときは今の値）。
 * 払う人・相手はいまのメンバーで、同じ人ではないこと。
 */
export async function resolveSplit(db: Db, spaceId: string, input: SplitInput, base: Split): Promise<Split> {
  if (input.payerUserId === undefined && input.splitUserId === undefined && input.payerRatio === undefined) return base;
  const split: Split = {
    payerUserId: input.payerUserId ?? base.payerUserId,
    splitUserId: input.splitUserId ?? null,
    payerRatio: input.payerRatio ?? 100,
  };
  if (split.splitUserId === split.payerUserId) throw new RepoError("INVALID_REFERENCE");
  await assertMember(db, spaceId, split.payerUserId);
  await assertMember(db, spaceId, split.splitUserId);
  return split;
}

/** 表示する人（?user=）。省けば自分。同じスペースのメンバーでなければ 404 */
export async function resolveViewUser(db: Db, spaceId: string, me: string, query: string | undefined): Promise<string> {
  if (!query || query === me) return me;
  if (!(await isMember(db, spaceId, query))) throw new RepoError("NOT_FOUND");
  return query;
}
