import { describe, expect, it } from "vitest";
import { en } from "./en";
import { dataLocale, DEFAULT_LOCALE, formatMonth, htmlLang, MIX_JA_KEYS, textLocale, formatMonthShort, formatShortDate, spokenDate, translate, weekdayLetter } from "./index";
import { ja } from "./ja";

describe("英語／日本語", () => {
  it("日本語の辞書は英語と同じキーをすべて持ち、空の文言がない", () => {
    expect(Object.keys(ja).sort()).toEqual(Object.keys(en).sort());
    for (const [k, v] of Object.entries(ja)) expect(v, k).not.toBe("");
  });

  it("差し込む値の名前が、英語と日本語でそろっている", () => {
    // 「単数|複数」の形は同じ名前が2回出るので、重ねずに比べる
    const names = (s: string) => [...new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort();
    for (const k of Object.keys(en) as (keyof typeof en)[]) expect(names(ja[k]), k).toEqual(names(en[k]));
  });

  it("最初の言語は英語", () => {
    expect(DEFAULT_LOCALE).toBe("en");
  });

  it("値を差し込む", () => {
    expect(translate("en", "metric.items", { count: 3 })).toBe("3 items");
    expect(translate("ja", "metric.items", { count: 3 })).toBe("3件");
    // 英語は単数と複数を使い分ける
    expect(translate("en", "metric.items", { count: 1 })).toBe("1 item");
    expect(translate("en", "metric.items", { count: 0 })).toBe("0 items");
    expect(translate("ja", "metric.items", { count: 1 })).toBe("1件");
    expect(translate("ja", "home.leftToSpend")).toBe("あと使える金額");
  });

  it("日付の表記", () => {
    expect(formatMonth("2026-10", "en")).toBe("Oct 2026");
    expect(formatMonth("2026-10", "ja")).toBe("2026年10月");
    expect(formatMonthShort("2026-05", "en")).toBe("May");
    expect(formatMonthShort("2026-05", "ja")).toBe("5月");
    expect(formatShortDate("2026-10-27", "en")).toBe("Oct 27");
    expect(formatShortDate("2026-10-27", "ja")).toBe("10/27");
    expect(weekdayLetter(6, "en")).toBe("S");
    expect(weekdayLetter(6, "ja")).toBe("日");
    expect(spokenDate("2026-10-19", 0, "en")).toBe("Monday, October 19");
    expect(spokenDate("2026-10-19", 0, "ja")).toBe("10月19日（月）");
  });

  it("Mix：意味を読み取る文だけ日本語、ほかは英語。日付は英語の表記、データと文中の日付は日本語", () => {
    expect(translate("mix", "plan.under", { amount: "¥1,200" })).toBe(translate("ja", "plan.under", { amount: "¥1,200" }));
    expect(translate("mix", "attention.overBudgetConfirm")).toBe(translate("ja", "attention.overBudgetConfirm"));
    expect(translate("mix", "home.leftToSpend")).toBe("Left to spend");
    expect(translate("mix", "plan.markBought")).toBe(translate("en", "plan.markBought"));
    expect(translate("mix", "plan.thisMonthLeft")).toBe(translate("en", "plan.thisMonthLeft"));
    for (const k of MIX_JA_KEYS) expect(translate("mix", k), k).toBe(translate("ja", k));
    expect(formatMonth("2026-10", "mix")).toBe("Oct 2026");
    expect(weekdayLetter(6, "mix")).toBe("S");
    expect(dataLocale("mix")).toBe("ja");
    expect(textLocale("mix")).toBe("ja");
    expect(htmlLang("mix")).toBe("ja");
    expect(dataLocale("en")).toBe("en");
  });
});