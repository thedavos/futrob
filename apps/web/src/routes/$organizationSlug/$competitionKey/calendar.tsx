import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import { PortalCalendarView } from "@/modules/public-portal/presentation/public-portal-calendar.tsx";
import { portalCalendarSearchSchema } from "@/modules/public-portal/presentation/public-portal-model.ts";
import { PortalSectionRead } from "@/modules/public-portal/presentation/public-portal-route.tsx";

const portalRoute = getRouteApi("/$organizationSlug/$competitionKey");

/** The calendar is read once by the portal layout loader (hero progress) and rendered here. */
export const Route = createFileRoute("/$organizationSlug/$competitionKey/calendar")({
  validateSearch: portalCalendarSearchSchema,
  component: PortalCalendarRoute,
});

function PortalCalendarRoute() {
  const { calendar: read } = portalRoute.useLoaderData();
  const { team } = Route.useSearch();
  return (
    <PortalSectionRead read={read}>
      {({ calendar }) => <PortalCalendarView calendar={calendar} initialTeam={team ?? null} />}
    </PortalSectionRead>
  );
}
