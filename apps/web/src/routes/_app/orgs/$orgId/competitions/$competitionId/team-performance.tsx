import { createFileRoute } from "@tanstack/react-router";
import { TeamPerformanceRoute } from "@/modules/statistics/presentation/team-performance/team-performance-page.tsx";
import { localizedHead } from "@/shared/presentation/i18n/localized-head.ts";

export const Route = createFileRoute(
  "/_app/orgs/$orgId/competitions/$competitionId/team-performance",
)({
  head: localizedHead("pages.competition.teamPerformance.title"),
  component: TeamPerformancePage,
});

function TeamPerformancePage() {
  const { orgId, competitionId } = Route.useParams();
  return <TeamPerformanceRoute competitionId={competitionId} organizationId={orgId} />;
}
