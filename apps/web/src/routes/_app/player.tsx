import { createFileRoute } from "@tanstack/react-router";
import { PlayerOnboardingGuard } from "@/modules/statistics/presentation/player-onboarding-guard.tsx";
import { PlayerHomePage } from "@/modules/player-home/presentation/player-home-page.tsx";
import { useWorkspaceSelectedClubId } from "@/shared/presentation/shell/use-workspace-selection.tsx";

export const Route = createFileRoute("/_app/player")({
  component: PlayerRoute,
});

function PlayerRoute() {
  return (
    <PlayerOnboardingGuard>
      <PlayerHomeRoutePage />
    </PlayerOnboardingGuard>
  );
}

function PlayerHomeRoutePage() {
  const { externalClubId, profileReady } = useWorkspaceSelectedClubId();
  return <PlayerHomePage externalClubId={externalClubId} profileReady={profileReady} />;
}
