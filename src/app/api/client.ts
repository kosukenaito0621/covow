/** API の失敗。status と code（サーバーが返す種類）で画面の出し分けをする */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * 同じサイトの /api を呼ぶ。Cookie は自動で付く。
 * 変更系のリクエストにはブラウザが Origin を付けるので、サーバー側の CSRF 対策をそのまま通る。
 */
export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: init.method ?? "GET",
    credentials: "same-origin",
    headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (res.status === 204) return undefined as T;
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const d = (data ?? {}) as { code?: string; message?: string };
    throw new ApiError(res.status, d.code ?? "UNKNOWN", d.message ?? res.statusText);
  }
  return data as T;
}
