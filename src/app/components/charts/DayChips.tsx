import { type KeyboardEvent, useRef } from "react";
import { spokenDate, weekdayLetter } from "@shared/i18n";
import { formatYen } from "@shared/money/amount";
import { useT } from "../../i18n/I18nProvider";

/**
 * 曜日の丸いチップ（細い線の円。選択中は塗りつぶし）。月曜はじまり。
 * 表示は1文字（英語 M T W T F S S／日本語 月〜日）、読み上げは日付と曜日と金額。左右の矢印キーで日を移動できる。
 */
export function DayChips({
  dates,
  amounts,
  selectedIndex,
  onSelect,
  today,
  tone = "dark",
}: {
  /** 月曜から日曜までの YYYY-MM-DD */
  dates: readonly string[];
  amounts: readonly number[];
  selectedIndex: number;
  onSelect: (i: number) => void;
  today?: string;
  /** 置かれる面。dark＝暗いガラスの上 */
  tone?: "light" | "dark";
}) {
  const { t, locale } = useT();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : -1;
    if (next < 0 || next >= dates.length) return;
    e.preventDefault();
    onSelect(next);
    refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={t("week.pickDay")} className="flex justify-between gap-1">
      {dates.map((d, i) => {
        const selected = i === selectedIndex;
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
            aria-label={`${spokenDate(d, i, locale)}${isToday ? `, ${t("week.today")}` : ""}, ${formatYen(amounts[i] ?? 0)}`}
            onClick={() => onSelect(i)}
            onKeyDown={(e) => onKey(e, i)}
            className={`relative inline-flex size-11 flex-col items-center justify-center rounded-full border text-[14px] font-semibold transition-colors duration-150 ${
              tone === "dark"
                ? selected
                  ? "border-white bg-white text-[#111827]"
                  : "border-white/35 text-white hover:bg-white/10"
                : selected
                  ? "border-ink bg-ink text-white"
                  : "border-ink/25 text-ink hover:bg-ink/5"
            }`}
          >
            <span aria-hidden="true">{weekdayLetter(i, locale)}</span>
            {isToday && (
              <span
                aria-hidden="true"
                className={`absolute bottom-1 size-1 rounded-full ${(tone === "dark") === selected ? "bg-[#111827]" : "bg-white"}`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
