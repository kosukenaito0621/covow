import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("土台の確認", () => {
  it("/api/health が 200 を返し、セキュリティヘッダーが付く", async () => {
    const res = await exports.default.fetch("http://localhost/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("マイグレーションが適用され、4人上限のトリガーがある", async () => {
    const row = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='trigger' AND name='space_members_limit'",
    ).first<{ name: string }>();
    expect(row?.name).toBe("space_members_limit");
  });
});
