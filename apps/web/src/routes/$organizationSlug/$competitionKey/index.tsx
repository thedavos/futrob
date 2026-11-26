import { createFileRoute } from "@tanstack/react-router";
import { PortalCoverView } from "@/modules/public-portal/presentation/public-portal-calendar.tsx";
import {
  PortalSectionRead,
  sectionRead,
} from "@/modules/public-portal/presentation/public-portal-route.tsx";
import { PortalCoverLoading } from "@/modules/public-portal/presentation/public-portal-skeleton.tsx";
import { getPublicPortalCalendar } from "@/modules/public-portal/server/public-portal.functions.ts";

export const Route = createFileRoute("/$organizationSlug/$competitionKey/")({
  loader: async ({ params }) => sectionRead(await getPublicPortalCalendar({ data: params })),
  pendingComponent: CoverPending,
  component: PortalCoverRoute,
});

function CoverPending() {
  return <PortalCoverLoading portalRef={Route.useParams()} />;
}

function PortalCoverRoute() {
  const read = Route.useLoaderData();
  const portalRef = Route.useParams();
  return (
    <PortalSectionRead read={read}>
      {({ calendar }) => <PortalCoverView calendar={calendar} portalRef={portalRef} />}
    </PortalSectionRead>
  );
}
