import { createFileRoute, redirect } from "@tanstack/react-router";
import { motion } from "motion/react";
import type { MessageKey } from "@shared/i18n";
import { googleLoginUrl, meQuery } from "../api/me";
import { TabChips } from "../components/glass/TabChips";
import { Icon } from "../components/ui/Icon";
import { useT } from "../i18n/I18nProvider";
import { useTheme } from "../theme/ThemeProvider";

type LoginSearch = { next?: string; error?: "cancelled" | "expired" | "failed" };

const ERRORS: Record<NonNullable<LoginSearch["error"]>, MessageKey> = {
  cancelled: "login.error.cancelled",
  expired: "login.error.expired",
  failed: "login.error.failed",
};

/** 戻り先は自分のサイトの中のパスだけ（サーバーでも同じ確認をする） */
const safeNext = (v: unknown) =>
  typeof v === "string" && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : undefined;

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): LoginSearch => ({
    next: safeNext(s.next),
    error: s.error === "cancelled" || s.error === "expired" || s.error === "failed" ? s.error : undefined,
  }),
  // すでにログインしていれば、そのまま戻り先へ
  beforeLoad: async ({ context, search }) => {
    const me = await context.queryClient.ensureQueryData(meQuery);
    if (me) throw redirect({ href: search.next ?? "/" });
  },
  component: Login,
});

function Login() {
  const { next, error } = Route.useSearch();
  const { t, locale, setLocale } = useT();
  const { theme } = useTheme();
  const muted = theme.tone.page === "light" ? "text-current/85" : "text-white/90";

  return (
    <main className="mx-auto flex min-h-dvh max-w-[var(--app-max)] flex-col px-[var(--gutter)] pt-6 pb-[calc(env(safe-area-inset-bottom)+32px)]">
      <div className="flex justify-end">
        <TabChips
          label={t("settings.language")}
          value={locale}
          onChange={setLocale}
          tone={theme.tone.page}
          options={[
            { value: "en", label: "EN" },
            { value: "ja", label: "日本語" },
          ]}
        />
      </div>

      <motion.section
        aria-labelledby="login-title"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-1 flex-col justify-end gap-8 pb-6"
      >
        <div>
          <p className="text-[56px] leading-none font-bold tracking-tight">COVOW</p>
          <p className="mt-3 text-[22px] leading-snug font-semibold">Decide together.<br />Spend better.</p>
          <p className={`mt-4 max-w-[34ch] text-[15px] leading-relaxed ${muted}`}>{t("login.lead")}</p>
        </div>

        <div className="lg lg-card flex flex-col gap-4 rounded-[28px] p-5">
          <h1 id="login-title" className="sr-only">
            {t("login.title")}
          </h1>
          {error && (
            <p role="alert" className="flex items-start gap-2 rounded-[16px] bg-[#ffd18b] px-4 py-3 text-[14px] font-medium text-[#111827]">
              <Icon name="attention" size={20} className="mt-px shrink-0" />
              {t(ERRORS[error])}
            </p>
          )}
          {/* 画面の移動で Google へ行くので、ボタンではなくリンクにする */}
          <a
            href={googleLoginUrl(next ?? "/", locale, theme.id)}
            className="flex min-h-12 items-center justify-center gap-3 rounded-full border border-[#747775] bg-white px-5 text-[15px] font-semibold text-[#1f1f1f] shadow-[0_8px_24px_-12px_rgb(0_0_0/0.4)]"
          >
            <GoogleMark />
            {t("login.google")}
          </a>
        </div>
      </motion.section>
    </main>
  );
}

/** Google の「G」マーク（Google のブランドガイドラインの配色のまま使う） */
function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
