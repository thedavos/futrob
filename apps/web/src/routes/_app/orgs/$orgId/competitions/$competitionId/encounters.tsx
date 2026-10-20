import { createFileRoute } from "@tanstack/react-router";
import { CompetitionEncountersRoute } from "@/modules/results/presentation/competition-encounters-page.tsx";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/encounters")({
  head: () => ({ meta: [{ title: "Enfrentamientos | Futrob" }] }),
  component: EncountersPage,
});

function EncountersPage() {
  const { orgId, competitionId } = Route.useParams();
  return <CompetitionEncountersRoute competitionId={competitionId} organizationId={orgId} />;
}
