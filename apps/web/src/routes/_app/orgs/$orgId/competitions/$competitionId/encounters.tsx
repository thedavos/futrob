import { createFileRoute } from "@tanstack/react-router";
import { CompetitionEncountersRoute } from "@/modules/results/presentation/competition-encounters-page.tsx";
import { getUiLocale } from "@/shared/presentation/i18n/locale.functions.ts";
import { onboardingHead } from "@/shared/presentation/i18n/onboarding-head.ts";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/encounters")({
  loader: () => getUiLocale(),
  head: ({ loaderData }) => onboardingHead(loaderData, "encounters.list.documentTitle"),
  component: EncountersPage,
});

function EncountersPage() {
  const { orgId, competitionId } = Route.useParams();
  return <CompetitionEncountersRoute competitionId={competitionId} organizationId={orgId} />;
}
