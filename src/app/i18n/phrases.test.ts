import { describe, expect, it } from "vitest";
import { phrase } from "./phrases";

describe("日本語の改行位置", () => {
  it("文節の区切りにだけ印（ゼロ幅スペース）を入れ、単語の途中には入れない", () => {
    const out = phrase("そのまま登録できます。");
    expect(out.replace(/\u200B/g, "")).toBe("そのまま登録できます。");
    expect(out).toContain("\u200B");
    // 「できます」の途中では区切らない
    expect(out).not.toMatch(/でき\u200Bま|できま\u200Bす/);
  });

  it("英語だけの文はそのまま", () => {
    expect(phrase("Left to spend")).toBe("Left to spend");
  });
});
