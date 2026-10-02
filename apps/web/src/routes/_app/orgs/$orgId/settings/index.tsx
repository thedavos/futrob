import { createFileRoute } from "@tanstack/react-router";
import { OrganizationSettingsPage } from "@/modules/organizations/presentation/organization-settings-page.tsx";

export const Route = createFileRoute("/_app/orgs/$orgId/settings/")({
  head: () => ({ meta: [{ title: "Ajustes | Futrob" }] }),
  component: OrganizationSettingsRoute,
});

function OrganizationSettingsRoute() {
  const { orgId } = Route.useParams();
  return <OrganizationSettingsPage organizationId={orgId} />;
}
