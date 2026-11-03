import { createFileRoute } from "@tanstack/react-router";
import { CompetitionDisputesRoute } from "@/modules/results/presentation/competition-disputes-page.tsx";
import { localizedHead } from "@/shared/presentation/i18n/localized-head.ts";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/disputes")({
  head: localizedHead("pages.competition.disputes.title"),
  component: DisputesPage,
});

function DisputesPage() {
  const { orgId, competitionId } = Route.useParams();
  return <CompetitionDisputesRoute competitionId={competitionId} organizationId={orgId} />;
}
