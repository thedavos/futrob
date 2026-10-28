import { createFileRoute } from "@tanstack/react-router";
import { PlayerOnboardingGuard } from "@/modules/statistics/presentation/player-onboarding-guard.tsx";
import { PlayerCompetitionStatsPage } from "@/modules/statistics/presentation/player-competition-stats-page.tsx";

export const Route = createFileRoute("/_app/player_/competitions_/$competitionId_/stats")({
  head: () => ({ meta: [{ title: "Estadísticas | Futrob" }] }),
  component: PlayerCompetitionStatsRoute,
});

function PlayerCompetitionStatsRoute() {
  const { competitionId } = Route.useParams();
  return (
    <PlayerOnboardingGuard>
      <PlayerCompetitionStatsPage competitionId={competitionId} />
    </PlayerOnboardingGuard>
  );
}
