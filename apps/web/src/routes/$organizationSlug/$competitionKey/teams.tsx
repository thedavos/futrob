import { createFileRoute } from "@tanstack/react-router";
import {
  PortalSectionRead,
  sectionRead,
} from "@/modules/public-portal/presentation/public-portal-route.tsx";
import { PortalLoading } from "@/modules/public-portal/presentation/public-portal-states.tsx";
import { PortalTeamsView } from "@/modules/public-portal/presentation/public-portal-structure.tsx";
import { getPublicPortalTeams } from "@/modules/public-portal/server/public-portal.functions.ts";

export const Route = createFileRoute("/$organizationSlug/$competitionKey/teams")({
  loader: async ({ params }) => sectionRead(await getPublicPortalTeams({ data: params })),
  pendingComponent: PortalLoading,
  component: PortalTeamsRoute,
});

function PortalTeamsRoute() {
  const read = Route.useLoaderData();
  return (
    <PortalSectionRead read={read}>
      {({ teams }) => <PortalTeamsView teams={teams} />}
    </PortalSectionRead>
  );
}
