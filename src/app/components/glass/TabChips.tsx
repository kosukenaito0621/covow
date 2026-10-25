import { motion } from "motion/react";
import { type KeyboardEvent, useId, useRef } from "react";

/**
 * 上部の横並びチップ（選択中は白）。
 * role="tablist" で、左右の矢印キー・Home・End で移動できる。
 */
export function TabChips<T extends string>({
  options,
  value,
  onChange,
  label,
  tone = "light",
  idPrefix,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  /** タブ全体の名前（読み上げ用） */
  label: string;
  tone?: "light" | "dark";
  /** タブパネルと結びつけるための ID の頭 */
  idPrefix?: string;
}) {
  const layoutId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = options.findIndex((o) => o.value === value);

  const move = (e: KeyboardEvent, i: number) => {
    let next = -1;
    if (e.key === "ArrowRight") next = (i + 1) % options.length;
    if (e.key === "ArrowLeft") next = (i - 1 + options.length) % options.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = options.length - 1;
    if (next < 0) return;
    e.preventDefault();
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  };

  const idle = tone === "dark" ? "text-white border-white/30" : "text-ink border-ink/18 bg-white/40";

  return (
    <div role="tablist" aria-label={label} className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none]">
      {options.map((o, i) => {
        const selected = i === index;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={idPrefix ? `${idPrefix}-tab-${o.value}` : undefined}
            aria-controls={idPrefix ? `${idPrefix}-panel` : undefined}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => move(e, i)}
            className={`relative min-h-11 shrink-0 rounded-full border px-4 text-[14px] font-semibold whitespace-nowrap transition-colors ${
              selected ? "border-transparent text-ink" : idle
            }`}
          >
            {selected && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-white shadow-[0_6px_16px_-8px_rgb(23_36_58/0.45)]"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
