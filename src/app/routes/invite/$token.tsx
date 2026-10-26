import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import type { MessageKey } from "@shared/i18n";
import { googleLoginUrl, meQuery } from "../../api/me";
import { errorKey, type InvitePeek, invitePeekQuery, useAcceptInvite } from "../../api/space";
import { PrimaryButton } from "../../components/ui/Buttons";
import { GoogleMark } from "../../components/ui/GoogleMark";
import { Icon } from "../../components/ui/Icon";
import { LoadingSkeleton, Skeleton } from "../../components/ui/States";
import { useT } from "../../i18n/I18nProvider";
import { useTheme } from "../../theme/ThemeProvider";

/*
 * 招待リンクを開いたところ。ログイン前でも、どのスペースに誰から招待されたかが分かる。
 * ログインしていなければ Google でログイン → この画面に戻って「参加する」。
 */
export const Route = createFileRoute("/invite/$token")({
  component: InvitePage,
});

const STATUS_MESSAGE: Record<Exclude<InvitePeek["status"], "valid">, MessageKey> = {
  expired: "invite.expired",
  used: "invite.used",
  revoked: "invite.revoked",
  full: "invite.full",
};

function InvitePage() {
  const { token } = Route.useParams();
  const { t, locale } = useT();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const me = useQuery(meQuery);
  const peek = useQuery(invitePeekQuery(token));
  const accept = useAcceptInvite(token);
  const tone = theme.tone.card;
  const muted = tone === "light" ? "text-current/85" : "text-white/90";

  let body;
  if (peek.isPending || me.isPending) {
    body = (
      <LoadingSkeleton>
        <Skeleton tone={tone} className="h-6 w-48" />
        <Skeleton tone={tone} className="mt-3 h-4 w-40" />
        <Skeleton tone={tone} className="mt-6 h-12 w-full rounded-full" />
      </LoadingSkeleton>
    );
  } else if (peek.isError || me.isError) {
    body = <Notice text={t("common.loadError")} />;
  } else if (!peek.data) {
    body = <Notice text={t("invite.notFound")} />;
  } else {
    const inv = peek.data;
    body = (
      <>
        <h1 className="text-[26px] leading-tight font-bold">{t("invite.title", { space: inv.spaceName })}</h1>
        <p className={`text-[15px] ${muted}`}>{t("invite.from", { name: inv.inviterName })}</p>
        {inv.status !== "valid" ? (
          <Notice text={t(STATUS_MESSAGE[inv.status])} />
        ) : !me.data ? (
          <>
            <p className={`text-[14px] ${muted}`}>{t("invite.signInLead")}</p>
            <a
              href={googleLoginUrl(`/invite/${token}`, locale, theme.id)}
              className="flex min-h-12 items-center justify-center gap-3 rounded-full border border-[#747775] bg-white px-5 text-[15px] font-semibold text-[#1f1f1f]"
            >
              <GoogleMark />
              {t("login.google")}
            </a>
          </>
        ) : me.data.space ? (
          <>
            <Notice text={t("invite.alreadyInSpace")} />
            <Link to="/settings" className="min-h-11 text-[14px] font-semibold underline underline-offset-4">
              {t("nav.settings")}
            </Link>
          </>
        ) : (
          <>
            {accept.isError && <Notice text={t(errorKey(accept.error))} />}
            <PrimaryButton
              tone={tone}
              icon="check"
              fullWidth
              loading={accept.isPending}
              onClick={() => accept.mutate(undefined, { onSuccess: () => void navigate({ to: "/" }) })}
            >
              {t("invite.join")}
            </PrimaryButton>
          </>
        )}
      </>
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-env(safe-area-inset-top))] max-w-[var(--app-max)] flex-col justify-end px-[var(--gutter)] pt-10 pb-[calc(env(safe-area-inset-bottom)+32px)]">
      <p className="mb-6 text-[20px] font-bold tracking-tight">COVOW</p>
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="lg lg-card flex flex-col gap-4 rounded-[28px] p-5"
      >
        {body}
      </motion.section>
    </main>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-[16px] bg-[#ffd18b] px-4 py-3 text-[14px] font-medium text-[#111827]">
      <Icon name="attention" size={20} className="mt-px shrink-0" />
      {text}
    </p>
  );
}
