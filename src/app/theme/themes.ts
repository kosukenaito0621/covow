import type { ThemeId } from "@shared/theme";

/** カラーテーマ（全6種）。CSS の値は styles/themes.css の [data-theme] にある。ID の一覧は shared/theme */
export { DEFAULT_THEME, isThemeId, THEME_IDS, type ThemeId } from "@shared/theme";

type Tone = "light" | "dark";

export interface ThemeMeta {
  id: ThemeId;
  label: string;
  /** 画面の地・ヒーローカード・一覧カードが明るいか暗いか（部品の文字色を決める） */
  tone: { page: Tone; hero: Tone; card: Tone };
  /** ブラウザの上部の色（<meta name="theme-color">）。画面の地の色に合わせる */
  metaColor: string;
  /** 設定画面の見本に出す5色 */
  palette: readonly [string, string, string, string, string];
}

export const THEMES: Record<ThemeId, ThemeMeta> = {
  aurora: {
    id: "aurora",
    metaColor: "#060A18",
    label: "Aurora",
    tone: { page: "dark", hero: "dark", card: "dark" },
    palette: ["#060A18", "#082858", "#16CEC6", "#B794DB", "#FC73A9"],
  },
  earthy: {
    id: "earthy",
    metaColor: "#F4EDE0",
    label: "Earthy",
    tone: { page: "light", hero: "dark", card: "light" },
    palette: ["#6C4A3A", "#9A6A4F", "#C6925A", "#DDC38A", "#7B8A6A"],
  },
  tropical: {
    id: "tropical",
    metaColor: "#F8F4EA",
    label: "Tropical",
    tone: { page: "light", hero: "light", card: "light" },
    palette: ["#A6C4B0", "#A3D1BF", "#B2E0C9", "#F8DAB9", "#F59C8E"],
  },
  dusk: {
    id: "dusk",
    metaColor: "#1E1B3A",
    label: "Dusk",
    tone: { page: "dark", hero: "dark", card: "dark" },
    palette: ["#1E1B3A", "#4B2E6F", "#C2508A", "#FF8C69", "#FFD39A"],
  },
  sakura: {
    id: "sakura",
    metaColor: "#FFF4F6",
    label: "Sakura",
    tone: { page: "light", hero: "light", card: "light" },
    palette: ["#FFF4F6", "#F7C9D4", "#E89AB0", "#B5677F", "#5A3645"],
  },
  frost: {
    id: "frost",
    metaColor: "#F8FBFE",
    label: "Frost",
    tone: { page: "light", hero: "light", card: "light" },
    palette: ["#F5F9FC", "#DCEBF5", "#C5D3DC", "#9FC3DA", "#FFE9D2"],
  },
};

