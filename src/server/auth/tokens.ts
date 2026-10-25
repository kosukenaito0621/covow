/** 推測できない乱数のトークン（32バイト、URL に使える Base64） */
export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * トークンの SHA-256（16進）。DB にはトークンそのものではなくこの値を入れる。
 * DB の中身が漏れても、そこから Cookie を作ることはできない。
 */
export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
