import { scaleLinear } from "d3-scale";
import { motion } from "motion/react";
import { formatNumber } from "@shared/money/amount";
import { useT } from "../../i18n/I18nProvider";

export interface MonthBar {
  key: string;
  /** 下に出す短い月の名前 */
  label: string;
  actual: number;
  budget: number | null;
}

/**
 * 月ごとの実支出の縦棒＋予算の点線。予算を超えた月は琥珀色の棒と「!」の印で示す（色だけに頼らない）。
 * summary はグラフの内容を文章で伝える代替テキスト。
 */
export function MonthlyBars({ bars, summary, selectedKey }: { bars: readonly MonthBar[]; summary: string; selectedKey?: string }) {
  const { t } = useT();
  const W = 320;
  const H = 168;
  const top = 26;
  const bottom = 26;
  const max = Math.max(1, ...bars.map((b) => Math.max(b.actual, b.budget ?? 0)));
  const y = scaleLinear()
    .domain([0, max])
    .range([H - bottom, top]);
  const slot = W / bars.length;
  const barW = Math.min(28, slot * 0.46);

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={summary} className="block overflow-visible">
        <line x1={0} x2={W} y1={H - bottom} y2={H - bottom} stroke="currentColor" strokeOpacity="0.25" />
        {bars.map((b, i) => {
          const cx = slot * i + slot / 2;
          const over = b.budget !== null && b.actual > b.budget;
          const selected = b.key === selectedKey;
          const h = H - bottom - y(b.actual);
          return (
            <g key={b.key}>
              <motion.rect
                x={cx - barW / 2}
                width={barW}
                rx={barW / 2}
                initial={{ y: H - bottom, height: 0 }}
                animate={{ y: y(b.actual), height: Math.max(h, 0) }}
                transition={{ duration: 0.5, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                fill={over ? "var(--glow-amber)" : "currentColor"}
                fillOpacity={over ? 0.95 : selected ? 0.9 : 0.42}
              />
              {b.budget !== null && (
                <line
                  x1={cx - slot * 0.4}
                  x2={cx + slot * 0.4}
                  y1={y(b.budget)}
                  y2={y(b.budget)}
                  stroke="currentColor"
                  strokeOpacity="0.7"
                  strokeDasharray="2 3"
                  strokeWidth="1.25"
                />
              )}
              <text
                x={cx}
                y={y(b.actual) - 8}
                textAnchor="middle"
                fill="currentColor"
                fontSize="11"
                fontWeight={selected ? 700 : 500}
                className="num"
              >
                {formatNumber(b.actual)}
              </text>
              <text x={cx} y={H - 6} textAnchor="middle" fill="currentColor" fontSize="12" fontWeight={selected ? 700 : 500}>
                {b.label}
              </text>
              {over && (
                <g transform={`translate(${cx}, ${y(b.actual) + 12})`}>
                  <circle r="7" fill="#111827" />
                  <text y="3.5" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--glow-amber)">
                    !
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-medium">
        <span className="inline-flex items-center gap-2">
          <svg width="18" height="2" aria-hidden="true">
            <line x1="0" x2="18" y1="1" y2="1" stroke="currentColor" strokeOpacity="0.7" strokeDasharray="2 3" />
          </svg>
          {t("home.budget")}
        </span>
        <span className="inline-flex items-center gap-1">
          <span aria-hidden="true" className="inline-flex size-[14px] items-center justify-center rounded-full bg-[#111827] text-[10px] font-bold text-amber">
            !
          </span>
          {t("insights.overMonth")}
        </span>
      </figcaption>
    </figure>
  );
}

