import { createFileRoute } from "@tanstack/react-router";
import { CompetitionDisputesRoute } from "@/modules/results/presentation/competition-disputes-page.tsx";
import { getUiLocale } from "@/shared/presentation/i18n/locale.functions.ts";
import { onboardingHead } from "@/shared/presentation/i18n/onboarding-head.ts";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/disputes")({
  loader: () => getUiLocale(),
  head: ({ loaderData }) => onboardingHead(loaderData, "pages.competition.disputes.title"),
  component: DisputesPage,
});

function DisputesPage() {
  const { orgId, competitionId } = Route.useParams();
  return <CompetitionDisputesRoute competitionId={competitionId} organizationId={orgId} />;
}
