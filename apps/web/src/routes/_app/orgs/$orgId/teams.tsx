import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { OrganizationTeamsPage } from "@/modules/teams/presentation/organization-teams-page.tsx";

export const Route = createFileRoute("/_app/orgs/$orgId/teams")({
  validateSearch: z.object({
    q: z.string().optional(),
    status: z.enum(["pending", "none"]).optional(),
    competition: z.string().optional(),
  }),
  head: () => ({ meta: [{ title: "Equipos | Futrob" }] }),
  component: OrganizationTeamsRoute,
});

function OrganizationTeamsRoute() {
  const { orgId } = Route.useParams();
  const { q, status, competition } = Route.useSearch();
  const navigate = Route.useNavigate();

  function updateSearch(next: {
    readonly q?: string;
    readonly status?: "pending" | "none";
    readonly competition?: string;
  }) {
    void navigate({
      replace: true,
      search: {
        q: next.q && next.q.length > 0 ? next.q : undefined,
        status: next.status,
        competition: next.competition && next.competition !== "all" ? next.competition : undefined,
      },
    });
  }

  return (
    <OrganizationTeamsPage
      competitionId={competition ?? "all"}
      onCompetitionIdChange={(nextCompetition) =>
        updateSearch({ q, status, competition: nextCompetition })
      }
      onQueryChange={(nextQuery) => updateSearch({ q: nextQuery, status, competition })}
      onStatusChange={(nextStatus) =>
        updateSearch({
          q,
          status: nextStatus === "all" ? undefined : nextStatus,
          competition,
        })
      }
      organizationId={orgId}
      query={q ?? ""}
      status={status ?? "all"}
    />
  );
}
