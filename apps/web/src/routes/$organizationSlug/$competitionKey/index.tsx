import { createFileRoute } from "@tanstack/react-router";
import { PortalCoverView } from "@/modules/public-portal/presentation/public-portal-calendar.tsx";
import {
  PortalSectionRead,
  sectionRead,
} from "@/modules/public-portal/presentation/public-portal-route.tsx";
import { PortalLoading } from "@/modules/public-portal/presentation/public-portal-states.tsx";
import { getPublicPortalCalendar } from "@/modules/public-portal/server/public-portal.functions.ts";

export const Route = createFileRoute("/$organizationSlug/$competitionKey/")({
  loader: async ({ params }) => sectionRead(await getPublicPortalCalendar({ data: params })),
  pendingComponent: PortalLoading,
  component: PortalCoverRoute,
});

function PortalCoverRoute() {
  const read = Route.useLoaderData();
  const portalRef = Route.useParams();
  return (
    <PortalSectionRead read={read}>
      {({ calendar }) => <PortalCoverView calendar={calendar} portalRef={portalRef} />}
    </PortalSectionRead>
  );
}
