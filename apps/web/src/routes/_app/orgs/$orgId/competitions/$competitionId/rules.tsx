import { createFileRoute } from "@tanstack/react-router";
import { CompetitionRulesRoute } from "@/modules/competitions/presentation/competition-rules-page.tsx";
import { getUiLocale } from "@/shared/presentation/i18n/locale.functions.ts";
import { onboardingHead } from "@/shared/presentation/i18n/onboarding-head.ts";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/rules")({
  loader: () => getUiLocale(),
  head: ({ loaderData }) => onboardingHead(loaderData, "competitionRules.documentTitle"),
  component: RulesPage,
});

function RulesPage() {
  const { orgId, competitionId } = Route.useParams();
  return <CompetitionRulesRoute competitionId={competitionId} organizationId={orgId} />;
}
