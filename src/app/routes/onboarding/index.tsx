import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { type ReactNode, useState } from "react";
import { jstThisMonth } from "@shared/date/jst";
import { parseAmountInput } from "@shared/money/amount";
import { LIMITS } from "@shared/schemas";
import { useCreatePlan, usePutBudget } from "../../api/data";
import { meQuery, useLogout, useUpdateMe } from "../../api/me";
import { errorKey, useCreateSpace } from "../../api/space";
import { PrimaryButton } from "../../components/ui/Buttons";
import { AmountInput, FormField, TextInput } from "../../components/ui/FormField";
import { useT } from "../../i18n/I18nProvider";
import { useTheme } from "../../theme/ThemeProvider";
import { offerKey } from "../../tour/TourProvider";

/*
 * 初期設定（はじめてログインした人・1人用。2026-10-25 の決定）。
 * 1 表示名 → 2 スペース名 → 3 今月の予算（スキップ可）→ 4 最初の購入予定（スキップ可）
 * ほかの人を誘うのは、あとから設定のスペース欄で行う。招待リンクから来た人はここを通らない。
 */
export const Route = createFileRoute("/onboarding/")({
  beforeLoad: async ({ context, location }) => {
    const me = await context.queryClient.ensureQueryData(meQuery);
    if (!me) throw redirect({ to: "/login", search: { next: location.href } });
    if (me.space) throw redirect({ to: "/" });
  },
  component: Onboarding,
});

const TOTAL = 4;

function Onboarding() {
  const { t } = useT();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const { data: me } = useQuery(meQuery);
  const updateMe = useUpdateMe();
  const createSpace = useCreateSpace();
  const putBudget = usePutBudget();
  const createPlan = useCreatePlan();
  const logout = useLogout();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(me?.user.displayName ?? "");
  const [spaceName, setSpaceName] = useState("");
  const [budget, setBudget] = useState("");
  const [planTitle, setPlanTitle] = useState("");
  const [planAmount, setPlanAmount] = useState("");
  const [touched, setTouched] = useState(false);
  const muted = theme.tone.page === "light" ? "text-current/85" : "text-white/90";
  const tone = theme.tone.card;

  const go = (n: number) => {
    setTouched(false);
    setStep(n);
  };
  const finish = () => {
    // ホームで「Let's Try」を一度だけ勧める
    if (me) {
      try {
        localStorage.setItem(offerKey(me.user.id), "1");
      } catch {
        // 勧められなくても使える
      }
    }
    void navigate({ to: "/" });
  };

  const budgetParsed = parseAmountInput(budget, { allowZero: true });
  const planParsed = parseAmountInput(planAmount);

  let content: { title: string; lead: string; body: ReactNode; next: () => void; pending: boolean; error: unknown; skip?: () => void; nextLabel?: string };
  if (step === 1) {
    content = {
      title: t("onboarding.name.title"),
      lead: t("onboarding.name.lead"),
      body: (
        <FormField label={t("settings.displayName")} required tone={tone} error={touched && !name.trim() ? t("error.validation") : undefined}>
          {(f) => <TextInput {...f} tone={tone} value={name} maxLength={LIMITS.displayName} onChange={(e) => setName(e.target.value)} autoFocus />}
        </FormField>
      ),
      next: () => {
        setTouched(true);
        if (!name.trim()) return;
        if (name.trim() === me?.user.displayName) return go(2);
        updateMe.mutate({ displayName: name.trim() }, { onSuccess: () => go(2) });
      },
      pending: updateMe.isPending,
      error: updateMe.error,
    };
  } else if (step === 2) {
    content = {
      title: t("onboarding.space.title"),
      lead: t("onboarding.space.lead"),
      body: (
        <>
          <FormField label={t("settings.spaceName")} required tone={tone} error={touched && !spaceName.trim() ? t("error.validation") : undefined}>
            {(f) => (
              <TextInput
                {...f}
                tone={tone}
                value={spaceName}
                maxLength={LIMITS.spaceName}
                placeholder={t("onboarding.space.placeholder")}
                onChange={(e) => setSpaceName(e.target.value)}
                autoFocus
              />
            )}
          </FormField>
          <p className={`text-[13px] leading-relaxed ${theme.tone.card === "light" ? "text-current/85" : "text-white/90"}`}>{t("onboarding.space.invited")}</p>
        </>
      ),
      next: () => {
        setTouched(true);
        if (!spaceName.trim()) return;
        createSpace.mutate(spaceName.trim(), { onSuccess: () => go(3) });
      },
      pending: createSpace.isPending,
      error: createSpace.error,
    };
  } else if (step === 3) {
    content = {
      title: t("onboarding.budget.title"),
      lead: t("onboarding.budget.lead"),
      body: (
        <FormField label={t("budget.amount")} tone={tone} error={touched && !budgetParsed.ok ? t(`amount.${budgetParsed.error}`) : undefined}>
          {(f) => <AmountInput {...f} tone={tone} value={budget} placeholder="180,000" onChange={(e) => setBudget(e.target.value)} autoFocus />}
        </FormField>
      ),
      next: () => {
        setTouched(true);
        if (!budgetParsed.ok) return;
        putBudget.mutate({ yearMonth: jstThisMonth(), amount: budgetParsed.value, applyToFuture: true }, { onSuccess: () => go(4) });
      },
      skip: () => go(4),
      pending: putBudget.isPending,
      error: putBudget.error,
    };
  } else {
    content = {
      title: t("onboarding.plan.title"),
      lead: t("onboarding.plan.lead"),
      body: (
        <>
          <FormField label={t("plan.item")} tone={tone} error={touched && !planTitle.trim() ? t("error.validation") : undefined}>
            {(f) => <TextInput {...f} tone={tone} value={planTitle} maxLength={LIMITS.title} onChange={(e) => setPlanTitle(e.target.value)} autoFocus />}
          </FormField>
          <FormField label={t("plan.amount")} tone={tone} error={touched && !planParsed.ok ? t(`amount.${planParsed.error}`) : undefined}>
            {(f) => <AmountInput {...f} tone={tone} value={planAmount} placeholder="12,800" onChange={(e) => setPlanAmount(e.target.value)} />}
          </FormField>
        </>
      ),
      next: () => {
        setTouched(true);
        if (!planTitle.trim() || !planParsed.ok) return;
        createPlan.mutate(
          { title: planTitle.trim(), plannedAmount: planParsed.value, plannedDate: null, categoryId: null, memo: null, productUrl: null, assigneeUserId: null },
          { onSuccess: finish },
        );
      },
      skip: finish,
      nextLabel: t("onboarding.finish"),
      pending: createPlan.isPending,
      error: createPlan.error,
    };
  }

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-env(safe-area-inset-top))] max-w-[var(--app-max)] flex-col justify-end gap-6 px-[var(--gutter)] pt-10 pb-[calc(env(safe-area-inset-bottom)+32px)]">
      <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
        <div className="flex gap-1.5" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL} aria-valuenow={step} aria-label={t("onboarding.step", { n: step, total: TOTAL })}>
          {Array.from({ length: TOTAL }, (_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i < step ? "bg-current" : "bg-current/25"}`} />
          ))}
        </div>
        <p className={`mt-3 text-[13px] font-semibold ${muted}`}>{t("onboarding.step", { n: step, total: TOTAL })}</p>
        <h1 className="mt-1 text-[28px] leading-tight font-bold tracking-tight">{content.title}</h1>
        <p className={`mt-2 max-w-[34ch] text-[15px] leading-relaxed ${muted}`}>{content.lead}</p>
      </motion.div>

      <form
        className="lg lg-card flex flex-col gap-4 rounded-[28px] p-5"
        onSubmit={(e) => {
          e.preventDefault();
          content.next();
        }}
      >
        {content.body}
        {content.error ? (
          <p role="alert" className="text-[14px] font-medium">
            {t(errorKey(content.error))}
          </p>
        ) : null}
        <PrimaryButton type="submit" tone={tone} fullWidth loading={content.pending}>
          {content.nextLabel ?? t("onboarding.next")}
        </PrimaryButton>
        {content.skip && (
          <button type="button" onClick={content.skip} className="min-h-11 text-[14px] font-semibold underline underline-offset-4">
            {t("onboarding.skip")}
          </button>
        )}
      </form>

      {step <= 2 && (
        <button
          type="button"
          className="min-h-11 self-start text-[14px] font-semibold underline underline-offset-4"
          onClick={() => logout.mutate(undefined, { onSuccess: () => void navigate({ to: "/login" }) })}
        >
          {t("settings.signOut")}
        </button>
      )}
    </main>
  );
}
