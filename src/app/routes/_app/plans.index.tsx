import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { jstToday } from "@shared/date/jst";
import { plansQuery } from "../../api/data";
import { LoadingSkeleton, ErrorMessage, Skeleton } from "../../components/ui/States";
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
  const form = usePlanForm((plan) => void navigate({ to: "/plans/$planId", params: { planId: plan.id } }));

  return (
    <main className="app-shell flex flex-col gap-5">
      {plans.isPending ? (
        <LoadingSkeleton>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-5 h-12 w-full rounded-full" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="mt-3 h-[68px] w-full rounded-[24px]" />
          ))}
        </LoadingSkeleton>
      ) : plans.isError ? (
        <ErrorMessage tone={theme.tone.page} onRetry={() => void plans.refetch()} />
      ) : (
        <PlansScreen
          plans={plans.data.map(toPlanView)}
          today={jstToday()}
          onOpen={(id) => void navigate({ to: "/plans/$planId", params: { planId: id } })}
          onAdd={() => form.open()}
        />
      )}
      {form.element}
    </main>
  );
}
