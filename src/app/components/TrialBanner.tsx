import { useEffect, useState } from "react";
import { googleLoginUrl } from "../api/me";
import { useT } from "../i18n/I18nProvider";
import { useTheme } from "../theme/ThemeProvider";

/** 体験版の帯（画面のいちばん上）。残り時間と「Google で始める」。文言は言語の設定に従う */
export function TrialBanner({ expiresAt }: { expiresAt: string }) {
  const { t, locale } = useT();
  const { theme } = useTheme();
  const [now, setNow] = useState(() => Date.now());
  // 残り時間は1分ごとに更新する
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const hours = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 3_600_000));
  return (
    <div role="note" className="flex items-center justify-center gap-3 bg-[#ffd18b] px-4 py-1.5 text-[12px] font-semibold text-[#111827]">
      <span>{t("trial.banner", { hours })}</span>
      <a href={googleLoginUrl("/", locale, theme.id)} className="inline-flex min-h-8 items-center underline underline-offset-4">
        {t("trial.startGoogle")}
      </a>
    </div>
  );
}
