import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import {
  PortalSectionRead,
  sectionRead,
} from "@/modules/public-portal/presentation/public-portal-route.tsx";
import { PortalStandingsLoading } from "@/modules/public-portal/presentation/public-portal-skeleton.tsx";
import { PortalStandingsView } from "@/modules/public-portal/presentation/public-portal-standings.tsx";
import { getPublicPortalStandings } from "@/modules/public-portal/server/public-portal.functions.ts";

const portalRoute = getRouteApi("/$organizationSlug/$competitionKey");

export const Route = createFileRoute("/$organizationSlug/$competitionKey/standings")({
  loader: async ({ params }) => sectionRead(await getPublicPortalStandings({ data: params })),
  pendingComponent: PortalStandingsLoading,
  component: PortalStandingsRoute,
});

function PortalStandingsRoute() {
  const read = Route.useLoaderData();
  const { competition } = portalRoute.useLoaderData();
  return (
    <PortalSectionRead read={read}>
      {({ standings }) => <PortalStandingsView format={competition.format} standings={standings} />}
    </PortalSectionRead>
  );
}
