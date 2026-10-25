/** カラーテーマの ID（全6種）。画面と API（アカウントへの保存）の両方で使う */
export const THEME_IDS = ["aurora", "earthy", "tropical", "dusk", "sakura", "frost"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME: ThemeId = "aurora";

export const isThemeId = (v: unknown): v is ThemeId => typeof v === "string" && (THEME_IDS as readonly string[]).includes(v);
