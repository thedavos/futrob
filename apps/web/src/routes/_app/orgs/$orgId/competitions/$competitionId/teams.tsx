import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CompetitionTeamsConsole } from "@/modules/teams/presentation/competition-teams-console.tsx";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/teams")({
  validateSearch: z.object({ teamId: z.string().min(1).optional() }),
  head: () => ({ meta: [{ title: "Equipos y plantillas | Futrob" }] }),
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
