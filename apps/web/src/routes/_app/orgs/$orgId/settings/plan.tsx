import { createFileRoute } from "@tanstack/react-router";
import { OrganizationPlanRoute } from "@/modules/billing/presentation/organization-plan-page.tsx";

export const Route = createFileRoute("/_app/orgs/$orgId/settings/plan")({
  head: () => ({ meta: [{ title: "Plan y uso | Futrob" }] }),
  component: PlanPage,
});

function PlanPage() {
  const { orgId } = Route.useParams();
  return <OrganizationPlanRoute organizationId={orgId} />;
}
