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

  return (
    <OrganizationTeamsPage
      competitionId={competition ?? "all"}
      onFiltersChange={(next) =>
        void navigate({
          replace: true,
          search: {
            q: next.query.length > 0 ? next.query : undefined,
            status: next.status === "all" ? undefined : next.status,
            competition:
              next.competitionId.length > 0 && next.competitionId !== "all"
                ? next.competitionId
                : undefined,
          },
        })
      }
      organizationId={orgId}
      query={q ?? ""}
      status={status ?? "all"}
    />
  );
}
