// .dev.vars（ローカル）と wrangler secret（本番）で渡す値。wrangler types は .dev.vars がないと型を作らないため、ここで宣言する。
// Hono の Bindings は全体の Env、テストの env は Cloudflare.Env を見るので、両方に同じ項目を書く。
interface Env {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  /** アプリのオリジン（例：http://localhost:5173）。リダイレクト先と Origin の確認に使う */
  APP_ORIGIN: string;
}

declare namespace Cloudflare {
  interface Env {
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    APP_ORIGIN: string;
  }
}
