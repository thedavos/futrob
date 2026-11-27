import { createFileRoute } from "@tanstack/react-router";
import {
  PortalSectionRead,
  sectionRead,
} from "@/modules/public-portal/presentation/public-portal-route.tsx";
import { PortalStandingsLoading } from "@/modules/public-portal/presentation/public-portal-skeleton.tsx";
import { PortalStandingsView } from "@/modules/public-portal/presentation/public-portal-tables.tsx";
import { getPublicPortalStandings } from "@/modules/public-portal/server/public-portal.functions.ts";

export const Route = createFileRoute("/$organizationSlug/$competitionKey/standings")({
  loader: async ({ params }) => sectionRead(await getPublicPortalStandings({ data: params })),
  pendingComponent: PortalStandingsLoading,
  component: PortalStandingsRoute,
});

function PortalStandingsRoute() {
  const read = Route.useLoaderData();
  return (
    <PortalSectionRead read={read}>
      {({ standings }) => <PortalStandingsView standings={standings} />}
    </PortalSectionRead>
  );
}
