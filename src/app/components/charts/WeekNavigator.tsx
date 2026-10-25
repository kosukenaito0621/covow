import { CircleIconButton } from "../ui/Buttons";

const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

/** 「‹ 10/19 – 10/25 ›」。前の週・次の週 */
export function WeekNavigator({
  start,
  end,
  onPrev,
  onNext,
  nextDisabled,
}: {
  start: string;
  end: string;
  onPrev: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <CircleIconButton icon="chevronLeft" label="前の週" onClick={onPrev} />
      <p className="num text-[15px] font-semibold" aria-live="polite">
        <span className="sr-only">表示中の週 </span>
        {md(start)} – {md(end)}
      </p>
      <CircleIconButton
        icon="chevronRight"
        label="次の週"
        onClick={onNext}
        disabled={nextDisabled}
        className="disabled:opacity-35"
      />
    </div>
  );
}
