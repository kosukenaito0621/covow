import type { Context } from "hono";
import type { z } from "zod";
import { RepoError } from "./repo/errors";

/** 入力の検証。だめなら 422 と項目ごとのメッセージ（画面は code と field を見て、言語に合わせた文を出す） */
export async function parseBody<S extends z.ZodType>(
  c: Context,
  schema: S,
): Promise<{ ok: true; data: z.output<S> } | { ok: false; res: Response }> {
  const body: unknown = await c.req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (parsed.success) return { ok: true, data: parsed.data };
  const issues = parsed.error.issues.map((i) => ({ field: i.path.join(".") || null, message: i.message }));
  return {
    ok: false,
    res: c.json({ code: "VALIDATION", message: issues[0]?.message ?? "入力を確認してください", issues }, 422),
  };
}

/** repo のエラーを、決まった形の応答に直す（それ以外のエラーは onError へ） */
export function repoErrorResponse(c: Context, e: unknown): Response {
  if (e instanceof RepoError) return c.json({ code: e.code, message: e.code }, e.status);
  throw e;
}
