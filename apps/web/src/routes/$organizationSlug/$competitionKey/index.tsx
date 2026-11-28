import type { GetPublicStandingsResponse } from "@futrob/api-contracts";
import { createFileRoute, getRouteApi } from "@tanstack/react-router";
import {
  coverLeadersFromRankings,
  PortalCoverView,
  type CoverLeaderItem,
  type PortalCalendar,
} from "@/modules/public-portal/presentation/public-portal-cover.tsx";
import {
  PortalSectionRead,
  sectionRead,
  type SectionRead,
} from "@/modules/public-portal/presentation/public-portal-route.tsx";
import { PortalCoverLoading } from "@/modules/public-portal/presentation/public-portal-skeleton.tsx";
import {
  getPublicPortalCalendar,
  getPublicPortalRanking,
  getPublicPortalStandings,
} from "@/modules/public-portal/server/public-portal.functions.ts";

interface CoverLoaderData {
  readonly calendar: PortalCalendar | null;
  readonly standings: GetPublicStandingsResponse["standings"] | null;
  readonly leaders: readonly CoverLeaderItem[];
}

const portalRoute = getRouteApi("/$organizationSlug/$competitionKey");

export const Route = createFileRoute("/$organizationSlug/$competitionKey/")({
  loader: async ({ params }): Promise<SectionRead<CoverLoaderData>> => {
    const [calendarRead, standingsRead, scorerRead, assisterRead, ratingRead] = await Promise.all([
      getPublicPortalCalendar({ data: params }),
      getPublicPortalStandings({ data: params }),
      getPublicPortalRanking({ data: { ...params, kind: "scorer" } }),
      getPublicPortalRanking({ data: { ...params, kind: "assister" } }),
      getPublicPortalRanking({ data: { ...params, kind: "rating" } }),
    ]);

    // A 404 on any core slice means the competition is no longer public.
    const calendar = sectionRead(calendarRead);
    const standings = sectionRead(standingsRead);

    // Only fail the whole Cover when neither calendar nor standings loaded.
    if (calendar.status === "error" && standings.status === "error") {
      return { status: "error" as const };
    }

    const leaders = coverLeadersFromRankings([
      scorerRead.status === "ready" ? scorerRead.data.ranking : null,
      assisterRead.status === "ready" ? assisterRead.data.ranking : null,
      ratingRead.status === "ready" ? ratingRead.data.ranking : null,
    ]);

    return {
      status: "ready" as const,
      data: {
        calendar: calendar.status === "ready" ? calendar.data.calendar : null,
        standings: standings.status === "ready" ? standings.data.standings : null,
        leaders,
      },
    };
  },
  pendingComponent: CoverPending,
  component: PortalCoverRoute,
});

function CoverPending() {
  return <PortalCoverLoading portalRef={Route.useParams()} />;
}

function PortalCoverRoute() {
  const read = Route.useLoaderData();
  const portalRef = Route.useParams();
  const { competition } = portalRoute.useLoaderData();
  return (
    <PortalSectionRead read={read}>
      {({ calendar, leaders, standings }) => (
        <PortalCoverView
          calendar={calendar}
          format={competition.format}
          leaders={leaders}
          portalRef={portalRef}
          standings={standings}
        />
      )}
    </PortalSectionRead>
  );
}
