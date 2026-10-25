import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import type { MessageKey } from "@shared/i18n";
import { googleLoginUrl, meQuery, useStartTrial } from "../api/me";
import { errorKey } from "../api/space";
import { TabChips } from "../components/glass/TabChips";
import { GoogleMark } from "../components/ui/GoogleMark";
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
  const navigate = useNavigate();
  const trial = useStartTrial();

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
            { value: "mix", label: "Mix" },
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
          {/* 体験版：24時間だけ使える見本のスペース。ログインは要らない */}
          <div className="flex flex-col items-center gap-1 pt-1">
            <button
              type="button"
              disabled={trial.isPending}
              onClick={() => trial.mutate({ lang: locale, theme: theme.id }, { onSuccess: () => void navigate({ to: "/" }) })}
              className="min-h-11 text-[15px] font-semibold underline underline-offset-4 disabled:opacity-60"
            >
              {t("trial.try")}
            </button>
            <p className={`text-center text-[12px] ${theme.tone.card === "light" ? "text-current/85" : "text-white/90"}`}>{t("trial.tryNote")}</p>
            {trial.isError && (
              <p role="alert" className="text-center text-[13px] font-medium">
                {t(errorKey(trial.error))}
              </p>
            )}
          </div>
        </div>
      </motion.section>
    </main>
  );
}
