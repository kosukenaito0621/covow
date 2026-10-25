import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  daysInMonth,
  jstDateOfInstant,
  jstToday,
  jstYearMonthOfInstant,
  monthUtcRange,
  weekDates,
  weekStartOf,
} from "./jst";

describe("日本時間の日付", () => {
  it("UTC 10/31 14:30 は日本時間 10/31、UTC 10/31 15:30 は日本時間 11/1", () => {
    expect(jstDateOfInstant("2026-10-31T14:30:00.000Z")).toBe("2026-10-31");
    expect(jstDateOfInstant("2026-10-31T15:30:00.000Z")).toBe("2026-11-01");
    expect(jstYearMonthOfInstant("2026-10-31T14:30:00.000Z")).toBe("2026-10");
    expect(jstYearMonthOfInstant("2026-10-31T15:30:00.000Z")).toBe("2026-11");
  });

  it("jstToday はサーバーの UTC 日付ではなく日本時間の日付を返す", () => {
    expect(jstToday(new Date("2026-12-31T15:00:00.000Z"))).toBe("2027-01-01");
    expect(jstToday(new Date("2026-12-31T14:59:59.999Z"))).toBe("2026-12-31");
  });

  it("月の UTC 範囲（日本時間の1日0時〜翌月1日0時）", () => {
    expect(monthUtcRange("2026-11")).toEqual({
      start: "2026-10-31T15:00:00.000Z",
      end: "2026-11-30T15:00:00.000Z",
    });
  });

  it("月の加算と日数（うるう年・年またぎ）", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-10", 12)).toBe("2027-10");
    expect(daysInMonth("2028-02")).toBe(29);
    expect(daysInMonth("2026-02")).toBe(28);
  });

  it("週は月曜はじまり", () => {
    expect(weekStartOf("2026-10-25")).toBe("2026-10-19"); // 日曜
    expect(weekStartOf("2026-10-19")).toBe("2026-10-19"); // 月曜
    expect(weekDates("2026-10-26")).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });
});
