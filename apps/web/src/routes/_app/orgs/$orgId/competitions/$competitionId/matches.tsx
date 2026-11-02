import { createFileRoute } from "@tanstack/react-router";
import { CompetitionEncountersRoute } from "@/modules/results/presentation/competition-encounters-page.tsx";
import { localizedHead } from "@/shared/presentation/i18n/localized-head.ts";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/matches")({
  head: localizedHead("matches.list.documentTitle"),
  component: MatchesPage,
});

function MatchesPage() {
  const { orgId, competitionId } = Route.useParams();
  return (
    <CompetitionEncountersRoute
      competitionId={competitionId}
      organizationId={orgId}
      page="competitionPlayer.matches"
    />
  );
}
