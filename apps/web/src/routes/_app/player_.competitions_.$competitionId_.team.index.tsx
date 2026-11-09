import { createFileRoute } from "@tanstack/react-router";
import { CaptainRosterPage } from "@/modules/teams/presentation/captain/captain-roster-page.tsx";

export const Route = createFileRoute("/_app/player_/competitions_/$competitionId_/team/")({
  head: () => ({ meta: [{ title: "Mi equipo | Futrob" }] }),
  component: PlayerTeamPage,
});

function PlayerTeamPage() {
  const { competitionId } = Route.useParams();
  return (
    <CaptainRosterPage
      competitionId={competitionId}
      organizationId={null}
      page="competitionPlayer.team"
    />
  );
}
