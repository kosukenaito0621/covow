import * as oauth from "oauth4webapi";

/*
 * Google ログイン（OpenID Connect の認可コードフロー＋PKCE）。手順の検証は oauth4webapi に任せる。
 * Google の設定値は公開されている discovery（https://accounts.google.com/.well-known/openid-configuration）と同じ値を
 * ここに固定し、ログインのたびに取りに行かない（2026-10-25 に確認）。
 */
export const GOOGLE_AS: oauth.AuthorizationServer = {
  issuer: "https://accounts.google.com",
  authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  token_endpoint: "https://oauth2.googleapis.com/token",
  code_challenge_methods_supported: ["S256"],
  id_token_signing_alg_values_supported: ["RS256"],
};

export const callbackUrl = (appOrigin: string) => `${appOrigin}/api/auth/google/callback`;

/** Google のログイン画面の URL を作る。state・verifier・nonce は呼び出し側で Cookie に入れておく */
export async function buildAuthorizationUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  verifier: string;
  nonce: string;
}): Promise<URL> {
  const url = new URL(GOOGLE_AS.authorization_endpoint!);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("code_challenge", await oauth.calculatePKCECodeChallenge(input.verifier));
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", input.state);
  url.searchParams.set("nonce", input.nonce);
  // 複数の Google アカウントを使っている人が選べるようにする
  url.searchParams.set("prompt", "select_account");
  return url;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
}

export class GoogleLoginError extends Error {
  constructor(readonly reason: "cancelled" | "failed") {
    super(reason);
    this.name = "GoogleLoginError";
  }
}

/**
 * Google から戻ってきた URL を検証し、コードをトークンに交換して、ID トークンの中身（本人の情報）を返す。
 * state の照合・PKCE・ID トークンの iss / aud / exp / nonce の確認は oauth4webapi が行う。
 */
export async function exchangeCallback(input: {
  currentUrl: URL;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  expected: { state: string; verifier: string; nonce: string };
}): Promise<GoogleProfile> {
  const client: oauth.Client = { client_id: input.clientId };
  let params: URLSearchParams;
  try {
    params = oauth.validateAuthResponse(GOOGLE_AS, client, input.currentUrl, input.expected.state);
  } catch (e) {
    // ログイン画面で「キャンセル」した場合は error=access_denied で戻ってくる
    if (e instanceof oauth.AuthorizationResponseError && e.error === "access_denied") throw new GoogleLoginError("cancelled");
    throw new GoogleLoginError("failed");
  }
  try {
    const response = await oauth.authorizationCodeGrantRequest(
      GOOGLE_AS,
      client,
      oauth.ClientSecretPost(input.clientSecret),
      params,
      input.redirectUri,
      input.expected.verifier,
    );
    const result = await oauth.processAuthorizationCodeResponse(GOOGLE_AS, client, response, {
      expectedNonce: input.expected.nonce,
      requireIdToken: true,
    });
    const claims = oauth.getValidatedIdTokenClaims(result);
    const email = typeof claims?.email === "string" ? claims.email : null;
    // 確認されていないメールアドレスのアカウントは受け付けない
    if (!claims || !email || claims.email_verified === false) throw new GoogleLoginError("failed");
    return {
      sub: claims.sub,
      email,
      name: typeof claims.name === "string" ? claims.name : null,
      picture: typeof claims.picture === "string" ? claims.picture : null,
    };
  } catch (e) {
    if (e instanceof GoogleLoginError) throw e;
    throw new GoogleLoginError("failed");
  }
}
