import { createFileRoute } from "@tanstack/react-router";
import { OrganizationMembersPage } from "@/modules/organizations/presentation/organization-members-page.tsx";

export const Route = createFileRoute("/_app/orgs/$orgId/settings/members")({
  head: () => ({ meta: [{ title: "Miembros y roles | Futrob" }] }),
  component: MembersPage,
});

function MembersPage() {
  const { orgId } = Route.useParams();
  return <OrganizationMembersPage organizationId={orgId} />;
}
