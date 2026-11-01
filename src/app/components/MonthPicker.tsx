import { useState } from "react";
import { addMonths, type YearMonth } from "@shared/date/jst";
import { formatMonth, formatMonthShort } from "@shared/i18n";
import { useT } from "../i18n/I18nProvider";
import { useTheme } from "../theme/ThemeProvider";
import { GlassSheet } from "./glass/GlassSheet";
import { CircleIconButton } from "./ui/Buttons";

/**
 * 月の切り替え（‹ 2026年11月 ›）。月の名前を押すと、月を選ぶカレンダー（12か月・年の切り替え）が開く。
 */
export function MonthSwitcher({ value, onChange }: { value: YearMonth; onChange: (ym: YearMonth) => void }) {
  const { t, locale } = useT();
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <div className="-ml-1 flex items-center gap-1">
      <CircleIconButton tone={theme.tone.page} icon="chevronLeft" label={t("home.prevMonth")} onClick={() => onChange(addMonths(value, -1))} />
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={t("month.pick", { month: formatMonth(value, locale) })}
        className="num inline-flex min-h-11 items-center rounded-full px-2 text-[15px] font-semibold underline decoration-current/40 underline-offset-4"
      >
        {formatMonth(value, locale)}
      </button>
      <CircleIconButton tone={theme.tone.page} icon="chevronRight" label={t("home.nextMonth")} onClick={() => onChange(addMonths(value, 1))} />
      <MonthPickerSheet
        key={open ? value : "closed"}
        open={open}
        value={value}
        onClose={() => setOpen(false)}
        onSelect={(ym) => {
          setOpen(false);
          onChange(ym);
        }}
      />
    </div>
  );
}

function MonthPickerSheet({
  open,
  value,
  onClose,
  onSelect,
}: {
  open: boolean;
  value: YearMonth;
  onClose: () => void;
  onSelect: (ym: YearMonth) => void;
}) {
  const { t, locale } = useT();
  const [year, setYear] = useState(Number(value.slice(0, 4)));
  const months = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}` as YearMonth);
  return (
    <GlassSheet open={open} onClose={onClose} title={t("month.pickTitle")}>
      <div className="flex flex-col gap-4 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between">
          <CircleIconButton tone="dark" icon="chevronLeft" label={t("month.prevYear")} onClick={() => setYear((y) => y - 1)} />
          <p className="num text-[17px] font-semibold">{locale === "ja" ? `${year}年` : year}</p>
          <CircleIconButton tone="dark" icon="chevronRight" label={t("month.nextYear")} onClick={() => setYear((y) => y + 1)} />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {months.map((ym) => (
            <button
              key={ym}
              type="button"
              onClick={() => onSelect(ym)}
              aria-pressed={ym === value}
              aria-label={formatMonth(ym, locale)}
              className={`num min-h-12 rounded-full border text-[15px] font-semibold ${ym === value ? "border-white bg-white text-[#111827]" : "border-white/25 text-white"}`}
            >
              {formatMonthShort(ym, locale)}
            </button>
          ))}
        </div>
      </div>
    </GlassSheet>
  );
}
