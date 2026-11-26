import { createFileRoute } from "@tanstack/react-router";
import { PortalCalendarView } from "@/modules/public-portal/presentation/public-portal-calendar.tsx";
import {
  PortalSectionRead,
  sectionRead,
} from "@/modules/public-portal/presentation/public-portal-route.tsx";
import { PortalCalendarLoading } from "@/modules/public-portal/presentation/public-portal-skeleton.tsx";
import { getPublicPortalCalendar } from "@/modules/public-portal/server/public-portal.functions.ts";

export const Route = createFileRoute("/$organizationSlug/$competitionKey/calendar")({
  loader: async ({ params }) => sectionRead(await getPublicPortalCalendar({ data: params })),
  pendingComponent: PortalCalendarLoading,
  component: PortalCalendarRoute,
});

function PortalCalendarRoute() {
  const read = Route.useLoaderData();
  return (
    <PortalSectionRead read={read}>
      {({ calendar }) => <PortalCalendarView calendar={calendar} />}
    </PortalSectionRead>
  );
}
