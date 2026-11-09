import { createFileRoute } from "@tanstack/react-router";
import { PlayerCompetitionsPage } from "@/modules/teams/presentation/player-competitions-page.tsx";

export const Route = createFileRoute("/_app/player_/competitions")({
  component: ProtectedPlayerCompetitions,
});

function ProtectedPlayerCompetitions() {
  return <PlayerCompetitionsPage />;
}
