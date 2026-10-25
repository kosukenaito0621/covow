import { vi } from "vitest";

/*
 * 本物の Google には接続しない。トークンの交換（POST https://oauth2.googleapis.com/token）だけを差し替え、
 * 指定した中身の ID トークンを返す。
 */

const b64url = (v: unknown) =>
  btoa(JSON.stringify(v)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export function fakeIdToken(claims: Record<string, unknown>): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: "https://accounts.google.com",
    aud: "test-client-id",
    iat: now,
    exp: now + 3600,
    sub: "google-sub-1",
    email: "aoi@example.com",
    email_verified: true,
    name: "Aoi",
    ...claims,
  };
  return `${b64url({ alg: "RS256", kid: "test", typ: "JWT" })}.${b64url(payload)}.c2lnbmF0dXJl`;
}

/** トークンの交換を差し替える。呼ばれたときの送信内容（フォーム）を requests に残す */
export function mockGoogleToken(idTokenClaims: Record<string, unknown>) {
  const requests: URLSearchParams[] = [];
  const original = globalThis.fetch;
  const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url === "https://oauth2.googleapis.com/token") {
      const body = input instanceof Request ? await input.text() : String(init?.body ?? "");
      requests.push(new URLSearchParams(body));
      return new Response(
        JSON.stringify({ access_token: "at", token_type: "Bearer", expires_in: 3599, id_token: fakeIdToken(idTokenClaims) }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return original(input, init);
  });
  return { requests, restore: () => spy.mockRestore() };
}
