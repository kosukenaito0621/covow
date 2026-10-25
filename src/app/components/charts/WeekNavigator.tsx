import { useT } from "../../i18n/I18nProvider";
import { CircleIconButton } from "../ui/Buttons";

const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

/** 「‹ 10/19 – 10/25 ›」。前の週・次の週 */
export function WeekNavigator({
  start,
  end,
  onPrev,
  onNext,
  nextDisabled,
  tone = "dark",
}: {
  start: string;
  end: string;
  onPrev: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  tone?: "light" | "dark";
}) {
  const { t } = useT();
  return (
    <div className="flex items-center justify-between gap-2">
      <CircleIconButton tone={tone} icon="chevronLeft" label={t("week.prev")} onClick={onPrev} />
      <p className="num text-[15px] font-semibold" aria-live="polite">
        <span className="sr-only">{t("week.current")} </span>
        {md(start)} – {md(end)}
      </p>
      <CircleIconButton
        tone={tone}
        icon="chevronRight"
        label={t("week.next")}
        onClick={onNext}
        disabled={nextDisabled}
        className="disabled:opacity-35"
      />
    </div>
  );
}
