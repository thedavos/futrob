import { createFileRoute } from "@tanstack/react-router";
import { EncounterRoute } from "@/modules/results/presentation/encounter-route.tsx";
import { localizedHead } from "@/shared/presentation/i18n/localized-head.ts";

export const Route = createFileRoute(
  "/_app/orgs/$orgId/competitions/$competitionId/encounters_/$encounterId",
)({
  head: localizedHead("encounter.documentTitle"),
  component: EncounterPage,
});

function EncounterPage() {
  const { orgId, competitionId, encounterId } = Route.useParams();
  return (
    <EncounterRoute
      competitionId={competitionId}
      encounterId={encounterId}
      organizationId={orgId}
    />
  );
}
