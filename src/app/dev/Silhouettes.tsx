import type { CSSProperties, ReactNode } from "react";

/*
 * テーマごとの背景のシルエット（ピントの外れた大きな影）。
 * 3つの層を重ねる：
 *  1) 色のにじみ（テーマのアクセント色。少しずらして強くぼかす。写真の色収差のような縁の光）
 *  2) 横に流れる残像（横方向にだけ強くぼかす）
 *  3) 影の本体（横長にぼかす）
 * 静止画で、アニメーションさせない。色と濃さはテーマの変数（--sil-color / --sil-halo / --sil-opacity）で決める。
 */

export type SilhouetteTheme = "aurora" | "earthy" | "tropical" | "dusk" | "sakura" | "frost";

interface Shape {
  viewBox: string;
  /** 画面の中での大きさと位置 */
  style: CSSProperties;
  /** 色のにじみをずらす向き（px、viewBox の単位） */
  haloShift: [number, number];
  /** SVG の preserveAspectRatio（既定は下端にそろえて全体を収める） */
  aspect?: string;
  /** ぼかしの強さ（1＝標準）。形が大事なもの（ビルの輪郭など）は弱める */
  blur?: number;
  /** 色のにじみの濃さ（既定 0.85） */
  haloOpacity?: number;
  body: ReactNode;
}

// 直立して横（右）を向いている人の上半身
const person: Shape = {
  viewBox: "0 0 300 400",
  style: { height: "92vh", maxHeight: 900, left: "52%" },
  haloShift: [-12, 4],
  body: (
    <path
      d="M70 400 C68 340 86 300 122 284 C134 279 140 268 140 254 C140 240 132 228 122 215
         C100 190 98 130 118 95 C135 62 175 52 205 70 C222 82 228 100 226 118
         C226 126 232 134 240 145 C243 150 238 154 232 156 C234 162 232 167 228 170
         C231 175 229 181 224 184 C226 192 222 200 210 204 C200 207 190 206 185 210
         C184 225 186 240 192 252 C215 262 244 280 254 312 C262 340 266 370 268 400 Z"
    />
  ),
};

// マッターホルン（ユーザーの写真を参考に）：左のゆるい稜線、左に少し曲がった鋭い山頂、切り立った右の壁、右の肩。
// 山は画面の上の方に置き、下は手前の尾根を重ねて画面の下まで続ける
const mountain: Shape = {
  viewBox: "0 0 600 600",
  style: { height: "72vh", width: "auto", left: "42%" },
  haloShift: [6, -8],
  body: (
    <>
      <path
        d="M-1600 430 L-1600 322 L-900 318 L-300 312 L0 306 L26 298 L52 318 L102 306 L150 300 L205 292 L250 240 L285 172 L300 150
           L338 50 L352 26 L370 20 L384 30 L414 80 L456 118 L462 150 L500 175 L522 186 L560 210
           L600 238 L760 268 L1000 296 L1600 312 L2200 320 L2200 430 Z"
      />
      {/* 手前の尾根（遠いほど淡く、近いほど濃く） */}
      <path opacity="0.3" d="M-1600 600 L-1600 414 C-900 398 -400 424 0 410 C80 392 140 424 220 404 C300 384 360 416 440 400 C520 386 570 404 600 396 C900 384 1500 412 2200 402 L2200 600 Z" />
      <path opacity="0.28" d="M-1600 600 L-1600 492 C-800 476 -300 500 0 488 C110 470 190 500 300 482 C410 464 500 492 600 474 C1000 462 1600 490 2200 478 L2200 600 Z" />
    </>
  ),
};

// ヤシの木（ユーザーの写真を参考に）：とても高く細い3本の幹と、小さくとがった扇形の葉
const FROND_ANGLES = [-168, -150, -132, -114, -98, -82, -66, -48, -30, -12, 8, 26, 154, 172];

/** 中心から放射状に伸びる細い葉で、ヤシの樹冠をつくる */
function crown(cx: number, cy: number, size: number) {
  return FROND_ANGLES.map((deg, i) => {
    const r = (deg * Math.PI) / 180;
    const len = size * (0.8 + ((i * 37) % 10) / 30);
    const tx = cx + Math.cos(r) * len;
    const ty = cy + Math.sin(r) * len + (deg > 0 || deg < -150 ? len * 0.25 : 0); // 横の葉は少し垂れる
    const px = -Math.sin(r) * size * 0.09;
    const py = Math.cos(r) * size * 0.09;
    return <polygon key={deg} points={`${cx + px},${cy + py} ${tx},${ty} ${cx - px},${cy - py}`} />;
  });
}

/** 下が太く上が細い、少し傾いた幹 */
function trunk(bottomX: number, topX: number, topY: number, w: number) {
  return <polygon points={`${bottomX - w},800 ${topX - w * 0.55},${topY} ${topX + w * 0.55},${topY} ${bottomX + w},800`} />;
}

const palm: Shape = {
  viewBox: "0 0 400 800",
  style: { height: "100vh", maxHeight: 980, left: "40%", bottom: 0 },
  haloShift: [-8, 5],
  body: (
    <>
      {trunk(70, 120, 120, 8)}
      {crown(120, 118, 66)}
      {trunk(165, 175, 175, 7)}
      {crown(175, 172, 58)}
      {trunk(230, 232, 140, 7)}
      {crown(232, 138, 62)}
    </>
  ),
};

// 高層ビル群を見上げる構図（ユーザーの写真を参考に）：画面の四方から、ビルが中央の空に向かって伸びる
const skyline: Shape = {
  viewBox: "0 0 400 800",
  style: { width: "100vw", height: "100vh", top: 0, bottom: "auto" },
  aspect: "xMidYMid slice",
  haloShift: [-6, 4],
  blur: 0.45,
  haloOpacity: 0.35,
  body: (
    <>
      {/* 画面の端から中央の空へ向かって細くなるビル。中央は広く空ける */}
      <polygon points="-10,-10 200,-10 150,180 -10,250" />
      <polygon points="300,-10 410,-10 410,190 270,170" />
      <polygon points="-10,330 110,320 120,370 -10,470" />
      <polygon points="410,290 290,320 300,360 410,420" />
      <polygon points="-10,810 -10,690 120,560 150,600 90,810" />
      <polygon points="165,810 185,610 225,608 250,810" />
      <polygon points="300,810 250,520 280,505 410,640 410,810" />
    </>
  ),
};

// 一本桜（ユーザーの写真を参考に）：横に広く、少し左右非対称な丸い樹冠。短い幹が二股に分かれ、なだらかな丘に立つ。
// 木は画面の上の方に置き、下は丘の草原を画面の下まで続ける
const sakuraTree: Shape = {
  viewBox: "0 0 480 520",
  style: { height: "72vh", width: "auto", left: "46%" },
  haloShift: [-8, 5],
  body: (
    <>
      <path d="M-1600 254 C-700 246 -200 250 0 248 C120 242 360 238 480 244 C800 250 1500 242 2200 248 L2200 520 L-1600 520 Z" opacity="0.32" />
      <path d="M-1600 336 C-800 330 -200 344 0 340 C140 324 330 334 480 318 C900 310 1500 330 2200 322 L2200 520 L-1600 520 Z" opacity="0.22" />
      <path d="M-1600 436 C-800 430 -200 444 0 440 C160 428 320 436 480 424 C900 418 1500 436 2200 428 L2200 520 L-1600 520 Z" opacity="0.2" />
      {/* 木の影 */}
      <ellipse cx="216" cy="256" rx="130" ry="9" opacity="0.4" />
      <path
        d="M182 252 C186 232 188 214 182 198 L162 182 L170 176 L190 192 C196 182 206 174 218 168
           L224 176 C210 184 204 198 204 214 C204 228 208 242 214 252 Z"
      />
      <circle cx="195" cy="122" r="84" />
      <circle cx="122" cy="148" r="62" />
      <circle cx="270" cy="130" r="72" />
      <circle cx="84" cy="176" r="40" />
      <circle cx="322" cy="160" r="46" />
      <circle cx="164" cy="72" r="54" />
      <circle cx="236" cy="74" r="56" />
      <circle cx="202" cy="46" r="38" />
      <circle cx="128" cy="104" r="48" />
      <circle cx="292" cy="96" r="48" />
      <circle cx="58" cy="188" r="22" />
      <circle cx="346" cy="176" r="24" />
      <circle cx="148" cy="180" r="34" />
      <circle cx="256" cy="178" r="38" />
    </>
  ),
};

// 氷山（水面から突き出た部分と、水面下にうっすら見える部分）。
// 氷山は画面の上の方に置き、下は水面と、水に映った氷山・さざ波を画面の下まで続ける
const ICEBERG = "M40 250 L130 160 L168 182 L226 70 L262 116 L300 30 L350 126 L388 104 L462 192 L560 250 Z";
const iceberg: Shape = {
  viewBox: "0 0 600 600",
  style: { height: "72vh", width: "auto" },
  haloShift: [-8, -4],
  body: (
    <>
      <path d={ICEBERG} />
      <path opacity="0.2" d="M-1600 256 L2200 256 L2200 600 L-1600 600 Z" />
      {/* 水に映った氷山（水面で上下反転） */}
      <path opacity="0.2" d={ICEBERG} transform="translate(0 512) scale(1 -1)" />
      <path opacity="0.45" d="M60 256 L540 256 L486 320 L330 344 L150 326 Z" />
      {/* さざ波 */}
      <rect x="80" y="300" width="160" height="2" opacity="0.3" />
      <rect x="360" y="330" width="140" height="2" opacity="0.3" />
      <rect x="40" y="400" width="220" height="2" opacity="0.25" />
      <rect x="320" y="450" width="200" height="2" opacity="0.25" />
      <rect x="120" y="520" width="260" height="2" opacity="0.2" />
    </>
  ),
};

const SHAPES: Record<SilhouetteTheme, Shape> = {
  aurora: person,
  earthy: mountain,
  tropical: palm,
  dusk: skyline,
  sakura: sakuraTree,
  frost: iceberg,
};

export function Silhouette({ theme }: { theme: SilhouetteTheme }) {
  const s = SHAPES[theme];
  const id = `sil-${theme}`;
  const k = s.blur ?? 1;
  const sd = (x: number, y: number) => `${(x * k).toFixed(1)} ${(y * k).toFixed(1)}`;
  return (
    <svg
      className="silhouette"
      viewBox={s.viewBox}
      preserveAspectRatio={s.aspect ?? "xMidYMax meet"}
      style={s.style}
      aria-hidden="true"
    >
      <defs>
        <filter id={`${id}-body`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={sd(9, 4)} />
        </filter>
        <filter id={`${id}-halo`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={sd(16, 10)} />
        </filter>
        <filter id={`${id}-streak`} x="-50%" y="-10%" width="200%" height="120%">
          <feGaussianBlur stdDeviation={sd(40, 1.5)} />
        </filter>
      </defs>
      {/* 1) 色のにじみ */}
      <g filter={`url(#${id}-halo)`} fill="var(--sil-halo)" opacity={s.haloOpacity ?? 0.85} transform={`translate(${s.haloShift[0]} ${s.haloShift[1]})`}>
        {s.body}
      </g>
      {/* 2) 横に流れる残像 */}
      <g filter={`url(#${id}-streak)`} fill="var(--sil-color)" opacity="0.5">
        {s.body}
      </g>
      {/* 3) 影の本体 */}
      <g filter={`url(#${id}-body)`} fill="var(--sil-color)">
        {s.body}
      </g>
    </svg>
  );
}
