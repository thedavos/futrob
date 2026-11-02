import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ClubAssociationNotice } from "@/modules/player-home/presentation/club-association-notice.tsx";
import { PlayerHomePage } from "@/modules/player-home/presentation/player-home-page.tsx";
import { playerHomeSearchSchema } from "@/modules/player-home/presentation/player-home-search.ts";
import { useWorkspaceSelectedClubId } from "@/shared/presentation/shell/use-workspace-selection.tsx";

export const Route = createFileRoute("/_app/player")({
  validateSearch: playerHomeSearchSchema,
  component: PlayerRoute,
});

function PlayerRoute() {
  return <PlayerHomeRoutePage />;
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
