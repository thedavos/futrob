import { createFileRoute } from "@tanstack/react-router";
import { PlayerOnboardingGuard } from "@/modules/statistics/presentation/player-onboarding-guard.tsx";
import { PlayerProfilePage } from "@/modules/identity/presentation/account/player-profile-page.tsx";

export const Route = createFileRoute("/_app/player_/profile")({ component: ProfileRoute });

function ProfileRoute() {
  return (
    <PlayerOnboardingGuard>
      <PlayerProfilePage />
    </PlayerOnboardingGuard>
  );
}
