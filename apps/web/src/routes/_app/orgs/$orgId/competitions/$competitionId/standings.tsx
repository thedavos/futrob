import { createFileRoute } from "@tanstack/react-router";
import { CompetitionStandingsRoute } from "@/modules/statistics/presentation/competition-standings/competition-standings-page.tsx";
import { getUiLocale } from "@/shared/presentation/i18n/locale.functions.ts";
import { onboardingHead } from "@/shared/presentation/i18n/onboarding-head.ts";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/standings")({
  loader: () => getUiLocale(),
  head: ({ loaderData }) => onboardingHead(loaderData, "standings.documentTitle"),
  component: StandingsPage,
});

function StandingsPage() {
  const { orgId, competitionId } = Route.useParams();
  return <CompetitionStandingsRoute competitionId={competitionId} organizationId={orgId} />;
}
