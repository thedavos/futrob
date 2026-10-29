import { createFileRoute } from "@tanstack/react-router";
import { CompetitionFixtureRoute } from "@/modules/scheduling/presentation/competition-fixture-page.tsx";
import { getUiLocale } from "@/shared/presentation/i18n/locale.functions.ts";
import { onboardingHead } from "@/shared/presentation/i18n/onboarding-head.ts";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/fixture")({
  loader: () => getUiLocale(),
  head: ({ loaderData }) => onboardingHead(loaderData, "fixture.documentTitle"),
  component: FixturePage,
});

function FixturePage() {
  const { orgId, competitionId } = Route.useParams();
  return <CompetitionFixtureRoute competitionId={competitionId} organizationId={orgId} />;
}
