import { type KeyboardEvent, useRef } from "react";
import { formatYen } from "@shared/money/amount";

// 表示は英字1文字（月曜はじまりなので M T W T F S S）。読み上げは日本語の曜日
const WEEKDAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"] as const;
const WEEKDAYS = ["月", "火", "水", "木", "金", "土", "日"] as const;

/**
 * 曜日の丸いチップ（細い線の円。選択中は白い円＋濃い文字）。
 * 左右の矢印キーで日を移動できる。
 */
export function DayChips({
  dates,
  amounts,
  selectedIndex,
  onSelect,
  today,
  tone = "dark",
}: {
  /** 置かれる面。dark＝スモークガラスの上 */
  tone?: "light" | "dark";
  /** 月曜から日曜までの YYYY-MM-DD */
  dates: readonly string[];
  amounts: readonly number[];
  selectedIndex: number;
  onSelect: (i: number) => void;
  today?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : -1;
    if (next < 0 || next >= dates.length) return;
    e.preventDefault();
    onSelect(next);
    refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-label="日を選ぶ" className="flex justify-between gap-1">
      {dates.map((d, i) => {
        const selected = i === selectedIndex;
        const [, m, day] = d.split("-");
        const isToday = d === today;
        return (
          <button
            key={d}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            aria-label={`${Number(m)}月${Number(day)}日（${WEEKDAYS[i]}）${isToday ? "、今日" : ""}、${formatYen(amounts[i] ?? 0)}`}
            onClick={() => onSelect(i)}
            onKeyDown={(e) => onKey(e, i)}
            className={`relative inline-flex size-11 flex-col items-center justify-center rounded-full border text-[14px] font-semibold transition-colors duration-150 ${
              tone === "dark"
                ? selected
                  ? "border-white bg-white text-ink"
                  : "border-white/35 text-white hover:bg-white/10"
                : selected
                  ? "border-ink bg-ink text-white"
                  : "border-ink/25 text-ink hover:bg-ink/5"
            }`}
          >
            <span aria-hidden="true">{WEEKDAY_LETTERS[i]}</span>
            {isToday && (
              <span
                aria-hidden="true"
                className={`absolute bottom-1 size-1 rounded-full ${
                  (tone === "dark") === selected ? "bg-ink" : "bg-white"
                }`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
