import { scaleLinear } from "d3-scale";
import { curveMonotoneX, line } from "d3-shape";
import { motion } from "motion/react";
import { useId } from "react";
import { formatYen } from "@shared/money/amount";

export interface CurvePoint {
  key: string;
  amount: number;
}

/**
 * 白い細い曲線＋点線の基準線（平均）＋選択点のレンズ（半透明の円）と点線の垂線。
 * 1週間の日別支出に使う。summary はグラフの内容を文章で伝える代替テキスト。
 */
export function SpendCurve({
  points,
  selectedIndex,
  summary,
  height = 132,
  baseline,
}: {
  points: readonly CurvePoint[];
  selectedIndex: number;
  summary: string;
  height?: number;
  /** 点線の基準線の値と名前（例：平均）。null なら描かない */
  baseline?: { value: number; label: string } | null;
}) {
  const gradId = useId();
  const W = 320;
  const H = height;
  const padX = 22;
  const top = 40; // レンズの上の金額ラベルの場所
  const bottom = 14;
  const max = Math.max(1, ...points.map((p) => p.amount), baseline?.value ?? 0);
  const x = scaleLinear()
    .domain([0, Math.max(1, points.length - 1)])
    .range([padX, W - padX]);
  const y = scaleLinear()
    .domain([0, max])
    .range([H - bottom, top]);
  const path =
    line<CurvePoint>()
      .x((_, i) => x(i))
      .y((p) => y(p.amount))
      .curve(curveMonotoneX)(points as CurvePoint[]) ?? "";
  const area = `${path} L${x(points.length - 1)},${H - bottom} L${x(0)},${H - bottom} Z`;
  const sel = points[selectedIndex];
  const sx = x(selectedIndex);
  const sy = sel ? y(sel.amount) : H - bottom;
  const labelX = Math.min(Math.max(sx, 44), W - 44);

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={summary} className="block overflow-visible">
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.16" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {baseline && (
          <g>
            <line
              x1={padX}
              x2={W - padX}
              y1={y(baseline.value)}
              y2={y(baseline.value)}
              stroke="currentColor"
              strokeOpacity="0.45"
              strokeWidth="1"
              strokeDasharray="2 4"
            />
          </g>
        )}
        <motion.path
          d={area}
          fill={`url(#${gradId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        />
        <motion.path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
        {sel && (
          <motion.g initial={false} animate={{ x: sx, y: 0 }} transition={{ type: "spring", stiffness: 380, damping: 34 }}>
            <motion.line
              x1={0}
              x2={0}
              y2={H - bottom}
              initial={false}
              animate={{ y1: sy }}
              stroke="currentColor"
              strokeOpacity="0.55"
              strokeDasharray="2 3"
              strokeWidth="1"
            />
            <motion.circle
              r="18"
              cx={0}
              initial={false}
              animate={{ cy: sy }}
              fill="currentColor"
              fillOpacity="0.12"
              stroke="currentColor"
              strokeOpacity="0.45"
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
            />
            <motion.circle r="4" cx={0} initial={false} animate={{ cy: sy }} fill="currentColor" />
          </motion.g>
        )}
        {sel && (
          // 曲線と重なっても読めるよう、金額の下に暗い札を敷く
          <motion.g
            initial={false}
            animate={{ x: labelX, y: Math.max(sy - 30, 14) }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            aria-hidden="true"
          >
            <rect x={-38} y={-12} width={76} height={24} rx={12} fill="#111827" fillOpacity="0.82" stroke="currentColor" strokeOpacity="0.25" />
            <text y={4.5} textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="600" className="num">
              {formatYen(sel.amount)}
            </text>
          </motion.g>
        )}
      </svg>
      {baseline && (
        <figcaption className="mt-1 flex items-center gap-2 text-[12px] opacity-80">
          <svg width="18" height="2" aria-hidden="true">
            <line x1="0" x2="18" y1="1" y2="1" stroke="currentColor" strokeOpacity="0.6" strokeDasharray="2 3" />
          </svg>
          {baseline.label} <span className="num">{formatYen(baseline.value)}</span>
        </figcaption>
      )}
    </figure>
  );
}
