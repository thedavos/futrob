import { createFileRoute } from "@tanstack/react-router";
import { CaptainRosterPage } from "@/modules/teams/presentation/captain/captain-roster-page.tsx";

export const Route = createFileRoute("/_app/player_/competitions_/$competitionId_/team/roster")({
  head: () => ({ meta: [{ title: "Plantilla | Futrob" }] }),
  component: PlayerCaptainRosterPageRoute,
});

function PlayerCaptainRosterPageRoute() {
  const { competitionId } = Route.useParams();
  return <CaptainRosterPage competitionId={competitionId} organizationId={null} />;
}
