import { createFileRoute } from "@tanstack/react-router";
import { ProviderMatchDetailRoute } from "@/modules/statistics/presentation/provider-match-detail-route.tsx";
import {
  normalizePlayerMatchesSearch,
  playerMatchesSearchSchema,
} from "@/modules/statistics/presentation/player-matches-search.ts";

export const Route = createFileRoute("/_app/player_/matches/$providerKey/$externalMatchId")({
  validateSearch: playerMatchesSearchSchema,
  component: PlayerMatchDetail,
});

function PlayerMatchDetail() {
  const params = Route.useParams();
  const search = normalizePlayerMatchesSearch(Route.useSearch());
  return (
    <ProviderMatchDetailRoute
      externalMatchId={params.externalMatchId}
      providerKey={params.providerKey}
      sort={search.sort}
      view={search.view}
    />
  );
}
