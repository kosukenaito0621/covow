#!/usr/bin/env node
/*
 * 旧アプリ（僕らの宣言帳）の CSV を、COVOW のスペースに入れるための SQL を作る。
 * 実データはリポジトリに入れない：CSV はパソコンの中から読み、作った SQL もリポジトリの外に書き出す。
 *
 * 使い方：
 *   node scripts/import-legacy.mjs <CSVのパス> <出力するSQLのパス> 宣言者名=メールアドレス [宣言者名=メールアドレス ...]
 *   例）node scripts/import-legacy.mjs ~/Downloads/宣言データ.csv /tmp/import.sql Aoi=a@example.com Haru=b@example.com
 *   そのあと：npx wrangler d1 execute DB --local --file /tmp/import.sql（本番は --remote --env production。必ず許可を取ってから）
 *
 * 入れ方（2026-10-26 に決めた方針）：
 * - 入れる先は、最初に指定した人のスペース。ほかの人も同じスペースのメンバーでないと、何も入らない（SQL の条件で守る）
 * - 「宣言中」→ 未購入の予定。「購入済」→ 購入済みの予定＋支出（実際の金額は予定金額と同じ。買った日は予定日、空なら登録日）
 * - カテゴリは旧アプリと同じ名前。スペースになければ足す
 * - ID は旧アプリの ID から作るので、同じ CSV を2回入れても二重にならない（INSERT OR IGNORE）
 */
import { readFileSync, writeFileSync } from "node:fs";

const [csvPath, outPath, ...pairs] = process.argv.slice(2);
if (!csvPath || !outPath || pairs.length === 0) {
  console.error("使い方：node scripts/import-legacy.mjs <CSV> <出力SQL> 宣言者名=メールアドレス ...");
  process.exit(1);
}
const people = new Map(
  pairs.map((p) => {
    const i = p.indexOf("=");
    return [p.slice(0, i), p.slice(i + 1)];
  }),
);
const owner = pairs[0].slice(0, pairs[0].indexOf("="));

/** CSV を読む（ダブルクォートの中のカンマ・改行・"" に対応） */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cur);
      cur = "";
    } else if (c === "\n") {
      row.push(cur.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cur = "";
    } else cur += c;
  }
  if (cur || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x !== ""));
}

const [header, ...data] = parseCsv(readFileSync(csvPath, "utf8").replace(new RegExp("^" + String.fromCharCode(0xfeff)), ""));
const col = (name) => {
  const i = header.indexOf(name);
  if (i < 0) throw new Error(`列が見つかりません：${name}`);
  return i;
};
const C = {
  id: col("ID"),
  who: col("宣言者"),
  title: col("品名"),
  amount: col("予定金額（円）"),
  date: col("購入予定日"),
  category: col("カテゴリ"),
  status: col("状態"),
  memo: col("メモ・購入理由"),
  created: col("登録日時"),
  updated: col("更新日時"),
};

const q = (v) => (v === null ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
/** "2026-10-01 14:31:01 UTC" → ISO 8601 */
const iso = (s) => new Date(s.replace(" UTC", "Z").replace(" ", "T")).toISOString();
/** 日本時間の日付（YYYY-MM-DD） */
const jstDate = (isoStr) => new Date(new Date(isoStr).getTime() + 9 * 3600_000).toISOString().slice(0, 10);

const STATUS = { 宣言中: "planned", 購入済: "purchased" };
const errors = [];
for (const r of data) {
  if (!people.has(r[C.who])) errors.push(`宣言者「${r[C.who]}」のメールアドレスが指定されていません（ID ${r[C.id]}）`);
  if (!STATUS[r[C.status]]) errors.push(`状態「${r[C.status]}」は扱えません（ID ${r[C.id]}）`);
  const a = Number(r[C.amount]);
  if (!Number.isInteger(a) || a < 1 || a > 99_999_999) errors.push(`金額が範囲外です（ID ${r[C.id]}）`);
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

// スペース：最初に指定した人のスペース
const space = `(SELECT m.space_id FROM space_members m JOIN users u ON u.id = m.user_id WHERE u.email = ${q(people.get(owner))})`;
// 指定した人が全員そのスペースのメンバーのときだけ入れる
const guard = `(SELECT COUNT(*) FROM space_members m JOIN users u ON u.id = m.user_id WHERE m.space_id = ${space} AND u.email IN (${[...people.values()].map(q).join(", ")})) = ${people.size}`;
const userOf = (who) => `(SELECT u.id FROM users u JOIN space_members m ON m.user_id = u.id WHERE u.email = ${q(people.get(who))} AND m.space_id = ${space})`;
const categoryOf = (name) => `(SELECT id FROM categories WHERE space_id = ${space} AND name = ${q(name)})`;

const now = new Date().toISOString();
const out = [`-- 旧アプリからの移行（${data.length}件）。作成：${now}`];

// カテゴリ（なければ最後に足す）
for (const name of [...new Set(data.map((r) => r[C.category]).filter(Boolean))]) {
  out.push(
    `INSERT OR IGNORE INTO categories (id, space_id, name, sort_order, created_at, updated_at)
SELECT ${q(crypto.randomUUID())}, ${space}, ${q(name)}, (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM categories WHERE space_id = ${space}), ${q(now)}, ${q(now)}
WHERE ${guard};`,
  );
}

let planned = 0;
let purchased = 0;
let total = 0;
for (const r of data) {
  const status = STATUS[r[C.status]];
  const created = iso(r[C.created]);
  const updated = r[C.updated] ? iso(r[C.updated]) : created;
  const date = r[C.date] || null;
  const amount = Number(r[C.amount]);
  const memo = r[C.memo] || null;
  const cat = r[C.category] ? categoryOf(r[C.category]) : "NULL";
  out.push(
    `INSERT OR IGNORE INTO purchase_plans (id, space_id, created_by, assignee_user_id, title, planned_amount, category_id, planned_date, memo, product_url, status, payer_user_id, created_at, updated_at)
SELECT ${q(`legacy-plan-${r[C.id]}`)}, ${space}, ${userOf(r[C.who])}, NULL, ${q(r[C.title])}, ${amount}, ${cat}, ${q(date)}, ${q(memo)}, NULL, ${q(status)}, ${userOf(r[C.who])}, ${q(created)}, ${q(updated)}
WHERE ${guard};`,
  );
  if (status === "purchased") {
    // 旧アプリには実際の金額がないので、予定金額と同じにする。買った日は予定日、なければ登録日（日本時間）
    out.push(
      `INSERT OR IGNORE INTO expenses (id, space_id, purchase_plan_id, recorded_by, title, actual_amount, category_id, spent_at, memo, payer_user_id, created_at, updated_at)
SELECT ${q(`legacy-exp-${r[C.id]}`)}, ${space}, ${q(`legacy-plan-${r[C.id]}`)}, ${userOf(r[C.who])}, ${q(r[C.title])}, ${amount}, ${cat}, ${q(date ?? jstDate(created))}, NULL, ${userOf(r[C.who])}, ${q(updated)}, ${q(updated)}
WHERE ${guard} AND EXISTS (SELECT 1 FROM purchase_plans WHERE id = ${q(`legacy-plan-${r[C.id]}`)});`,
    );
    purchased++;
    total += amount;
  } else planned++;
}

writeFileSync(outPath, out.join("\n\n") + "\n");
// 件数と合計だけを表示する（品名などの中身は出さない）
// eslint-disable-next-line no-console -- コマンドの結果として表示する
console.log(`予定 ${data.length}件（未購入 ${planned}・購入済み ${purchased}）、購入済みの合計 ${total.toLocaleString("ja-JP")}円 → ${outPath}`);
