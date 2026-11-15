import { createFileRoute } from "@tanstack/react-router";
import { CompetitionFixtureRoute } from "@/modules/scheduling/presentation/competition-fixture-page.tsx";
import { fixtureCalendarSearchSchema } from "@/modules/scheduling/presentation/fixture-calendar-search.ts";
import { localizedHead } from "@/shared/presentation/i18n/localized-head.ts";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/fixture")({
  validateSearch: fixtureCalendarSearchSchema,
  head: localizedHead("fixture.documentTitle"),
  component: FixturePage,
});

function FixturePage() {
  const { orgId, competitionId } = Route.useParams();
  return <CompetitionFixtureRoute competitionId={competitionId} organizationId={orgId} />;
}
