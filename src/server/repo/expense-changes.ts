/*
 * COWEL との連携の記録帳（migrations/0007）。支出を変える処理は、ここで作る文を本体の文と同じ d1.batch に入れる。
 * upsert は「変わった後の行」を SQL で読み直して書くので、本体の文より後ろに置く。delete は消す前（同じ batch の前の方）に置く。
 */
const payload = (categoryName: string) =>
  `json_object('id', e.id, 'actualAmount', e.actual_amount, 'spentAt', e.spent_at, 'title', e.title, 'categoryName', ${categoryName},` +
  ` 'payerUserId', e.payer_user_id, 'splitUserId', e.split_user_id, 'payerRatio', e.payer_ratio, 'recordedBy', e.recorded_by)`;

/** `where` に合う支出（別名 e）ごとに upsert を1行。dropCategory はカテゴリを消す直前に使う（消した後は名前が空になる）。 */
export function upsertChanges(d1: D1Database, where: string, binds: unknown[], opts: { dropCategory?: boolean } = {}) {
  return d1
    .prepare(
      `INSERT INTO expense_changes (space_id, expense_id, op, payload, created_at)
       SELECT e.space_id, e.id, 'upsert', ${payload(opts.dropCategory ? "NULL" : "c.name")}, ?
       FROM expenses e LEFT JOIN categories c ON c.id = e.category_id WHERE ${where} ORDER BY e.spent_at, e.id`,
    )
    .bind(new Date().toISOString(), ...binds);
}

/** `where` に合う支出（別名 e）ごとに delete を1行。支出を消す文より前に置く。 */
export function deleteChanges(d1: D1Database, where: string, binds: unknown[]) {
  return d1
    .prepare(`INSERT INTO expense_changes (space_id, expense_id, op, payload, created_at) SELECT e.space_id, e.id, 'delete', NULL, ? FROM expenses e WHERE ${where}`)
    .bind(new Date().toISOString(), ...binds);
}
