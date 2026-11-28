import type { GetPublicStandingsResponse } from "@futrob/api-contracts";
import { createFileRoute, getRouteApi, useRouter } from "@tanstack/react-router";
import {
  coverLeadersFromRankings,
  PortalCoverView,
  type CoverLeaderItem,
} from "@/modules/public-portal/presentation/public-portal-cover.tsx";
import { sectionRead } from "@/modules/public-portal/presentation/public-portal-route.tsx";
import { PortalCoverLoading } from "@/modules/public-portal/presentation/public-portal-skeleton.tsx";
import { PortalError } from "@/modules/public-portal/presentation/public-portal-states.tsx";
import {
  getPublicPortalRanking,
  getPublicPortalStandings,
} from "@/modules/public-portal/server/public-portal.functions.ts";

interface CoverLoaderData {
  readonly standings: GetPublicStandingsResponse["standings"] | null;
  readonly standingsFailed: boolean;
  readonly leaders: readonly CoverLeaderItem[];
}

const portalRoute = getRouteApi("/$organizationSlug/$competitionKey");

export const Route = createFileRoute("/$organizationSlug/$competitionKey/")({
  loader: async ({ params }): Promise<CoverLoaderData> => {
    // The calendar comes from the portal layout loader, which already read it for the hero.
    const [standingsRead, scorerRead, assisterRead, ratingRead] = await Promise.all([
      getPublicPortalStandings({ data: params }),
      getPublicPortalRanking({ data: { ...params, kind: "scorer" } }),
      getPublicPortalRanking({ data: { ...params, kind: "assister" } }),
      getPublicPortalRanking({ data: { ...params, kind: "rating" } }),
    ]);

    // A 404 on any core slice means the competition is no longer public.
    const standings = sectionRead(standingsRead);

    const leaders = coverLeadersFromRankings([
      scorerRead.status === "ready" ? scorerRead.data.ranking : null,
      assisterRead.status === "ready" ? assisterRead.data.ranking : null,
      ratingRead.status === "ready" ? ratingRead.data.ranking : null,
    ]);

    return {
      standings: standings.status === "ready" ? standings.data.standings : null,
      standingsFailed: standings.status === "error",
      leaders,
    };
  },
  pendingComponent: CoverPending,
  component: PortalCoverRoute,
});

function CoverPending() {
  return <PortalCoverLoading portalRef={Route.useParams()} />;
}

function PortalCoverRoute() {
  const { leaders, standings, standingsFailed } = Route.useLoaderData();
  const portalRef = Route.useParams();
  const { calendar } = portalRoute.useLoaderData();
  const router = useRouter();
  const retry = () => void router.invalidate();
  // Only fail the whole Cover when neither the calendar nor the standings loaded.
  if (calendar.status === "error" && standingsFailed) return <PortalError onRetry={retry} />;
  return (
    <PortalCoverView
      calendar={calendar.status === "ready" ? calendar.data.calendar : null}
      leaders={leaders}
      onCalendarRetry={calendar.status === "error" ? retry : undefined}
      portalRef={portalRef}
      standings={standings}
    />
  );
}
