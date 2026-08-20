import { Outlet, createFileRoute } from "@tanstack/react-router";
import { PlayerOnboardingGuard } from "@/modules/statistics/presentation/player-onboarding-guard.tsx";
import { playerMatchesSearchSchema } from "@/modules/statistics/presentation/player-matches-search.ts";

export const Route = createFileRoute("/_app/player_/matches")({
  validateSearch: playerMatchesSearchSchema,
  component: PlayerMatchesLayout,
});

function PlayerMatchesLayout() {
  return (
    <PlayerOnboardingGuard>
      <Outlet />
    </PlayerOnboardingGuard>
  );
}
