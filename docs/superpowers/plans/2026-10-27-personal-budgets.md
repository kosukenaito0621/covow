# 人ごとの予算と割り勘 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 予算を人ごとにし、予定・支出を割合（10%きざみ・初期 5:5）で2人に分け、ホーム・分析・一覧を人ごとに見られるようにする。

**Architecture:** 予定・支出に `payer_user_id`・`split_user_id`・`payer_ratio` を足し、予算を「スペース×人×月」にする。集計は「その人の分の金額に置き換えた予定・支出の一覧」を作り（`forUser`）、今の `summarizeMonth` などの関数にそのまま渡す。画面は検索パラメータ `user` で表示する人を切り替える。

**Tech Stack:** Cloudflare Workers + D1、Hono、Zod 4、React 19 + TanStack Router/Query、Vitest（workers / unit）。

**Spec:** `docs/superpowers/specs/2026-10-27-personal-budgets-design.md`

## Global Constraints

- 割合は 10〜100 の 10 きざみ。分けない ⇔ 100。払う人 ≠ 分ける相手。
- 端数の 1円は割合の大きい人へ、同じなら払う人へ。2人の合計は元の金額と一致する。
- お金の計算は `src/shared/money/` だけ。権限は `require-member.ts` と `repo/` だけで守る。
- 予算を変えられるのは本人だけ（相手の予算の PUT は 403 `FORBIDDEN`）。見るのは同じスペースのメンバーなら可。
- 今あるデータは「登録した人が 100%」。今の予算はメンバー全員に同じ金額でコピー。
- 本番の移行とデプロイは、オーナーの許可を取ってから。
- 画面の文言は en / ja の辞書に足す（Mix は en の骨子）。

## Review Focus

- 割り勘の相手がスペースを抜けたあと：記録は残り、集計は「元メンバー」の分として扱われる（エラーにならない）→ Task 4 のテスト。
- 予定を「買った」ときに割合を変え、そのあと「予定に戻す」：予定の割合が支出のものに戻る → Task 3 のテスト。
- 1人だけのスペース：人の切り替えを出さない。「ふたりで分ける」も選べない → Task 6・7。
- `?user=` にほかのスペースの人の ID：404 で何も漏れない → Task 4 のテスト。
- 金額 1円・割合 10% のような端の値：1円は割合の大きい相手へ寄り、払う人は 0円（合計は 1円のまま）→ Task 1 のテスト。

---

### Task 1: 割合の計算（shared/money/split.ts）

**Files:**
- Create: `src/shared/money/split.ts`, `src/shared/money/split.test.ts`

**Interfaces:**
- Produces:
  - `interface Split { payerUserId: string; splitUserId: string | null; payerRatio: number }`
  - `splitAmounts(amount: number, payerRatio: number): { payer: number; other: number }`
  - `userShare(amount: number, split: Split, userId: string): number`（関わらなければ 0）
  - `forUser<T extends Split>(items: readonly T[], userId: string, amountKey: "plannedAmount" | "actualAmount"): T[]`（その人の分の金額に置き換え、関わらないものは外す）
  - `involves(split: Split, userId: string): boolean`

- [ ] Step 1: テスト `splitAmounts`：(999,50)→{500,499}、(1000,30)→{300,700}、(1000,100)→{1000,0}、(1,10)→{0,1}、(7,70)→{5,2}。どれも payer+other=amount。
- [ ] Step 2: テスト `userShare`・`forUser`：払う人・相手・無関係の3人で確かめる。
- [ ] Step 3: 実装（other = 割合の大きい側に端数を寄せる。payerRatio>=50 なら other=floor(amount*(100-r)/100)、それ以外は payer=floor(amount*r/100)）。
- [ ] Step 4: `npx vitest run --config vitest.unit.config.ts src/shared/money/split.test.ts` が PASS。
- [ ] Step 5: コミット。

### Task 2: DB の移行 0006

**Files:**
- Create: `migrations/0006_personal_budgets.sql`
- Modify: `src/server/db/schema.ts`（purchasePlans・expenses に3列、budgets に `user_id` と UNIQUE(space_id,user_id,year_month)）

**Interfaces:**
- Produces: 列 `payer_user_id`（予定は created_by、支出は recorded_by で埋める）、`split_user_id`、`payer_ratio`（DEFAULT 100、CHECK 10〜100・10きざみ・分けない⇔100）。`budgets.user_id NOT NULL`。

- [ ] Step 1: SQL：`ALTER TABLE ... ADD COLUMN` ×3（予定・支出）→ UPDATE で payer を埋める。budgets は新しい表 `budgets_new` を作り、`space_members` と結んでメンバー全員分コピー → 旧表を DROP → RENAME（budgets はほかの表から参照されていない）。
- [ ] Step 2: `npm run db:migrate:local` が通り、ローカルの既存データで「予算がメンバー数ぶん」「payer がすべて埋まっている」ことを SQL で確かめる。
- [ ] Step 3: `npm run test` が通る（テストは移行を全部当てた DB を使う）。この時点で budgets の repo が user_id を入れていないので失敗する箇所は Task 4 で直す → このタスクでは schema と SQL だけをコミットし、budgets の repo を `userId` 必須に直すところまで含める（Task 4 の先取りにしない：`putBudget` に userId 引数を足し、呼び出し元は当面 `currentUser(c).id`）。
- [ ] Step 4: コミット。

### Task 3: 予定・支出の割合（入力・保存・引き継ぎ）

**Files:**
- Modify: `src/shared/schemas/index.ts`（`splitFields`：`payerUserId: optionalId`、`splitUserId: optionalId`、`payerRatio: z.number().int().min(10).max(100).multipleOf(10).default(100)`、refine：splitUserId が null ⇔ 100、payer≠split。plan・expense・purchase の入力に混ぜる）
- Modify: `src/server/repo/plans.ts`, `src/server/repo/expenses.ts`
- Test: `test/data.test.ts`

**Interfaces:**
- Consumes: Task 1 の `Split`。
- Produces: `PlanRow`・`ExpenseRow` に `payerUserId, payerName, splitUserId, splitName, payerRatio`。入力で payerUserId を省いたら登録した人。`purchasePlan(..., input: { actualAmount, spentAt } & Partial<Split>)`（省いたら予定の割合）。`unpurchasePlan` は支出を消す前に割合を予定へ書き戻す。

- [ ] Step 1: テスト「折半で登録すると payerRatio 50・splitUserId が入る。省けば自分 100」。
- [ ] Step 2: テスト「払う人・相手がメンバーでない → 422 INVALID_REFERENCE。割合 55・0・110、相手なしで 50、payer=split → 422」。
- [ ] Step 3: テスト「予定 5:5 を買う → 支出も 5:5。買うときに 7:3 にした → 支出 7:3。予定に戻す → 予定が 7:3」。
- [ ] Step 4: 実装（`assertMember` を payer・split にも使う。`assignee_user_id` は書き込みをやめず入力があればそのまま保存）。
- [ ] Step 5: `npm run test` PASS。コミット。

### Task 4: 人ごとの予算と集計 API

**Files:**
- Modify: `src/server/repo/budgets.ts`（`listBudgets(db, spaceId, userId, from, to)`、`getBudget(db, spaceId, userId, ym)`、`putBudget(db, spaceId, userId, ym, amount, applyToFuture)`）
- Modify: `src/server/routes/data.ts`（`/budgets`・`/summary`・`/daily` に `?user=`）、`src/server/routes/insights.ts`（`?user=`）
- Create: `src/server/repo/members.ts` の `resolveViewUser(db, spaceId, me, query): Promise<string>`（省略→me、スペースのメンバーでなければ RepoError NOT_FOUND）
- Modify: `src/shared/money/analytics.ts`（`memberBreakdown` を「メンバーごとのその人の分」と予算で返す形に：`{ userId, amount, budget, planCount }`）
- Test: `test/data.test.ts`, `test/insights.test.ts`

**Interfaces:**
- Consumes: Task 1 `forUser`、Task 3 の列。
- Produces: `/summary` の応答は今と同じ形（値がその人の分）＋ `userId`。`/insights` の `members[]` に `budget` を足す。`PUT /budgets/:ym` は常に自分の予算。`?user=` が他人なら `GET` は可、`PUT` に `user` は受け付けない。

- [ ] Step 1: テスト「A が 10,000 円を 5:5 で予定 → A・B の summary の plannedTotal が 5,000 ずつ。分けない 3,000 円の支出は A の actualTotal だけに入る」。
- [ ] Step 2: テスト「予算：A の PUT は A の分だけ変わる。B の予算を GET できる。`?user=` にほかのスペースの人 → 404」。
- [ ] Step 3: テスト「相手が抜けたあとも A の summary は 200 で、折半分は A の分のまま」。
- [ ] Step 4: 実装。`/summary` の upcoming は `involves` で絞る。insights の members は各メンバーの `forUser` 合計とその人の予算。
- [ ] Step 5: `npm run test` PASS。コミット。

### Task 5: 画面のデータ取得（API クライアント）

**Files:**
- Modify: `src/app/api/data.ts`（`summaryQuery(month, user?)`・`dailyQuery(from, to, user?)`・`insightsQuery(month, user?)`・`budgetsQuery(from, to, user?)` の queryKey に user を含める。Plan・Expense 型に割合の欄）

**Interfaces:**
- Produces: 上の4つのクエリの `user?: string` 引数。

- [ ] Step 1: 実装し、`npx tsc -b` が通る。コミット（Task 6・7 と一緒でもよい）。

### Task 6: 登録・詳細・「買った」画面の割合

**Files:**
- Create: `src/app/screens/forms/PayerField.tsx`（`PayerField({ members, me, amount, value, onChange })`、value は `Split`）
- Modify: `PlanFormSheet.tsx`（担当の欄を置き換え）、`ExpenseFormSheet.tsx`、`PlanDetailScreen.tsx`（表示と「買った」シート）
- Modify: `src/shared/i18n/en.ts`・`ja.ts`（`payer.label`「払う人 / Paid by」、`payer.me`、`payer.split`「ふたりで分ける / Split」、`payer.ratio`、`payer.share`「{name} ¥{amount}」、`badge.split`「折半 / Split」）

- [ ] Step 1: PayerField：自分／（相手の名前）／分ける のチップ。分けるを選ぶと、3〜4人なら相手のチップ、割合の − ／＋（10きざみ、10〜90）、`splitAmounts` で両者の金額を表示。メンバー1人なら何も出さない。
- [ ] Step 2: 3つの画面に組み込み、送信に payerUserId・splitUserId・payerRatio を入れる。
- [ ] Step 3: 開発サーバーで、折半で登録 → 詳細に「自分 ¥5,000・相手 ¥5,000」→ 7:3 で買う、を確かめる。コミット。

### Task 7: 人の切り替えと絞り込み

**Files:**
- Create: `src/app/components/PersonSwitch.tsx`（`PersonSwitch({ members, value, onChange })`、メンバー1人なら null）
- Modify: `routes/_app/index.tsx`（search `user`、相手のときは予算の行を見るだけ）、`routes/_app/analytics.tsx`（search `user`）、`screens/InsightsScreen.tsx`（メンバーのタブに予算比）
- Modify: `screens/PlansScreen.tsx`（人の絞り込み）、`routes/_app/expenses.tsx`（人・予定から／予定外）
- Modify: i18n（`filter.everyone`「全員 / Everyone」、`filter.fromPlan`「予定から / From plans」、`filter.unplanned`「予定外 / Unplanned」）

- [ ] Step 1: PersonSwitch をホーム・分析の見出しの下に置く（既定は自分。URL に `?user=` を残し、自分のときは省く）。
- [ ] Step 2: 予定一覧・支出一覧の絞り込み（人で絞ると、払う人か相手のものを出す）と、分けたものの「折半 自分 ¥x」の印。
- [ ] Step 3: 開発サーバーで、相手に切り替えたときの数字・予算が見るだけになること、絞り込みを確かめる。コミット。

### Task 8: 仕上げ

- [ ] Step 1: `npm run check` が全部通る。375px の画面で、ホーム・分析・登録・一覧の見た目を確かめる。
- [ ] Step 2: `docs/progress.md` に記録。コミットとプッシュ。
- [ ] Step 3: オーナーに報告し、本番の移行（復元ポイントを記録してから `npm run db:migrate:prod`）とデプロイの許可をもらう。
