import { createFileRoute } from "@tanstack/react-router";
import {
  encounterDetailSearchSchema,
  encounterListReturn,
} from "@/modules/results/presentation/encounter-list-return.ts";
import { EncounterRoute } from "@/modules/results/presentation/encounter-route.tsx";
import { localizedHead } from "@/shared/presentation/i18n/localized-head.ts";

export const Route = createFileRoute(
  "/_app/orgs/$orgId/competitions/$competitionId/encounters_/$encounterId",
)({
  validateSearch: encounterDetailSearchSchema,
  head: localizedHead("encounter.documentTitle"),
  component: EncounterPage,
});

function EncounterPage() {
  const { orgId, competitionId, encounterId } = Route.useParams();
  const search = Route.useSearch();
  return (
    <EncounterRoute
      competitionId={competitionId}
      encounterId={encounterId}
      listReturn={encounterListReturn(search)}
      organizationId={orgId}
    />
  );
}
