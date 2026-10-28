import { createFileRoute } from "@tanstack/react-router";
import { CompetitionOverviewRoute } from "@/modules/competitions/presentation/overview/competition-overview-page.tsx";
import { getUiLocale } from "@/shared/presentation/i18n/locale.functions.ts";
import { onboardingHead } from "@/shared/presentation/i18n/onboarding-head.ts";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/")({
  loader: () => getUiLocale(),
  head: ({ loaderData }) => onboardingHead(loaderData, "competition.overview.documentTitle"),
  component: CompetitionHomePage,
});

function CompetitionHomePage() {
  const { orgId, competitionId } = Route.useParams();
  return <CompetitionOverviewRoute competitionId={competitionId} organizationId={orgId} />;
}
