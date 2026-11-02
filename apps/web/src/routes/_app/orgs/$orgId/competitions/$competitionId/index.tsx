import { createFileRoute } from "@tanstack/react-router";
import { CompetitionOverviewRoute } from "@/modules/competitions/presentation/overview/competition-overview-page.tsx";
import { localizedHead } from "@/shared/presentation/i18n/localized-head.ts";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/")({
  head: localizedHead("competition.overview.documentTitle"),
  component: CompetitionHomePage,
});

function CompetitionHomePage() {
  const { orgId, competitionId } = Route.useParams();
  return <CompetitionOverviewRoute competitionId={competitionId} organizationId={orgId} />;
}
