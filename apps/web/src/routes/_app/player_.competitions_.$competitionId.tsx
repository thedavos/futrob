import { createFileRoute } from "@tanstack/react-router";
import { competitionApplySearchSchema } from "@/modules/competitions/presentation/explore/competition-apply-search.ts";
import { ExploreCompetitionDetailPage } from "@/modules/competitions/presentation/explore/explore-competition-detail-page.tsx";

export const Route = createFileRoute("/_app/player_/competitions_/$competitionId")({
  validateSearch: competitionApplySearchSchema,
  component: ProtectedPlayerCompetitionDetail,
});

function ProtectedPlayerCompetitionDetail() {
  const { competitionId } = Route.useParams();
  const { apply, teamName } = Route.useSearch();
  return (
    <ExploreCompetitionDetailPage
      application={apply ? { teamName: teamName ?? "" } : null}
      competitionId={competitionId}
    />
  );
}
