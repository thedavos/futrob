import { createFileRoute } from "@tanstack/react-router";
import {
  PortalSectionRead,
  sectionRead,
} from "@/modules/public-portal/presentation/public-portal-route.tsx";
import { PortalTeamsLoading } from "@/modules/public-portal/presentation/public-portal-skeleton.tsx";
import { PortalTeamsView } from "@/modules/public-portal/presentation/public-portal-teams.tsx";
import {
  getPublicPortalStandings,
  getPublicPortalTeams,
} from "@/modules/public-portal/server/public-portal.functions.ts";

export const Route = createFileRoute("/$organizationSlug/$competitionKey/teams")({
  loader: async ({ params }) => {
    const [teamsRead, standingsRead] = await Promise.all([
      getPublicPortalTeams({ data: params }),
      getPublicPortalStandings({ data: params }),
    ]);
    const teams = sectionRead(teamsRead);
    if (teams.status === "error") return teams;
    return {
      status: "ready" as const,
      data: {
        teams: teams.data.teams,
        standings: standingsRead.status === "ready" ? standingsRead.data.standings : null,
      },
    };
  },
  pendingComponent: PortalTeamsLoading,
  component: PortalTeamsRoute,
});

function PortalTeamsRoute() {
  const read = Route.useLoaderData();
  const portalRef = Route.useParams();
  return (
    <PortalSectionRead read={read}>
      {({ standings, teams }) => (
        <PortalTeamsView portalRef={portalRef} standings={standings} teams={teams} />
      )}
    </PortalSectionRead>
  );
}
