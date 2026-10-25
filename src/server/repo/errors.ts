/**
 * 画面に返すエラーの種類。画面はこのコードを見て、言語に合わせた文を出す。
 * status は HTTP の状態コード（404＝ない・見えない、409＝状態がぶつかる、410＝もう使えない）。
 */
export type ErrorCode =
  | "NOT_FOUND"
  | "NO_SPACE"
  | "ALREADY_IN_SPACE"
  | "SPACE_FULL"
  | "LAST_MEMBER"
  | "CANNOT_REMOVE_SELF"
  | "INVITE_NOT_FOUND"
  | "INVITE_EXPIRED"
  | "INVITE_USED"
  | "INVITE_REVOKED"
  | "CATEGORY_EXISTS"
  | "INVALID_REFERENCE"
  | "INVALID_ORDER"
  | "ALREADY_PURCHASED"
  | "STATE_CONFLICT"
  | "FROM_PLAN";

const STATUS: Record<ErrorCode, 403 | 404 | 409 | 410 | 422> = {
  NOT_FOUND: 404,
  NO_SPACE: 403,
  ALREADY_IN_SPACE: 409,
  SPACE_FULL: 409,
  LAST_MEMBER: 409,
  CANNOT_REMOVE_SELF: 409,
  INVITE_NOT_FOUND: 404,
  INVITE_EXPIRED: 410,
  INVITE_USED: 410,
  INVITE_REVOKED: 410,
  // 同じ名前のカテゴリがすでにある
  CATEGORY_EXISTS: 409,
  // 別のスペースのカテゴリ・メンバーでない人を指定した
  INVALID_REFERENCE: 422,
  // 並べ替えの ID がスペースのカテゴリとそろっていない
  INVALID_ORDER: 422,
  ALREADY_PURCHASED: 409,
  // いまの状態ではできない操作（キャンセル済みを購入済みにする、など）
  STATE_CONFLICT: 409,
  // 予定から作られた支出は、支出一覧からは消せない（予定の詳細で「未購入に戻す」）
  FROM_PLAN: 409,
};

export class RepoError extends Error {
  readonly status: 403 | 404 | 409 | 410 | 422;
  constructor(readonly code: ErrorCode) {
    super(code);
    this.name = "RepoError";
    this.status = STATUS[code];
  }
}

/** D1 の制約違反（トリガーの RAISE・UNIQUE）を、画面に返すエラーの種類に直す */
export function fromConstraint(e: unknown): RepoError | null {
  const msg = e instanceof Error ? `${e.message} ${String((e as { cause?: unknown }).cause ?? "")}` : String(e);
  if (msg.includes("SPACE_FULL")) return new RepoError("SPACE_FULL");
  if (/UNIQUE constraint failed: space_members\.user_id/.test(msg)) return new RepoError("ALREADY_IN_SPACE");
  if (/UNIQUE constraint failed: categories\.space_id, categories\.name/.test(msg)) return new RepoError("CATEGORY_EXISTS");
  // 1つの予定に支出は1つ（2回目の「購入済みにする」）
  if (/UNIQUE constraint failed: expenses\.purchase_plan_id/.test(msg)) return new RepoError("ALREADY_PURCHASED");
  return null;
}
