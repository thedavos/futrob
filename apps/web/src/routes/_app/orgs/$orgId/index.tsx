import { createFileRoute } from "@tanstack/react-router";
import { OrganizationHomePage } from "@/modules/organizations/presentation/organization-home-page.tsx";

export const Route = createFileRoute("/_app/orgs/$orgId/")({
  head: () => ({ meta: [{ title: "Inicio | Futrob" }] }),
  component: OrganizationHomeRoute,
});

function OrganizationHomeRoute() {
  const { orgId } = Route.useParams();
  return <OrganizationHomePage organizationId={orgId} />;
}
