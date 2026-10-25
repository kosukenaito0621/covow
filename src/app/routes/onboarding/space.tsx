import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { LIMITS } from "@shared/schemas";
import { meQuery, useLogout } from "../../api/me";
import { errorKey, useCreateSpace } from "../../api/space";
import { PrimaryButton } from "../../components/ui/Buttons";
import { FormField, TextInput } from "../../components/ui/FormField";
import { useT } from "../../i18n/I18nProvider";
import { useTheme } from "../../theme/ThemeProvider";

/*
 * スペースを作る（ログイン済みで、まだどこにも入っていない人）。
 * 招待リンクをもらった人は、そのリンクを開けば参加できるので、ここでは案内だけ出す。
 * フェーズ6.5 の初期設定（表示名・ひとりで／一緒に・予算・最初の予定）の一部になる。
 */
export const Route = createFileRoute("/onboarding/space")({
  beforeLoad: async ({ context, location }) => {
    const me = await context.queryClient.ensureQueryData(meQuery);
    if (!me) throw redirect({ to: "/login", search: { next: location.href } });
    if (me.space) throw redirect({ to: "/" });
  },
  component: CreateSpace,
});

function CreateSpace() {
  const { t } = useT();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const create = useCreateSpace();
  const logout = useLogout();
  const [name, setName] = useState("");
  const muted = theme.tone.page === "light" ? "text-current/85" : "text-white/90";
  const tone = theme.tone.card;

  const submit = () => {
    const v = name.trim();
    if (!v) return;
    create.mutate(v, { onSuccess: () => void navigate({ to: "/" }) });
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-[var(--app-max)] flex-col justify-end gap-6 px-[var(--gutter)] pt-10 pb-[calc(env(safe-area-inset-bottom)+32px)]">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        <h1 className="text-[32px] leading-tight font-bold tracking-tight">{t("onboarding.space.title")}</h1>
        <p className={`mt-3 max-w-[34ch] text-[15px] leading-relaxed ${muted}`}>{t("onboarding.space.lead")}</p>
      </motion.div>

      <form
        className="lg lg-card flex flex-col gap-4 rounded-[28px] p-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <FormField label={t("settings.spaceName")} required tone={tone} error={create.isError ? t(errorKey(create.error)) : undefined}>
          {(f) => (
            <TextInput
              {...f}
              tone={tone}
              value={name}
              maxLength={LIMITS.spaceName}
              placeholder={t("onboarding.space.placeholder")}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          )}
        </FormField>
        <PrimaryButton type="submit" tone={tone} fullWidth loading={create.isPending} disabled={name.trim().length === 0}>
          {t("onboarding.space.create")}
        </PrimaryButton>
      </form>

      <p className={`text-[14px] leading-relaxed ${muted}`}>{t("onboarding.space.invited")}</p>
      <button
        type="button"
        className="min-h-11 self-start text-[14px] font-semibold underline underline-offset-4"
        onClick={() => logout.mutate(undefined, { onSuccess: () => void navigate({ to: "/login" }) })}
      >
        {t("settings.signOut")}
      </button>
    </main>
  );
}
