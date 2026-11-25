import { createFileRoute } from "@tanstack/react-router";
import {
  competitionEncountersSearchSchema,
  filtersFromSearch,
  searchFromFilters,
} from "@/modules/results/presentation/competition-encounters-model.ts";
import { CompetitionEncountersRoute } from "@/modules/results/presentation/competition-encounters-page.tsx";
import { localizedHead } from "@/shared/presentation/i18n/localized-head.ts";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/matches")({
  validateSearch: competitionEncountersSearchSchema,
  head: localizedHead("matches.list.documentTitle"),
  component: MatchesPage,
});

function MatchesPage() {
  const { orgId, competitionId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <CompetitionEncountersRoute
      competitionId={competitionId}
      filters={filtersFromSearch(search)}
      onFiltersChange={(next) => {
        void navigate({ replace: true, resetScroll: false, search: searchFromFilters(next) });
      }}
      organizationId={orgId}
      page="competitionPlayer.matches"
    />
  );
}
