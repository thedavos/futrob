import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PlayerCompetitionsExplorePage } from "@/modules/competitions/presentation/explore/explore-competitions-page.tsx";
import {
  exploreCompetitionsSearchSchema,
  toExploreSearchParams,
} from "@/modules/competitions/presentation/explore/explore-search.ts";
import { PlayerOnboardingGuard } from "@/modules/statistics/presentation/player-onboarding-guard.tsx";

export const Route = createFileRoute("/_app/player_/competitions_/explore")({
  validateSearch: exploreCompetitionsSearchSchema,
  component: ProtectedPlayerCompetitionsExplore,
});

function ProtectedPlayerCompetitionsExplore() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = toExploreSearchParams(Route.useSearch());
  return (
    <PlayerOnboardingGuard>
      <PlayerCompetitionsExplorePage
        onSearchChange={(next) => {
          void navigate({ search: next, replace: true });
        }}
        search={search}
      />
    </PlayerOnboardingGuard>
  );
}
