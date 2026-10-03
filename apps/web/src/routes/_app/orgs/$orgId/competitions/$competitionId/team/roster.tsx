import { createFileRoute } from "@tanstack/react-router";
import { CaptainRosterPage } from "@/modules/teams/presentation/captain/captain-roster-page.tsx";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/team/roster")({
  head: () => ({ meta: [{ title: "Plantilla | Futrob" }] }),
  component: OrganizationCaptainRosterPageRoute,
});

function OrganizationCaptainRosterPageRoute() {
  const { orgId, competitionId } = Route.useParams();
  return <CaptainRosterPage competitionId={competitionId} organizationId={orgId} />;
}
