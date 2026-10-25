# Google ログインの準備（Google Cloud Console）

COVOW の「Google でログイン」を動かすために、Google 側で「このアプリからのログインを受け付ける」設定をします。
所要時間は15分ほど。料金はかかりません（Google ログインは無料）。
画面の名前は 2026-10-25 時点の Google の公式ヘルプで確認したものです。

## 1. プロジェクトを作る
1. https://console.cloud.google.com/ を開き、Google アカウントでログインする
2. 画面上部のプロジェクト選択 →「新しいプロジェクト」
3. プロジェクト名：`covow`（何でもよい）→「作成」

## 2. ログイン画面の設定（Google Auth Platform）
1. 左上のメニュー →「Google Auth Platform」（見つからなければ上の検索欄で「Google Auth Platform」）
2. 「GET STARTED（開始）」を押す
3. App Information
   - App name：`COVOW`
   - User support email：自分のメールアドレスを選ぶ
4. Audience：**External**（外部）を選ぶ
5. Contact Information：自分のメールアドレス
6. 規約に同意して「作成」

### テスト中に使える人を登録する
- 左の「Audience（対象）」→ Publishing status が **Testing（テスト中）** のままで OK
- 「Test users」に、ログインに使う Google アカウント（オーナー本人、ほか試してもらう人）を追加する
- テスト中は、ここに登録した人だけがログインできます（公開するとき＝フェーズ9で「本番」に切り替えます）

## 3. ログイン用の鍵（OAuth クライアント）を作る
1. 左の「Clients（クライアント）」→「CREATE CLIENT（クライアントを作成）」
2. Application type：**Web application（ウェブ アプリケーション）**
3. Name：`COVOW local`
4. Authorized redirect URIs（承認済みのリダイレクト URI）に次を1つ追加（一字一句同じに）
   ```
   http://localhost:5173/api/auth/google/callback
   ```
   - Authorized JavaScript origins は空のままで OK
5. 「CREATE（作成）」
6. **クライアント ID** と **クライアント シークレット** が表示されます
   - シークレットは**この時しか全部は表示されません**。ダウンロードするか、次の手順ですぐ貼り付けてください
   - なくした場合は、同じ画面の「Add Secret」で作り直せます
   - 設定が Google 側に反映されるまで、5分〜数時間かかることがあります

## 4. パソコンに鍵を置く（.dev.vars）
1. `covow-app` フォルダの `.dev.vars.example` をコピーして、名前を `.dev.vars` にする
2. `.dev.vars` をメモ帳で開き、次のように書く（`=` の後ろに貼り付け。空白や引用符は入れない）
   ```
   GOOGLE_CLIENT_ID=（クライアント ID）
   GOOGLE_CLIENT_SECRET=（クライアント シークレット）
   APP_ORIGIN=http://localhost:5173
   ```
3. 保存する
   - `.dev.vars` は Git に入らない設定済みです（ネットには出ません）
   - 鍵の中身はチャットに貼らないでください

## 5. 終わったら
「.dev.vars を置いた」と伝えてください。開発サーバーを起動し直して、実際にログインできるか一緒に確認します。

## 本番（フェーズ9）でやること（今はまだ不要）
- 本番の URL のリダイレクト URI を追加（例：`https://〇〇/api/auth/google/callback`）
- Audience を「In production（本番）」にする
- 鍵は `.dev.vars` ではなく `npx wrangler secret put` で Cloudflare に登録する
