import { createFileRoute } from "@tanstack/react-router";
import { PlayerOnboardingGuard } from "@/modules/statistics/presentation/player-onboarding-guard.tsx";
import { PlayerCompetitionsPage } from "@/modules/teams/presentation/player-competitions-page.tsx";

export const Route = createFileRoute("/_app/player_/competitions")({
  component: ProtectedPlayerCompetitions,
});

function ProtectedPlayerCompetitions() {
  return (
    <PlayerOnboardingGuard>
      <PlayerCompetitionsPage />
    </PlayerOnboardingGuard>
  );
}
