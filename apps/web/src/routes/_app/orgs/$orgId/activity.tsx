import { createFileRoute } from "@tanstack/react-router";
import { OrganizationActivityPage } from "@/modules/notifications/presentation/organization-activity-page.tsx";

export const Route = createFileRoute("/_app/orgs/$orgId/activity")({
  head: () => ({ meta: [{ title: "Actividad | Futrob" }] }),
  component: OrganizationActivityRoute,
});

function OrganizationActivityRoute() {
  const { orgId } = Route.useParams();
  return <OrganizationActivityPage organizationId={orgId} />;
}
