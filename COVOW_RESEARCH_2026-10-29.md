# COVOW現状調査・家計簿アプリ連携資料

調査日：2026年10月29日（日本時間）  
対象：`C:\Users\china_e7femb4\OneDrive\ドキュメント\01_共通\covow-app`

## 結論と調査範囲

COVOWには購入予定・購入実績・個人別月次予算・2人間の負担割合・支出分析が実装されている。相談コメント・承認・返金・外部アプリへの自動同期は、調査したコードには実装がない。

新しい家計簿との連携には、**B：別データベースをAPIで連携する方式**を推奨する。COVOWの既存機能への影響を抑え、購入実績の訂正・削除を伝える専用APIを追加する。

本資料は先行する読み取り専用調査の結果を保存したものである。調査ではファイル・DB・Gitの変更、テスト・ビルド・デプロイを実施していない。本資料のみ、調査後のユーザー指示により新規作成した。秘密情報は掲載していない。

本番DB・Google管理画面・GitHub管理画面には接続していない。本番反映の記録と現在の稼働確認は区別する。

- **実装済み**：既存コード・設定で確認したもの。現在の本番稼働を保証する意味ではない。
- **提案**：新規開発の設計案。既存機能ではない。
- **未確認**：実環境等で追加確認が必要なもの。
- **未実装**：調査対象コードに対応する実装を確認できなかったもの。

本資料内の相対リンクは、対象リポジトリのルートを基準とする既存ファイルへのリンクである。

---

# 1. COVOW_ARCHITECTURE

## 1.1 技術構成【実装済み】

バージョンはインストール実体ではなく、`package.json` の指定値。

| 項目 | 構成 |
|---|---|
| フロントエンド | React `^19.3.1` |
| 言語 | TypeScript `^6.0.3` |
| ビルド | Vite `^8.3.5` |
| 画面遷移 | TanStack React Router |
| API取得・キャッシュ | TanStack React Query |
| スタイル | Tailwind CSS 4、独自CSS |
| アニメーション・グラフ | Motion、D3 Scale／Shape |
| サーバー | Hono `^4.13.13` |
| 実行環境 | Cloudflare Workers |
| DB | Cloudflare D1、SQLite形式 |
| DBアクセス | Drizzle ORM＋D1への直接SQL |
| 入力検証 | Zod |
| 認証 | Google OpenID Connect、oauth4webapi |
| PWA | vite-plugin-pwa、Workbox |
| 自動検証 | Vitest、Cloudflare Workers向けテスト、ESLint、TypeScript |
| Node.js | `>=22`。GitHub Actionsは22 |

根拠：[package.json](package.json)、[vite.config.ts](vite.config.ts)、[src/server/index.ts](src/server/index.ts)。

## 1.2 ディレクトリ構造【実装済み】

```text
covow-app/
├─ src/
│  ├─ app/                 React画面
│  │  ├─ routes/           ログイン・ホーム・予定・支出・分析・設定
│  │  ├─ screens/          画面部品・入力フォーム
│  │  ├─ components/       共通UI・グラフ
│  │  └─ api/              サーバーAPI呼び出し
│  ├─ server/
│  │  ├─ routes/           HTTP API
│  │  ├─ repo/             DB操作・所属確認
│  │  ├─ middleware/       認証・所属・Origin確認
│  │  ├─ auth/             Google認証・セッション
│  │  ├─ db/               DB定義・接続
│  │  └─ trial/            体験版
│  └─ shared/
│     ├─ money/            金額・割り勘・予算・分析計算
│     ├─ schemas/          共通入力検証
│     └─ date/             日本時間の日付処理
├─ migrations/             DB変更SQL
├─ test/                   API等の結合テスト
├─ public/                 アイコン・静的配信設定
├─ scripts/                旧アプリ移行等の補助処理
├─ docs/                   設計・公開手順・作業記録
└─ .github/workflows/      CI・手動デプロイ
```

ブラウザが直接DBへアクセスする構成ではない。画面から `/api` を呼び、Workersが認証・所属を確認してD1を操作する。

## 1.3 デプロイ・GitHub

| 項目 | 調査結果 | 区分 |
|---|---|---|
| 配信方式 | WorkersでAPIとSPAの静的ファイルを配信 | 実装済み |
| 環境分離 | 開発用と本番用のD1設定あり | 実装済み |
| 公開先 | https://covow.sukeo-appslab.workers.dev | 公開記録あり・現在の稼働は未確認 |
| GitHub | https://github.com/kosukenaito0621/covow | ローカルのremote設定で確認 |
| CI | mainへのpush・PRで検査とビルド | 定義あり・現在の実行結果は未確認 |
| デプロイ | GitHub Actionsの手動実行 | 定義あり |
| 定期処理 | 毎日日本時間3時に期限切れ体験版を削除 | 実装・設定あり |
| 作業ツリー | 調査時の `git status --short` は出力なし | 本資料作成前の追跡対象変更なし |
| 最新ローカルコミット | `5edfa28`、2026-10-27 | 調査時点で確認済み |

GitHub側の最新コミット、公開範囲、ブランチ保護、Secretsの登録状態は未確認。

根拠：[wrangler.jsonc](wrangler.jsonc)、[CI定義](.github/workflows/ci.yml)、[デプロイ定義](.github/workflows/deploy.yml)、[公開手順](docs/DEPLOY.md)、[進捗記録](docs/progress.md)。

## 1.4 PWA対応【実装済み／実機確認は未確認】

- マニフェスト、サービスワーカー、自動更新設定あり。
- ホーム画面から独立したアプリ風の表示が可能な設定。
- iPhone向けアイコン、表示設定、画面端の余白への対応あり。
- APIデータをサービスワーカーに保存しない構成。
- オフライン時は画面の枠を開く設計。支出のオフライン入力・後日同期の実装は確認できない。
- iPhone・Windows PCのインストールから利用までの実機検証は今回未実施。

根拠：[vite.config.ts](vite.config.ts)、[index.html](index.html)。

## 1.5 購入フロー

| 機能 | 判定 | コード上の挙動 |
|---|---|---|
| 購入宣言 | 実装済み | 商品名・予定額・日付・カテゴリ・メモ・URL等を予定として登録 |
| 相談 | 一部相当 | 共有予定・メモはあるがコメント・会話履歴は未実装 |
| 承認 | 未実装 | 承認者、承認日時、承認待ち状態、承認APIなし |
| 購入予定 | 実装済み | `planned` 状態で管理 |
| 購入確定 | 実装済み | `purchased` に更新し、支出を1件作成 |
| 金額変更 | 実装済み | 予定額と実支出額を別々に編集可能 |
| キャンセル | 実装済み | `planned → canceled`。復元も可能 |
| 購入取消 | 実装済み | 未購入へ戻し、対応する支出を削除 |
| 返金 | 未実装 | 返金レコード・部分返金・負数支出なし |
| 予定の削除 | 実装済み | 購入済みでも削除可能。支出は残り、予定参照が外れる |
| 予定なしの支出 | 実装済み | 直接支出を登録可能 |

重要な仕様：

1. 購入確定では、予定更新と支出作成をD1の `batch` にまとめる。
2. 同一予定から作る支出はDBの一意制約で1件に制限する。再送は成功の再返却ではなく409。
3. 購入後に予定を編集しても、既存支出の金額等が自動追従する処理はない。
4. 購入確定で作る支出の `memo` は `NULL`。予定メモは自動転記されない。
5. 予定に紐づく支出の直接削除は409 `FROM_PLAN`。予定の未購入戻しで支出を削除する。

根拠：[予定DB処理](src/server/repo/plans.ts)、[支出DB処理](src/server/repo/expenses.ts)、[API定義](src/server/routes/data.ts)、[詳細画面の操作接続](src/app/routes/_app/plans.$planId.tsx)。

---

# 2. COVOW_DATA_MODEL

## 2.1 DBの基本仕様【実装済み】

- Cloudflare D1、SQLite形式。
- 金額は円の整数。通貨カラムなし。
- 予定・支出額：1〜99,999,999円。
- 予算額：0〜99,999,999円。
- 日付：日本時間の `YYYY-MM-DD`。年月：`YYYY-MM`。
- 日時：UTCのISO 8601文字列。
- 通常の新規IDは `crypto.randomUUID()`。移行処理では別形式のID生成もあるため、連携側はUUID形式に限定しないことを推奨。

## 2.2 テーブル・カラム一覧

カラム名は原則DB上の名前。`?` はNULL許可。

| テーブル | カラム |
|---|---|
| `users` | `id`、`google_sub`、`email`、`display_name`、`avatar_url?`、`language`、`theme`、`is_guest`、`guest_expires_at?`、`created_at`、`updated_at` |
| `sessions` | `id`、`user_id`、`expires_at`、`created_at` |
| `spaces` | `id`、`name`、`created_by`、`created_at`、`updated_at` |
| `space_members` | `space_id`、`user_id`、`role`、`joined_at` |
| `invites` | `id`、`space_id`、`token_hash`、`created_by`、`expires_at`、`used_at?`、`used_by?`、`revoked_at?`、`created_at` |
| `categories` | `id`、`space_id`、`name`、`sort_order`、`created_at`、`updated_at` |
| `purchase_plans` | `id`、`space_id`、`created_by`、`assignee_user_id?`、`title`、`planned_amount`、`category_id?`、`planned_date?`、`memo?`、`product_url?`、`status`、`payer_user_id?`、`split_user_id?`、`payer_ratio`、`created_at`、`updated_at` |
| `expenses` | `id`、`space_id`、`purchase_plan_id?`、`recorded_by`、`title`、`actual_amount`、`category_id?`、`spent_at`、`memo?`、`payer_user_id?`、`split_user_id?`、`payer_ratio`、`created_at`、`updated_at` |
| `budgets` | `id`、`space_id`、`user_id`、`year_month`、`budget_amount`、`created_at`、`updated_at` |
| `trial_quota` | `key`、`day`、`count` |

補足：

- `users` には移行前の `locale` カラムも残る設計。現行コードの `locale` プロパティはDBの `language` に対応する。
- 支払者カラムはDB定義ではNULL許可。移行で既存値を補完し、通常作成時には設定する。
- `sessions.id` はセッショントークンのSHA-256ハッシュ。
- `trial_quota` は体験版作成回数の制限用。

根拠：[schema.ts](src/server/db/schema.ts)、[言語移行SQL](migrations/0005_language_mix.sql)、[個人予算・割り勘移行SQL](migrations/0006_personal_budgets.sql)。

## 2.3 リレーションと制約【実装済み】

| 関係 | 制約・意味 |
|---|---|
| ユーザー → セッション | 1対多 |
| ユーザー ↔ スペース | `space_members` で所属管理。ただし1人1スペース |
| スペース → メンバー | 最大4人。API確認とDBのINSERTトリガーで制限 |
| スペース → 招待・カテゴリ・予定・支出・予算 | 各1対多 |
| 購入予定 → 支出 | 1対0〜1。`expenses.purchase_plan_id` が一意 |
| カテゴリ → 予定・支出 | カテゴリ削除時は参照をNULLにする |
| 購入予定 → 支出 | 予定削除時は支出側の参照をNULLにする |
| スペース・ユーザー・月 → 予算 | 組み合わせが一意 |
| スペース・カテゴリ名 | 組み合わせが一意 |

カテゴリ・担当者・支払者・割り勘相手について、アプリ側でも所属確認を行う。ユーザー参照だけでは同一スペース所属までは保証されない。

根拠：[schema.ts](src/server/db/schema.ts)、[4人上限トリガー](migrations/0003_space_member_limit_4.sql)、[メンバー検証](src/server/repo/members.ts)。

## 2.4 世帯・個人・割り勘の意味

世帯に相当する共有単位は `spaces`。法的な世帯やカップル専用テーブルではなく、1〜4人の共有スペースである。

個人別予算はあるが、個人データを他のメンバーから隠す仕組みではない。同じスペースのメンバーは他メンバーの予算・支出情報を閲覧できる。

- 割り勘は支払者1人＋負担相手1人。
- 支払者の負担率を10％刻みで指定する。
- 相手なしなら支払者100％。
- 端数は負担率が大きい側へ、同率なら支払者へ。
- 4人所属でも、1支出を3〜4人に分けるモデルではない。
- 立替残高、精算済み状態、精算送金のテーブルはない。

`actual_amount` は支出全額。本人の負担額は割合から計算する。支払額と負担額を区別して連携する必要がある。

根拠：[割り勘計算](src/shared/money/split.ts)、[予算API](src/server/routes/data.ts)、[スペース管理](src/server/repo/space.ts)。

## 2.5 認証・アクセス制御【実装済み】

| 項目 | 内容 |
|---|---|
| ログイン | Google OpenID Connectの認可コードフロー＋PKCE |
| 検証 | state・nonce・IDトークン等をoauth4webapiで検証 |
| アカウント識別 | 一意な `google_sub` に対応する内部ユーザーID |
| セッション | DB保存型。Cookieにはランダムトークン、DBにはハッシュ |
| Cookie | `__Host-`、Secure、HttpOnly、SameSite=Lax |
| 有効期限 | 通常30日。残り15日未満で更新 |
| 2人の関連付け | 各自Googleログイン後、招待リンクで同じスペースに参加 |
| 招待 | 72時間。使用済み・失効・取消を管理。DBにはハッシュ |
| データ分離 | 毎回所属確認し、DB操作を `space_id` で絞る |
| 変更リクエスト | `Origin` が `APP_ORIGIN` と一致することを要求 |
| RLS | DB側の行単位権限制御は確認されず、API・DB操作コードで制御 |

権限上の注意：

- `owner` と `member` は表示用で権限差なし。
- 同じスペースなら他人が登録した予定・支出も編集可能。
- 他メンバーの除外もowner専用ではない。
- 予算変更はログイン本人分に限定。
- 所属解除後はセッションが残っていても対象スペースのAPI利用を拒否。

根拠：[Google認証](src/server/auth/google.ts)、[セッション](src/server/auth/session.ts)、[Cookie](src/server/auth/cookies.ts)、[所属確認](src/server/middleware/require-member.ts)、[Origin確認](src/server/middleware/origin-check.ts)、[スペース管理](src/server/repo/space.ts)。

## 2.6 マイグレーション管理

| SQL | 内容 |
|---|---|
| `0000_init` | 基本テーブル |
| `0001_space_member_limit` | メンバー上限 |
| `0002_user_preferences` | 言語・テーマ |
| `0003_space_member_limit_4` | 上限4人へ変更 |
| `0004_trial` | 体験版 |
| `0005_language_mix` | `language` カラム追加 |
| `0006_personal_budgets` | 個人別予算・支払者・負担割合 |

確認した管理上の差分：

- SQLは0006まであるが、Drizzleの `_journal.json` は0005まで。
- `schema.ts` とSQLの制約・索引に差がある。割り勘CHECK制約は0006のSQL側にある。
- 進捗記録にも、手書きマイグレーションに伴うスナップショットとの差への注意がある。

将来のDB変更では `schema.ts` だけを根拠に自動生成SQLを適用できない。本番実スキーマと適用履歴の確認が必要。0006の本番適用は進捗記録にあるが、今回本番DBで再確認していない。

根拠：[Drizzle設定](drizzle.config.ts)、[マイグレーション台帳](migrations/meta/_journal.json)、[0006 SQL](migrations/0006_personal_budgets.sql)、[進捗記録](docs/progress.md)。

---

# 3. COVOW_INTEGRATION_SPEC

## 3.1 現在の外部連携

| 項目 | 判定 |
|---|---|
| Googleログイン | 実装済み |
| アプリ内部向けHTTP API | 実装済み |
| 外部アプリ向け認可・APIトークン | 未実装 |
| Webhook送信・受信 | 調査したアプリコードには実装なし |
| 購入実績の自動同期 | 未実装 |
| 旧アプリCSV移行 | 管理者用スクリプトあり |
| 銀行・カードCSVインポート | 未実装 |
| AIレシート読取・AIアドバイザー | 未実装 |
| 共通財布・個人口座・収入・固定費等 | 対応する専用モデルなし |

旧CSV移行はCSVからSQLを生成して管理者が適用する仕組み。銀行CSVを利用者が画面から取り込む機能とは異なる。

根拠：[サーバールート構成](src/server/index.ts)、[旧CSV移行スクリプト](scripts/import-legacy.mjs)、[旧CSV移行手順](docs/LEGACY_IMPORT.md)。

## 3.2 連携方式の比較【提案】

現在の実装を踏まえた相対評価。

| 評価軸 | A. 同一DB共有 | B. 別DB＋API | C. 共通バックエンド |
|---|---|---|---|
| 安全性 | 両アプリにDB権限を持たせると影響範囲が広い | APIで対象・権限を限定しやすい | 認証・権限を統一できるが設計範囲が大きい |
| 保守性 | テーブル変更が双方に波及 | API契約で変更を分離できる | 共通化しやすいが双方の運用調整が必要 |
| 初期工数 | 接続だけなら少ないが権限・競合対策が必要 | 中。認可・差分同期・照合を追加 | 大。既存処理の切り出し・移行が必要 |
| 既存機能への影響 | DB制約や集計変更が直接影響 | 専用API・変更記録の追加を中心にできる | 認証・APIの変更範囲が広い |
| 同期の難しさ | 複製同期は不要。ただし更新責任が衝突 | 訂正・削除・再送・順序の設計が必要 | 正本を統一できれば同期を減らせる |
| 今回の適合性 | 推奨しない | **推奨** | 長期的な統合時の候補 |

A方式でDBを直接操作すると、現在 `repo/` が担う所属検証や購入状態の整合性を迂回する可能性がある。

## 3.3 推奨構成【提案】

```text
COVOW画面
    ↓ 既存API
COVOW Workers ── COVOW D1
    ↑
    │ 専用の読取API：初回取得・変更履歴
    │
家計簿バックエンド ── 家計簿DB
    ↑
家計簿PWA
```

初期段階では家計簿バックエンドによる定期取得を提案する。即時性が必要になった段階でWebhookを追加できる。

- COVOWをCOVOW由来の購入実績の正本にする。
- 家計簿はその実績を取り込む。
- 家計簿固有の口座・費目分類・精算情報は家計簿側で管理する。
- 初期版では家計簿からCOVOWへ書き戻さない。
- DB資格情報やログインCookieは共有しない。
- 利用者・スペース単位の連携許可と解除を追加する。

## 3.4 同期対象と変更イベント【提案】

購入予定由来の実績のみか、予定なしの直接支出も含めるかは要決定。技術上は `expenses` を同期の中心とし、`purchase_plan_id` の有無で区別できる。

| COVOWの操作 | 家計簿側の処理 |
|---|---|
| 購入確定・直接支出登録 | 支出を新規取込 |
| 支出金額・日付・支払者・割合の変更 | 対応支出を更新 |
| 未購入へ戻す | 対応支出を取消扱いにする |
| 直接支出の削除 | 対応支出を取消扱いにする |
| 購入済み予定の削除 | 支出を維持し、予定参照のみ解除 |
| 取消後の再購入 | 新しい支出IDとして取込 |
| カテゴリ削除・改名 | 分類対応の更新・再確認 |
| 連携解除・所属解除 | 以後の取得を停止 |

取消と返金は区別する。現状の未購入戻しは実績レコードの削除であり、返金入金の会計記録ではない。

## 3.5 同期のために不足するもの

| 不足 | 必要な追加【提案】 |
|---|---|
| 外部用認可なし | 許可したスペース・操作に限定する認証 |
| 支出一覧が月別のみ | 初回全件取得・ページ分割 |
| 支出APIに更新日時なし | 更新情報またはリビジョンを追加 |
| 削除後の履歴なし | 削除イベント・削除済み識別情報 |
| 差分取得なし | 永続的な変更ログとカーソル |
| 更新と通知の一体性なし | 支出変更と変更ログを同じDB処理で確定 |
| 外部ユーザー対応なし | 両アプリのユーザーID対応表 |
| 世帯対応なし | スペースと家計簿世帯の対応表 |
| 重複取込対策なし | 取込元と支出IDを一意キーにする |
| 同期監視なし | 最終成功時刻、失敗履歴、再実行・照合 |

予定削除による外部キー参照解除やカテゴリ削除も変更記録に含める。支出編集APIだけに変更記録を追加しても、これらの変更は拾えない。

根拠となる現状：[支出処理](src/server/repo/expenses.ts)、[購入取消・予定削除](src/server/repo/plans.ts)、[参照制約](src/server/db/schema.ts)。

## 3.6 家計簿への対応付け【提案】

| COVOW | 家計簿側 |
|---|---|
| `space_id` | 外部連携元スペース。家計簿世帯IDとの対応を保存 |
| ユーザーID | 本人確認済みの家計簿ユーザーとの対応 |
| 支出ID | 外部支出ID。重複防止キー |
| `actual_amount` | 支出全額 |
| `spent_at` | 支出日 |
| `payer_user_id` | 支払者 |
| `split_user_id`・`payer_ratio` | 各人の負担額 |
| `recorded_by` | 登録者。支払者と区別 |
| カテゴリ | 家計簿費目への対応表 |
| `purchase_plan_id` | 元の購入予定への参照 |
| 個人月次予算 | 自由費予算の候補。家計全体予算とは別管理 |

COVOWには支払口座がない。支払者から銀行口座・カード・共通財布を推定せず、不明として取り込み、家計簿側で指定・照合する。

銀行CSVやレシートにも同じ購入が現れた場合、日付・金額だけで自動確定せず、同一取引候補として照合する仕様を推奨する。

---

# 4. COVOW_API_CONTRACT

## 4.1 既存APIの共通仕様【実装済み】

- 基本パス：`/api`。
- 主な送受信形式：JSON。
- 認証：DBセッション＋Cookie。
- データ操作対象：ログインユーザーの所属スペース。
- 変更系：`Origin === APP_ORIGIN` が必須。
- 金額：整数、または入力検証で変換できる文字列。
- 外部向けAPIバージョニング・Bearer認証・差分同期契約なし。

既存APIは外部連携用としてそのまま使える契約ではない。別サイトのブラウザ利用やサーバー間認証に必要な仕組みの追加が必要。

## 4.2 購入予定・支出API【実装済み】

以下すべて `/api` を先頭に付ける。

| メソッド | パス | 成功時 |
|---|---|---|
| GET | `/plans` | 200 `{ plans: [...] }` |
| GET | `/plans/:id` | 200 `{ plan: ... }` |
| POST | `/plans` | 201 `{ plan: ... }` |
| PATCH | `/plans/:id` | 200 `{ plan: ... }` |
| POST | `/plans/:id/purchase` | 200 `{ plan: ... }` |
| POST | `/plans/:id/unpurchase` | 200 `{ plan: ... }` |
| POST | `/plans/:id/cancel` | 200 `{ plan: ... }` |
| POST | `/plans/:id/restore` | 200 `{ plan: ... }` |
| DELETE | `/plans/:id` | 204 |
| GET | `/expenses?month=YYYY-MM` | 200 `{ expenses: [...] }` |
| POST | `/expenses` | 201 `{ expense: ... }` |
| PATCH | `/expenses/:id` | 200 `{ expense: ... }` |
| DELETE | `/expenses/:id` | 204。予定に紐づく場合は409 |

`GET /expenses/:id` の公開ルートはない。DB操作関数 `getExpense` は存在する。

### 入力項目

| 入力 | 項目 |
|---|---|
| 予定作成・編集 | `title`、`plannedAmount`、`categoryId`、`plannedDate`、`memo`、`productUrl`、`assigneeUserId`、割り勘項目 |
| 購入確定 | `actualAmount`、`spentAt`、割り勘項目 |
| 支出作成・編集 | `title`、`actualAmount`、`spentAt`、`categoryId`、`memo`、割り勘項目 |
| 割り勘項目 | `payerUserId`、`splitUserId`、`payerRatio` |

- 商品名・支出名：必須、最大80文字。
- メモ：最大500文字。
- URL：最大2,048文字、HTTP／HTTPSのみ。
- 日付：実在する日付を検証。
- 支払者・相手：同じスペースのメンバー。
- 支払者と相手の同一人物指定は禁止。

PATCHでも `title`・金額等の必須項目を要求する。任意の1項目だけを送れる汎用部分更新ではない。任意項目の省略でNULLへ変換されるものがあるため、呼び出し側は入力スキーマに従う必要がある。

根拠：[ルート](src/server/routes/data.ts)、[入力スキーマ](src/shared/schemas/index.ts)。

### 支出レスポンスの主な項目

```text
id, title, actualAmount, spentAt,
categoryId, categoryName, memo, purchasePlanId,
recordedBy, recordedByName,
payerUserId, payerName, splitUserId, splitName, payerRatio,
createdAt
```

DBには `updated_at` があるが、現行支出レスポンスには `updatedAt` がない。`spaceId` も返さない。

根拠：[ExpenseRow・SELECT](src/server/repo/expenses.ts)。

## 4.3 その他の既存API【実装済み】

| 分類 | API（先頭に `/api`） |
|---|---|
| 稼働確認 | `GET /health` |
| 認証 | `GET /auth/google`、`GET /auth/google/callback`、`POST /auth/logout` |
| 本人 | `GET /me`、`PATCH /me` |
| スペース | `POST /space`、`GET /space`、`PATCH /space` |
| メンバー | `DELETE /space/members/:userId`、`POST /space/leave` |
| 招待管理 | `POST /space/invite`、`GET /space/invite`、`DELETE /space/invite` |
| 招待参加 | `GET /invites/:token`、`POST /invites/:token/accept` |
| カテゴリ | `GET・POST /categories`、`PATCH・DELETE /categories/:id` |
| カテゴリ補助 | `GET /categories/:id/usage`、`PUT /categories/order`、`POST /categories/localize` |
| 予算 | `GET /budgets?from=YYYY-MM&to=YYYY-MM&user=...`、`PUT /budgets/:yearMonth` |
| 月次集計 | `GET /summary?month=YYYY-MM&user=...` |
| 日次集計 | `GET /daily?from=YYYY-MM-DD&to=YYYY-MM-DD&user=...` |
| 分析 | `GET /insights?month=YYYY-MM&user=...` |
| 体験版 | `POST /trial`、`POST /trial/partner-visit` |

`user` は同じスペースのメンバーのみ指定可能。日次集計は最大31日。予算更新は `{ amount, applyToFuture }` を受け、本人分のみ変更する。

根拠：[API入口](src/server/index.ts)、[データAPI](src/server/routes/data.ts)、[スペースAPI](src/server/routes/space.ts)、[分析API](src/server/routes/insights.ts)、[本人API](src/server/routes/me.ts)、[体験版API](src/server/routes/trial.ts)。

## 4.4 エラー契約【実装済み】

基本形：

```json
{
  "code": "STATE_CONFLICT",
  "message": "STATE_CONFLICT"
}
```

入力エラーでは `issues: [{ field, message }]` を付加する。

| HTTP | 代表コード |
|---|---|
| 401 | `UNAUTHENTICATED` |
| 403 | `NO_SPACE`、`FORBIDDEN_ORIGIN`、`TRIAL_LOCKED` |
| 404 | `NOT_FOUND`、`INVITE_NOT_FOUND` |
| 409 | `ALREADY_PURCHASED`、`STATE_CONFLICT`、`FROM_PLAN`、`SPACE_FULL` |
| 410 | `INVITE_EXPIRED`、`INVITE_USED`、`INVITE_REVOKED` |
| 422 | `VALIDATION`、`INVALID_REFERENCE` |
| 429 | `TRIAL_LIMIT` |
| 500 | `INTERNAL` |

他スペースのIDによる予定・支出操作は404として扱う。

根拠：[HTTP応答処理](src/server/http.ts)、[業務エラー定義](src/server/repo/errors.ts)。

## 4.5 外部同期API契約案【提案・未実装】

以下は既存APIではなく、新規開発時のたたき台。

| メソッド | パス案 | 役割 |
|---|---|---|
| GET | `/api/integration/v1/context` | 許可済みスペース・利用者・カテゴリの取得 |
| POST | `/api/integration/v1/snapshots` | 初回同期用の一貫したデータ取得を開始 |
| GET | `/api/integration/v1/snapshots/:id?cursor=...` | 初回データをページ単位で取得 |
| GET | `/api/integration/v1/changes?cursor=...&limit=...` | 支出等の追加・変更・削除を取得 |

専用Bearerトークン等で連携先・対象スペース・読取権限を限定する案。発行方式、期限、更新・失効方法は設計時に確定する。既存のOrigin検証を全体で緩めず、専用ルートの認証として実装する。

### 変更イベント形式案

```json
{
  "schemaVersion": 1,
  "eventId": "<変更イベントID>",
  "resourceType": "expense",
  "operation": "upsert",
  "resourceId": "<COVOW支出ID>",
  "resourceVersion": 3,
  "spaceId": "<許可されたスペースID>",
  "occurredAt": "<UTC日時>",
  "data": {
    "purchasePlanId": null,
    "title": "<支出名>",
    "amount": 1001,
    "currency": "JPY",
    "spentAt": "2026-10-29",
    "recordedByUserId": "<登録者ID>",
    "payerUserId": "<支払者ID>",
    "categoryId": null,
    "memo": null,
    "allocations": [
      { "userId": "<支払者ID>", "amount": 501 },
      { "userId": "<相手ID>", "amount": 500 }
    ]
  }
}
```

`currency`・`allocations`・`resourceVersion` は提案する外部契約の項目であり、既存DBカラムではない。

### 同期契約に含める事項

- 同一イベントの再送を許可し、家計簿側で重複適用を防ぐ。
- 支出単位のバージョンで古い更新を拒否する。
- 削除は `operation: "delete"` と対象ID・バージョンを返す。
- カーソルは金額・更新日時ではなく、永続化した変更ログから発行する。
- 初回取得と差分取得の境界を固定し、取得中の変更を取りこぼさない。
- 失効カーソルには再初期同期を要求する。
- 家計簿側の反映とカーソル保存は同じトランザクションで確定する。
- 定期照合で件数・金額・参照状態のずれを検出する。
- 体験版データは連携対象から除外する。

## 4.6 検証状況

購入の二重送信、購入取消、予定削除後の支出保持、他スペースの操作拒否、招待競合、個人予算、割り勘のテストコードを確認した。

今回はテストを実行していない。進捗記録の「153件成功」は過去の記録であり、今回の実行結果ではない。

根拠：[購入・支出テスト](test/data.test.ts)、[認証テスト](test/auth.test.ts)、[スペーステスト](test/space.test.ts)、[割り勘テスト](test/split.test.ts)、[進捗記録](docs/progress.md)。

---

# 新しい家計簿アプリの開発前に必要な確認事項

| 確認事項 | 推奨する出発点 |
|---|---|
| 同期対象は購入予定由来だけか、直接支出も含むか | 両方を扱える設計にし、対象は設定可能にする |
| 同期方向 | 初期版はCOVOW→家計簿の片方向 |
| 訂正の責任 | COVOW由来の金額・日付はCOVOWで訂正 |
| 反映速度 | 必要な遅延を決め、定期取得の間隔を設定 |
| 共同家計・個人家計の公開範囲 | COVOW共有スペースと別に家計簿側で定義 |
| 同一人物・同一世帯の確認方法 | 明示的な連携操作とID対応で管理 |
| 支払口座が不明な取引 | 未指定で取り込み、後から割り当て |
| 立替・割り勘精算 | 支出負担と精算送金を別記録にする |
| 返金・部分返金 | 購入取消とは別の取引として設計 |
| 銀行CSV・レシートとの重複 | 同一取引候補の照合・統合ルールを決める |
| 連携解除・退会・メンバー除外 | 取得停止と取込済みデータの保持方針を決める |
| 初回取込の期間 | 全履歴か指定月以降かを決める |
| 本番DBの実態 | 実スキーマ・0006適用・移行台帳の整合を読み取りで確認 |
| iPhone・Windowsの対応範囲 | インストール、オフライン、カメラ、CSV選択の要件を確定 |
| AIへ渡すデータ | レシート・口座情報等の送信範囲と保存方針を確定 |

次の設計作業は、同期対象・個人情報の公開範囲・訂正／取消の扱いを決め、外部同期APIと家計簿のデータモデルを具体化すること。
