import { createFileRoute } from "@tanstack/react-router";
import { OrganizationCompetitionsPage } from "@/modules/competitions/presentation/organization-competitions-page.tsx";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/")({
  component: OrganizationCompetitionsRoute,
});

function OrganizationCompetitionsRoute() {
  const { orgId } = Route.useParams();
  return <OrganizationCompetitionsPage organizationId={orgId} />;
}
