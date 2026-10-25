import { Icon } from "./Icon";

/** メンバーの丸い印（名前の頭文字）。former＝退出したメンバー（人のアイコンを灰色で出す） */
export function Avatar({ name, size = 40, former }: { name: string; size?: number; former?: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      className={`add-orb inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${former ? "grayscale" : ""}`}
    >
      {former ? <Icon name="user" size={Math.round(size * 0.5)} /> : Array.from(name)[0]?.toUpperCase()}
    </span>
  );
}
