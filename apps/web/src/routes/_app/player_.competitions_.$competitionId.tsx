import { createFileRoute } from "@tanstack/react-router";
import { ExploreCompetitionDetailPage } from "@/modules/competitions/presentation/explore/explore-competition-detail-page.tsx";

export const Route = createFileRoute("/_app/player_/competitions_/$competitionId")({
  component: ProtectedPlayerCompetitionDetail,
});

function ProtectedPlayerCompetitionDetail() {
  const { competitionId } = Route.useParams();
  return <ExploreCompetitionDetailPage competitionId={competitionId} />;
}
