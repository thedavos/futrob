import { createFileRoute } from "@tanstack/react-router";
import { CaptainRosterPage } from "@/modules/teams/presentation/captain/captain-roster-page.tsx";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/team/")({
  head: () => ({ meta: [{ title: "Mi equipo | Futrob" }] }),
  component: OrganizationTeamPage,
});

function OrganizationTeamPage() {
  const { orgId, competitionId } = Route.useParams();
  return (
    <CaptainRosterPage
      competitionId={competitionId}
      organizationId={orgId}
      page="competitionPlayer.team"
    />
  );
}
