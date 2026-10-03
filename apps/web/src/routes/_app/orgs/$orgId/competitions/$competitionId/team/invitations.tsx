import { createFileRoute } from "@tanstack/react-router";
import { CaptainInvitationsPage } from "@/modules/teams/presentation/captain/captain-invitations-page.tsx";

export const Route = createFileRoute(
  "/_app/orgs/$orgId/competitions/$competitionId/team/invitations",
)({
  head: () => ({ meta: [{ title: "Invitaciones del equipo | Futrob" }] }),
  component: OrganizationCaptainInvitationsPageRoute,
});

function OrganizationCaptainInvitationsPageRoute() {
  const { orgId, competitionId } = Route.useParams();
  return <CaptainInvitationsPage competitionId={competitionId} organizationId={orgId} />;
}
