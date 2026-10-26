import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { jstToday } from "@shared/date/jst";
import { plansQuery } from "../../api/data";
import { PlansSkeleton } from "../../components/loading/PageSkeletons";
import { Reveal, useStartedLoading } from "../../components/ui/Reveal";
import { ErrorMessage } from "../../components/ui/States";
import { useTheme } from "../../theme/ThemeProvider";
import { usePlanForm } from "../../screens/forms/useForms";
import { PlansScreen } from "../../screens/PlansScreen";
import { toPlanView } from "../../screens/types";

export const Route = createFileRoute("/_app/plans/")({
  component: Plans,
});

function Plans() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const plans = useQuery(plansQuery);
  const reveal = useStartedLoading(plans.isPending);
  const form = usePlanForm((plan) => void navigate({ to: "/plans/$planId", params: { planId: plan.id } }));

  return (
    <main className="app-shell flex flex-col gap-5">
      {plans.isPending ? (
        <PlansSkeleton />
      ) : plans.isError ? (
        <ErrorMessage tone={theme.tone.page} onRetry={() => void plans.refetch()} />
      ) : (
        <Reveal active={reveal} className="flex flex-col gap-5">
          <PlansScreen
            plans={plans.data.map(toPlanView)}
            today={jstToday()}
            onOpen={(id) => void navigate({ to: "/plans/$planId", params: { planId: id } })}
            onAdd={() => form.open()}
          />
        </Reveal>
      )}
      {form.element}
    </main>
  );
}
