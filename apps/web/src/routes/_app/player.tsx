import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PlayerOnboardingGuard } from "@/modules/statistics/presentation/player-onboarding-guard.tsx";
import { ClubAssociationNotice } from "@/modules/player-home/presentation/club-association-notice.tsx";
import { PlayerHomePage } from "@/modules/player-home/presentation/player-home-page.tsx";
import { playerHomeSearchSchema } from "@/modules/player-home/presentation/player-home-search.ts";
import { useWorkspaceSelectedClubId } from "@/shared/presentation/shell/use-workspace-selection.tsx";

export const Route = createFileRoute("/_app/player")({
  validateSearch: playerHomeSearchSchema,
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
  const { clubAssociation } = Route.useSearch();
  const navigate = useNavigate();
  return (
    <PlayerHomePage
      externalClubId={externalClubId}
      notice={
        clubAssociation === "failed" ? (
          <ClubAssociationNotice
            onDismiss={() => void navigate({ to: "/player", search: {}, replace: true })}
          />
        ) : null
      }
      profileReady={profileReady}
    />
  );
}
