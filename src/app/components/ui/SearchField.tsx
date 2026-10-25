import { type ComponentProps, useId } from "react";
import { Icon } from "./Icon";

type Tone = "light" | "dark";

/** 虫めがね付きの検索欄。見た目のラベルは置かず、label を読み上げ用の名前にする */
export function SearchField({
  label,
  tone = "light",
  className,
  ...rest
}: Omit<ComponentProps<"input">, "type"> & { label: string; tone?: Tone }) {
  const id = useId();
  const color =
    tone === "dark"
      ? "border-white/25 bg-white/8 text-white placeholder:text-white/70"
      : "border-ink/18 bg-white/70 text-ink placeholder:text-ink-muted";
  return (
    <div className={`relative ${className ?? ""}`}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <Icon name="search" size={20} className="pointer-events-none absolute top-1/2 left-4 z-10 -translate-y-1/2 opacity-80" />
      <input
        id={id}
        type="search"
        enterKeyHint="search"
        className={`min-h-12 w-full rounded-full border pr-4 pl-11 text-[16px] backdrop-blur-md ${color}`}
        {...rest}
      />
    </div>
  );
}
