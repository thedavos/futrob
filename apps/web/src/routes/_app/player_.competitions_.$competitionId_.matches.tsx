import { createFileRoute } from "@tanstack/react-router";
import {
  competitionEncountersSearchSchema,
  filtersFromSearch,
  searchFromFilters,
} from "@/modules/results/presentation/competition-encounters-model.ts";
import { PlayerCompetitionMatchesRoute } from "@/modules/results/presentation/player-competition-matches-page.tsx";
import { localizedHead } from "@/shared/presentation/i18n/localized-head.ts";

export const Route = createFileRoute("/_app/player_/competitions_/$competitionId_/matches")({
  validateSearch: competitionEncountersSearchSchema,
  head: localizedHead("matches.list.documentTitle"),
  component: PlayerMatchesPage,
});

function PlayerMatchesPage() {
  const { competitionId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <PlayerCompetitionMatchesRoute
      competitionId={competitionId}
      filters={filtersFromSearch(search)}
      onFiltersChange={(next) => {
        void navigate({ replace: true, resetScroll: false, search: searchFromFilters(next) });
      }}
    />
  );
}
