import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { competitionApplySearchSchema } from "@/modules/competitions/presentation/explore/competition-apply-search.ts";
import { ExploreCompetitionDetailPage } from "@/modules/competitions/presentation/explore/explore-competition-detail-page.tsx";
import { ClubAssociationNotice } from "@/modules/player-home/presentation/club-association-notice.tsx";

export const Route = createFileRoute("/_app/player_/competitions_/$competitionId")({
  validateSearch: competitionApplySearchSchema,
  component: ProtectedPlayerCompetitionDetail,
});

function ProtectedPlayerCompetitionDetail() {
  const { competitionId } = Route.useParams();
  const { apply, teamName, clubAssociation } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  return (
    <ExploreCompetitionDetailPage
      application={apply ? { teamName: teamName ?? "" } : null}
      competitionId={competitionId}
      notice={
        clubAssociation === "failed" ? (
          <ClubAssociationNotice
            onDismiss={() =>
              void navigate({
                search: (search) => ({ ...search, clubAssociation: undefined }),
                replace: true,
              })
            }
          />
        ) : null
      }
    />
  );
}
