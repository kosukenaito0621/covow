import { useEffect } from "react";
import type { Me } from "../api/me";
import { useT } from "../i18n/I18nProvider";
import { useTheme } from "../theme/ThemeProvider";

/**
 * アカウントに保存された言語とテーマを、この端末の画面に反映する（画面には何も出さない）。
 * どの端末でログインしても同じ見た目になる。設定画面で変えたときの保存は、設定画面が API を呼んで行う。
 */
export function PreferencesSync({ me }: { me: Me }) {
  const { setTheme } = useTheme();
  const { setLocale } = useT();
  const { theme, locale } = me.user;

  useEffect(() => {
    setTheme(theme);
    setLocale(locale);
  }, [theme, locale, setTheme, setLocale]);

  return null;
}
