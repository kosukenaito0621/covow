import { describe, expect, it } from "vitest";
import { formatYen, formatYenShort, parseAmountInput } from "./amount";

describe("金額の入力（12.3 境界値）", () => {
  const ok = (raw: string, opts?: { allowZero?: boolean }) => {
    const r = parseAmountInput(raw, opts);
    if (!r.ok) throw new Error(`expected ok: ${raw} → ${r.error}`);
    return r.value;
  };
  const err = (raw: string, opts?: { allowZero?: boolean }) => {
    const r = parseAmountInput(raw, opts);
    if (r.ok) throw new Error(`expected error: ${raw} → ${r.value}`);
    return r.error;
  };

  it("受け付ける：半角・全角の数字、カンマ、先頭の ¥ / ￥、前後の空白", () => {
    expect(ok("1")).toBe(1);
    expect(ok("99999999")).toBe(99_999_999);
    expect(ok("１２３４５")).toBe(12_345);
    expect(ok("12,800")).toBe(12_800);
    expect(ok("１２，８００")).toBe(12_800);
    expect(ok("¥12,800")).toBe(12_800);
    expect(ok("￥１２８００")).toBe(12_800);
    expect(ok("  3000 ")).toBe(3_000);
  });

  it("拒否する：空欄、0円、負の数、小数、文字、上限超え", () => {
    expect(err("")).toBe("required");
    expect(err("   ")).toBe("required");
    expect(err("0")).toBe("too_small");
    expect(err("-100")).toBe("invalid");
    expect(err("100.5")).toBe("invalid");
    expect(err("１００．５")).toBe("invalid");
    expect(err("abc")).toBe("invalid");
    expect(err("12a")).toBe("invalid");
    expect(err("1e3")).toBe("invalid");
    expect(err("100000000")).toBe("too_large");
    expect(err("¥")).toBe("required");
    expect(err("¥¥100")).toBe("invalid");
    expect(err("1,,000")).toBe("invalid");
  });

  it("予算は 0 円を受け付ける", () => {
    expect(ok("0", { allowZero: true })).toBe(0);
    expect(err("-1", { allowZero: true })).toBe("invalid");
  });
});

describe("金額の表示", () => {
  it("Intl.NumberFormat の円表示", () => {
    // ja-JP の円記号は環境によって ¥ / ￥ が異なるので数字部分で確認する
    expect(formatYen(128_400)).toMatch(/^[¥￥]128,400$/);
    expect(formatYen(-15_000)).toMatch(/^-[¥￥]15,000$/);
    expect(formatYen(0)).toMatch(/^[¥￥]0$/);
  });

  it("ピル用の短い表示（切り捨て。多く見せない）", () => {
    expect(formatYenShort(9_800)).toBe("9,800");
    expect(formatYenShort(10_000)).toBe("1万");
    expect(formatYenShort(128_400)).toBe("12.8万");
    expect(formatYenShort(128_999)).toBe("12.8万");
    expect(formatYenShort(999_999)).toBe("99.9万");
    expect(formatYenShort(1_000_000)).toBe("100万");
    expect(formatYenShort(99_999_999)).toBe("9999万");
    expect(formatYenShort(-15_000)).toBe("-1.5万");
  });
});
