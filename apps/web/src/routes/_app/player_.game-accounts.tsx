import { createFileRoute } from "@tanstack/react-router";
import { PlayerOnboardingGuard } from "@/modules/statistics/presentation/player-onboarding-guard.tsx";
import { PlayerGameAccountsPage } from "@/modules/teams/presentation/player-game-accounts-page.tsx";

export const Route = createFileRoute("/_app/player_/game-accounts")({
  component: ProtectedPlayerGameAccounts,
});

function ProtectedPlayerGameAccounts() {
  return (
    <PlayerOnboardingGuard>
      <PlayerGameAccountsPage />
    </PlayerOnboardingGuard>
  );
}
