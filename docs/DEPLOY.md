# 本番に公開する手順（Cloudflare Workers・workers.dev）

COVOW を `https://covow.<アカウントのサブドメイン>.workers.dev` で公開する手順。
**どの手順も「公開」にあたるので、1つずつオーナーの許可を取ってから行う。**
料金：Workers・D1 とも無料枠の範囲で動く（2026-10-26 時点の公式ドキュメントで確認）。

## 0. 前提
- `npx wrangler whoami` で Cloudflare にログイン済みであること
- `npm run check` がすべて通ること

## 1. 本番のデータベースを作る
```bash
npx wrangler d1 create covow-db --location apac
```
- 「設定ファイルに足しますか」と聞かれたら **No**（自分で書く）
- 表示された `database_id` を `wrangler.jsonc` の `env.production` の `REPLACE_IN_PHASE_9` と置き換える
  - database_id は秘密ではない（鍵がないと使えない）ので、Git に入れてよい

## 2. テーブルを作る（マイグレーション）
```bash
npm run db:migrate:prod
```
- `migrations/` の SQL を順に本番へ当てる。2回目以降は、まだ当てていないものだけが当たる

## 3. 鍵を登録する（Secrets）
```bash
npx wrangler secret put GOOGLE_CLIENT_ID --env production
npx wrangler secret put GOOGLE_CLIENT_SECRET --env production
npx wrangler secret put APP_ORIGIN --env production
```
- 1つずつ値を聞かれるので貼り付ける（画面にもチャットにも残さない）
- `APP_ORIGIN` は `https://covow.<サブドメイン>.workers.dev`（最後の `/` は付けない）
- Worker がまだないときは、登録と同時に空の Worker が作られる

## 4. Google 側の設定を足す
Google Cloud Console → Google Auth Platform → Clients → `COVOW local`（または本番用に新しく作る）
- Authorized redirect URIs に追加：`https://covow.<サブドメイン>.workers.dev/api/auth/google/callback`
- Audience は **Testing のまま**。ログインする人（パートナーなど）を Test users に足す
  - Testing のままだと、Test users に登録した人だけがログインできる（最大100人）
  - 誰でも使えるようにするには、プライバシーポリシーと利用規約を用意して In production にする

## 5. 公開する（デプロイ）
パソコンから：
```bash
CLOUDFLARE_ENV=production npm run build
npx wrangler deploy
```
- Vite プラグインを使っているので、本番か開発かは**ビルドのとき**に `CLOUDFLARE_ENV` で決まる（`wrangler deploy --env` は使わない）
- ビルド結果の `dist/covow/.dev.vars` はローカルのプレビュー用のコピー。デプロイでは送られず、`dist/` は Git にも入らない

GitHub Actions から（2回目以降はこちらが楽）：
1. GitHub のリポジトリ → Settings → Secrets and variables → Actions に次の2つを登録
   - `CLOUDFLARE_API_TOKEN`：Cloudflare の「API トークン」→「Edit Cloudflare Workers」テンプレートで作る
   - `CLOUDFLARE_ACCOUNT_ID`：Cloudflare のダッシュボード右側に出る Account ID
2. Actions → `Deploy` → **Run workflow** を押す（自動では動かない）
- `CI` は push のたびにテストとビルドだけを行う（公開はしない）

## 6. 公開後の確認
- `https://covow.<サブドメイン>.workers.dev/api/health` が `{"ok":true}` を返す
- Google でログイン → スペース作成 → 招待 → 予定の追加・購入 → 分析 が動く
- 「Try without signing in」で体験版が始まる
- 毎日 3:00（日本時間）に期限切れの体験版が消える（Cloudflare のダッシュボード → Workers → covow → Cron で次回の実行時刻を確認）

## 元に戻すとき
- `npx wrangler rollback` で1つ前のバージョンに戻せる（データベースは戻らない）
- データベースは D1 の Time Travel で過去の時点に戻せる（無料プランは7日前まで）（`npx wrangler d1 time-travel`）。戻す前に必ず相談する
