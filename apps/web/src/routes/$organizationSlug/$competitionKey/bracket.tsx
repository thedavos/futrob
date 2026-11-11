import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import {
  PortalSectionRead,
  sectionRead,
} from "@/modules/public-portal/presentation/public-portal-route.tsx";
import { PortalLoading } from "@/modules/public-portal/presentation/public-portal-states.tsx";
import { PortalBracketView } from "@/modules/public-portal/presentation/public-portal-structure.tsx";
import { getPublicPortalBracket } from "@/modules/public-portal/server/public-portal.functions.ts";

export const Route = createFileRoute("/$organizationSlug/$competitionKey/bracket")({
  loader: async ({ params }) => sectionRead(await getPublicPortalBracket({ data: params })),
  pendingComponent: PortalLoading,
  component: PortalBracketRoute,
});

const portalRoute = getRouteApi("/$organizationSlug/$competitionKey");

function PortalBracketRoute() {
  const read = Route.useLoaderData();
  const { competition } = portalRoute.useLoaderData();
  return (
    <PortalSectionRead read={read}>
      {({ bracket }) => <PortalBracketView bracket={bracket} format={competition.format} />}
    </PortalSectionRead>
  );
}
