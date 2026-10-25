import { useId, type ReactNode } from "react";

/*
 * COVOW のロゴアイコンの候補（開発環境だけ）。
 * CO（共同）＋ VOW（誓い）／ガラス・水・光・オーロラ。どの案も、暗いスモークガラスの角丸の上に光で描く。
 *  A. Two Lights：2つの光の輪が重なり、重なったところ（ふたりが合意したところ）がいちばん明るく光る
 *  B. Ring：誓いの指輪のような光の輪。輪の切れ目に、満ちていく水滴（予算の残り）
 *  C. Vow Mark：2本の光の流れが下で1点に合わさって V（Vow）になる。合わさる点にきらめき
 */

function IconBase({ size, children }: { size: number; children: (ids: { glow: string; grain: string }) => ReactNode }) {
  const id = useId().replace(/:/g, "");
  const ids = { glow: `g-${id}`, grain: `n-${id}` };
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" role="img" aria-label="COVOW">
      <defs>
        <radialGradient id={`${ids.glow}-bg`} cx="30%" cy="85%" r="95%">
          <stop offset="0" stopColor="#0f3d55" />
          <stop offset="0.55" stopColor="#0b1a36" />
          <stop offset="1" stopColor="#060a18" />
        </radialGradient>
        <filter id={ids.grain}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.06 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <filter id={ids.glow} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="14" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id={`${ids.glow}-shape`}>
          <rect width="512" height="512" rx="116" />
        </clipPath>
        <linearGradient id={`${ids.glow}-edge`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="0.4" stopColor="#ffffff" stopOpacity="0.08" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      {/* 角丸のスモークガラス（中身はすべて角丸の内側に収める） */}
      <g clipPath={`url(#${ids.glow}-shape)`}>
      <rect width="512" height="512" rx="116" fill={`url(#${ids.glow}-bg)`} />
      <ellipse cx="140" cy="430" rx="220" ry="150" fill="#16cec6" opacity="0.22" />
      <ellipse cx="420" cy="120" rx="200" ry="140" fill="#b794db" opacity="0.2" />
      {children(ids)}
      {/* 上の反射と縁の光 */}
      <path d="M116 0 H396 A116 116 0 0 1 512 116 V150 C380 120 160 140 0 210 V116 A116 116 0 0 1 116 0 Z" fill="#fff" opacity="0.06" />
      <rect x="2" y="2" width="508" height="508" rx="114" fill="none" stroke={`url(#${ids.glow}-edge)`} strokeWidth="4" />
      <rect width="512" height="512" rx="116" fill="#fff" filter={`url(#${ids.grain})`} />
      </g>
    </svg>
  );
}

/** A. Two Lights */
function MarkA({ size }: { size: number }) {
  return (
    <IconBase size={size}>
      {({ glow }) => (
        <g filter={`url(#${glow})`}>
          <defs>
            <linearGradient id={`${glow}-a1`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#7ff3ea" />
              <stop offset="1" stopColor="#16cec6" />
            </linearGradient>
            <linearGradient id={`${glow}-a2`} x1="1" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fc73a9" />
              <stop offset="1" stopColor="#b794db" />
            </linearGradient>
            <clipPath id={`${glow}-clip`}>
              <circle cx="206" cy="256" r="108" />
            </clipPath>
          </defs>
          <circle cx="206" cy="256" r="108" fill="none" stroke={`url(#${glow}-a1)`} strokeWidth="30" />
          <circle cx="306" cy="256" r="108" fill="none" stroke={`url(#${glow}-a2)`} strokeWidth="30" />
          {/* 重なったところ（ふたりが合意したところ）が明るく光る */}
          <circle cx="306" cy="256" r="108" fill="#ffffff" opacity="0.32" clipPath={`url(#${glow}-clip)`} />
          <path d="M256 228 L262 250 L284 256 L262 262 L256 284 L250 262 L228 256 L250 250 Z" fill="#fff" />
        </g>
      )}
    </IconBase>
  );
}

/** B. Ring */
function MarkB({ size }: { size: number }) {
  return (
    <IconBase size={size}>
      {({ glow }) => (
        <g filter={`url(#${glow})`}>
          <defs>
            <linearGradient id={`${glow}-b`} x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#16cec6" />
              <stop offset="0.55" stopColor="#b794db" />
              <stop offset="1" stopColor="#fc73a9" />
            </linearGradient>
          </defs>
          {/* 右上が開いた光の輪（C の形） */}
          <path d="M366 166 A136 136 0 1 0 392 256" fill="none" stroke={`url(#${glow}-b)`} strokeWidth="34" strokeLinecap="round" />
          {/* 輪の切れ目に浮かぶ水滴 */}
          <path d="M392 150 C392 150 352 196 352 222 A40 40 0 0 0 432 222 C432 196 392 150 392 150 Z" fill="#bdefff" opacity="0.95" />
          <path d="M378 214 A18 18 0 0 0 392 236" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" opacity="0.8" />
        </g>
      )}
    </IconBase>
  );
}

/** C. Vow Mark */
function MarkC({ size }: { size: number }) {
  return (
    <IconBase size={size}>
      {({ glow }) => (
        <g filter={`url(#${glow})`}>
          <defs>
            <linearGradient id={`${glow}-c1`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#16cec6" stopOpacity="0.15" />
              <stop offset="1" stopColor="#7ff3ea" />
            </linearGradient>
            <linearGradient id={`${glow}-c2`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fc73a9" stopOpacity="0.15" />
              <stop offset="1" stopColor="#d9b8f0" />
            </linearGradient>
          </defs>
          {/* 2本の光の流れが、下で1点に合わさって V になる */}
          <path d="M138 130 C170 220 210 300 256 384" fill="none" stroke={`url(#${glow}-c1)`} strokeWidth="38" strokeLinecap="round" />
          <path d="M374 130 C342 220 302 300 256 384" fill="none" stroke={`url(#${glow}-c2)`} strokeWidth="38" strokeLinecap="round" />
          <circle cx="256" cy="384" r="26" fill="#ffffff" />
          <path d="M256 330 L262 372 L304 384 L262 396 L256 438 L250 396 L208 384 L250 372 Z" fill="#fff" opacity="0.9" />
        </g>
      )}
    </IconBase>
  );
}

const CONCEPTS = [
  { key: "A", name: "Two Lights", note: "2つの光の輪が重なり、重なったところ（ふたりが合意したところ）が明るく光る。CO＝一緒に", Mark: MarkA },
  { key: "B", name: "Ring", note: "誓いの指輪のような光の輪（C の形）。切れ目に浮かぶ水滴は、満ちていく予算", Mark: MarkB },
  { key: "C", name: "Vow Mark", note: "2本の光の流れが下で1点に合わさり V（Vow）になる。合わさる点にきらめき", Mark: MarkC },
] as const;

export default function LogoConcepts() {
  return (
    <main className="mx-auto flex max-w-[1100px] flex-col gap-10 px-4 py-8 font-ui text-[#111827]">
      <h1 className="text-[20px] font-bold">COVOW logo concepts</h1>
      <div className="grid gap-8 md:grid-cols-3">
        {CONCEPTS.map(({ key, name, note, Mark }) => (
          <section key={key} className="flex flex-col gap-4 rounded-[28px] bg-[#eceef1] p-5" data-concept={key}>
            <h2 className="text-[15px] font-semibold">
              {key}. {name}
            </h2>
            <Mark size={220} />
            <div className="flex items-end gap-3">
              <Mark size={64} />
              <Mark size={40} />
              <Mark size={24} />
            </div>
            {/* ワードマーク */}
            <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
              <Mark size={36} />
              <span className="text-[22px] font-semibold tracking-[0.18em]">COVOW</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-[#060a18] px-4 py-3 text-white">
              <Mark size={36} />
              <span className="text-[22px] font-semibold tracking-[0.18em]">COVOW</span>
            </div>
            <p className="text-[13px] leading-relaxed text-[#4b5563]">{note}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
