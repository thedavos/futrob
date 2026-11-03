import { createFileRoute } from "@tanstack/react-router";
import { PlayerEaClubsPage } from "@/modules/teams/presentation/player-ea-clubs-page.tsx";

export const Route = createFileRoute("/_app/player_/ea-clubs")({
  component: ProtectedPlayerEaClubs,
});

function ProtectedPlayerEaClubs() {
  return <PlayerEaClubsPage />;
}
