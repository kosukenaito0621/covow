import { describe, expect, it } from "vitest";
import { DEFAULT_CATEGORIES, presetRenames } from "./constants";

describe("初期カテゴリの名前をそろえる", () => {
  it("英語の初期名を日本語に、日本語の初期名を英語に（両方向）", () => {
    expect(presetRenames(DEFAULT_CATEGORIES.en, "ja").map((r) => r.to)).toEqual([...DEFAULT_CATEGORIES.ja]);
    expect(presetRenames(DEFAULT_CATEGORIES.ja, "en").map((r) => r.to)).toEqual([...DEFAULT_CATEGORIES.en]);
  });

  it("自分で付けた名前・すでにその言語の名前は変えない", () => {
    expect(presetRenames(["食費", "Dates", "Other"], "ja")).toEqual([{ from: "Other", to: "その他" }]);
  });

  it("前の版の初期名は、もう一方の言語なら、いまの名前（ファッション・衣服）に寄せる。同じ言語ならそのまま", () => {
    expect(presetRenames(["Clothing & beauty"], "ja")).toEqual([{ from: "Clothing & beauty", to: "ファッション・衣服" }]);
    expect(presetRenames(["衣服・美容"], "en")).toEqual([{ from: "衣服・美容", to: "Fashion & clothing" }]);
    expect(presetRenames(["衣服・美容"], "ja")).toEqual([]);
  });

  it("置き換え先の名前がすでにあるときは、重複になるので変えない", () => {
    expect(presetRenames(["Groceries", "食費"], "ja")).toEqual([]);
    // 前の版の名前と今の名前が両方あるときは、先にある方だけを置き換える
    expect(presetRenames(["Clothing & beauty", "Fashion & clothing"], "ja")).toEqual([{ from: "Clothing & beauty", to: "ファッション・衣服" }]);
  });
});
