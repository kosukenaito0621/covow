import { describe, expect, it } from "vitest";
import { NEWS, sortNews, unreadIds, type NewsItem } from "./index";

const item = (id: string, date: string): NewsItem => ({ id, date, title: { en: id, ja: id }, body: { en: "", ja: "" } });

describe("お知らせ", () => {
  it("新しい日付を先にする（同じ日付は書いた順）", () => {
    const sorted = sortNews([item("a", "2026-10-01"), item("b", "2026-11-01"), item("c", "2026-10-01")]);
    expect(sorted.map((n) => n.id)).toEqual(["b", "a", "c"]);
  });

  it("読んだ ID を除いたものを未読にする", () => {
    const items = [item("a", "2026-10-01"), item("b", "2026-11-01")];
    expect([...unreadIds(items, new Set())]).toEqual(["a", "b"]);
    expect([...unreadIds(items, new Set(["a"]))]).toEqual(["b"]);
    expect(unreadIds(items, new Set(["a", "b", "old"])).size).toBe(0);
  });

  it("公開中のお知らせは ID が重複せず、日付・英日の文がそろっている", () => {
    const ids = NEWS.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const n of NEWS) {
      expect(n.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const text of [n.title.en, n.title.ja, n.body.en, n.body.ja]) expect(text.trim()).not.toBe("");
    }
  });
});
