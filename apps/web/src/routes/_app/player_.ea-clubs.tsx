import { createFileRoute } from "@tanstack/react-router";
import { PlayerOnboardingGuard } from "@/modules/statistics/presentation/player-onboarding-guard.tsx";
import { PlayerEaClubsPage } from "@/modules/teams/presentation/player-ea-clubs-page.tsx";

export const Route = createFileRoute("/_app/player_/ea-clubs")({
  component: ProtectedPlayerEaClubs,
});

function ProtectedPlayerEaClubs() {
  return (
    <PlayerOnboardingGuard>
      <PlayerEaClubsPage />
    </PlayerOnboardingGuard>
  );
}
