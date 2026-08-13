import { createLazyFileRoute } from "@tanstack/react-router";
import { CompetitionTeamsConsole } from "@/modules/teams/presentation/competition-teams-console.tsx";

export const Route = createLazyFileRoute("/_app/orgs/$orgId/competitions/$competitionId/teams")({
  component: CompetitionTeamsRoute,
});

function CompetitionTeamsRoute() {
  const { orgId, competitionId } = Route.useParams();
  const { teamId } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <CompetitionTeamsConsole
      competitionId={competitionId}
      onSelectTeam={(nextTeamId) =>
        void navigate({ search: nextTeamId ? { teamId: nextTeamId } : {} })
      }
      organizationId={orgId}
      selectedTeamId={teamId ?? null}
    />
  );
}
