import { createFileRoute } from "@tanstack/react-router";
import { PlayerCompetitionStatsPage } from "@/modules/statistics/presentation/player-competition-stats-page.tsx";

export const Route = createFileRoute("/_app/player_/competitions_/$competitionId_/stats")({
  head: () => ({ meta: [{ title: "Estadísticas | Futrob" }] }),
  component: PlayerCompetitionStatsRoute,
});

function PlayerCompetitionStatsRoute() {
  const { competitionId } = Route.useParams();
  return <PlayerCompetitionStatsPage competitionId={competitionId} />;
}
