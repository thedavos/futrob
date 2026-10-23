import { createFileRoute } from "@tanstack/react-router";
import { TeamPerformanceRoute } from "@/modules/statistics/presentation/team-performance/team-performance-page.tsx";
import { getUiLocale } from "@/shared/presentation/i18n/locale.functions.ts";
import { onboardingHead } from "@/shared/presentation/i18n/onboarding-head.ts";

export const Route = createFileRoute(
  "/_app/orgs/$orgId/competitions/$competitionId/team-performance",
)({
  loader: () => getUiLocale(),
  head: ({ loaderData }) => onboardingHead(loaderData, "pages.competition.teamPerformance.title"),
  component: TeamPerformancePage,
});

function TeamPerformancePage() {
  const { orgId, competitionId } = Route.useParams();
  return <TeamPerformanceRoute competitionId={competitionId} organizationId={orgId} />;
}
