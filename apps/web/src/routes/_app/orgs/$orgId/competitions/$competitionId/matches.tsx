import { createFileRoute } from "@tanstack/react-router";
import { CompetitionEncountersRoute } from "@/modules/results/presentation/competition-encounters-page.tsx";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/matches")({
  head: () => ({ meta: [{ title: "Partidos | Futrob" }] }),
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
