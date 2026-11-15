import { createFileRoute } from "@tanstack/react-router";
import { CompetitionSanctionsRoute } from "@/modules/competitions/presentation/sanctions/competition-sanctions-page.tsx";
import { localizedHead } from "@/shared/presentation/i18n/localized-head.ts";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/sanctions")({
  head: localizedHead("pages.competition.sanctions.title"),
  component: SanctionsPage,
});

function SanctionsPage() {
  const { orgId, competitionId } = Route.useParams();
  return <CompetitionSanctionsRoute competitionId={competitionId} organizationId={orgId} />;
}
