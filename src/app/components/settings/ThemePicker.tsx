import { motion } from "motion/react";
import { THEME_IDS, THEMES, type ThemeId } from "../../theme/themes";
import { Icon } from "../ui/Icon";

/**
 * テーマの選択。5色の見本を斜めのグラデーションにした小窓と名前を並べる。
 * 選ぶとすぐ画面全体が切り替わる（aria-pressed で選択中を伝える）。
 */
export function ThemePicker({ value, onChange, label }: { value: ThemeId; onChange: (id: ThemeId) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-3 gap-3">
      {THEME_IDS.map((id) => {
        const th = THEMES[id];
        const selected = id === value;
        const [a, b, c, d, e] = th.palette;
        return (
          <motion.button
            key={id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(id)}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col items-stretch gap-2 text-left"
          >
            <span
              className={`relative block aspect-[4/5] overflow-hidden rounded-[22px] ${
                selected ? "ring-2 ring-current ring-offset-2 ring-offset-transparent" : "ring-1 ring-current/20"
              }`}
              style={{
                background: `radial-gradient(120% 80% at 20% 10%, ${c}cc, transparent 60%), radial-gradient(90% 70% at 90% 90%, ${e}cc, transparent 60%), linear-gradient(160deg, ${a}, ${b} 45%, ${d})`,
              }}
            >
              {/* ガラスのつや */}
              <span className="absolute inset-x-2 top-2 h-1/3 rounded-[16px] bg-gradient-to-b from-white/45 to-white/0" aria-hidden="true" />
              <span className="absolute inset-x-3 bottom-3 flex gap-1" aria-hidden="true">
                {th.palette.map((p) => (
                  <span key={p} className="h-2 flex-1 rounded-full ring-1 ring-white/50" style={{ background: p }} />
                ))}
              </span>
              {selected && (
                <span className="absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-full bg-white text-[#111827] shadow">
                  <Icon name="check" size={16} />
                </span>
              )}
            </span>
            <span className={`px-1 text-[13px] ${selected ? "font-bold" : "font-medium"}`}>{th.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
