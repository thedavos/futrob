import { createFileRoute } from "@tanstack/react-router";
import { CompetitionRulesRoute } from "@/modules/competitions/presentation/competition-rules-page.tsx";
import { localizedHead } from "@/shared/presentation/i18n/localized-head.ts";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/rules")({
  head: localizedHead("competitionRules.documentTitle"),
  component: RulesPage,
});

function RulesPage() {
  const { orgId, competitionId } = Route.useParams();
  return <CompetitionRulesRoute competitionId={competitionId} organizationId={orgId} />;
}
