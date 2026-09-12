import { createFileRoute } from "@tanstack/react-router";
import { PlayerCompetitionsExplorePage } from "@/modules/teams/presentation/player-competitions-explore-page.tsx";
import { PlayerOnboardingGuard } from "@/modules/statistics/presentation/player-onboarding-guard.tsx";

export const Route = createFileRoute("/_app/player_/competitions_/explore")({
  component: ProtectedPlayerCompetitionsExplore,
});

function ProtectedPlayerCompetitionsExplore() {
  return (
    <PlayerOnboardingGuard>
      <PlayerCompetitionsExplorePage />
    </PlayerOnboardingGuard>
  );
}
