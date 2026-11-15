import { createFileRoute } from "@tanstack/react-router";
import { CompetitionStandingsRoute } from "@/modules/statistics/presentation/competition-standings/competition-standings-page.tsx";
import { localizedHead } from "@/shared/presentation/i18n/localized-head.ts";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/standings")({
  head: localizedHead("standings.documentTitle"),
  component: StandingsPage,
});

function StandingsPage() {
  const { orgId, competitionId } = Route.useParams();
  return <CompetitionStandingsRoute competitionId={competitionId} organizationId={orgId} />;
}
