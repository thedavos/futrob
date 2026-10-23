import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { OrganizationTeamsPage } from "@/modules/teams/presentation/organization-teams-page.tsx";

export const Route = createFileRoute("/_app/orgs/$orgId/teams")({
  validateSearch: z.object({ q: z.string().optional() }),
  head: () => ({ meta: [{ title: "Equipos | Futrob" }] }),
  component: OrganizationTeamsRoute,
});

function OrganizationTeamsRoute() {
  const { orgId } = Route.useParams();
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <OrganizationTeamsPage
      onQueryChange={(next) =>
        void navigate({ replace: true, search: { q: next.length > 0 ? next : undefined } })
      }
      organizationId={orgId}
      query={q ?? ""}
    />
  );
}
