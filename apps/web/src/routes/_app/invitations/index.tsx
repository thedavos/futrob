import { createFileRoute } from "@tanstack/react-router";
import { PlayerInvitationsPage } from "@/modules/teams/presentation/player-invitations-page.tsx";

export const Route = createFileRoute("/_app/invitations/")({
  component: PlayerInvitationsPage,
});
