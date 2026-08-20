import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PlayerMatchesPage } from "@/modules/statistics/presentation/player-matches-page.tsx";
import {
  normalizePlayerMatchesSearch,
  playerMatchesSearchSchema,
} from "@/modules/statistics/presentation/player-matches-search.ts";

export const Route = createFileRoute("/_app/player_/matches/")({
  validateSearch: playerMatchesSearchSchema,
  component: PlayerMatchesIndex,
});

function PlayerMatchesIndex() {
  const navigate = useNavigate();
  const search = normalizePlayerMatchesSearch(Route.useSearch());
  return (
    <PlayerMatchesPage
      onSortChange={(next) => {
        void navigate({
          to: "/player/matches",
          search: { view: search.view, sort: next },
          replace: true,
        });
      }}
      onViewChange={(next) => {
        void navigate({
          to: "/player/matches",
          search: { view: next, sort: search.sort },
          replace: true,
        });
      }}
      sortOrder={search.sort}
      view={search.view}
    />
  );
}
