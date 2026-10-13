import { createFileRoute } from "@tanstack/react-router";
import { EncounterRoute } from "@/modules/results/presentation/encounter-route.tsx";

export const Route = createFileRoute(
  "/_app/orgs/$orgId/competitions/$competitionId/encounters_/$encounterId",
)({
  head: () => ({ meta: [{ title: "Enfrentamiento | Futrob" }] }),
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
