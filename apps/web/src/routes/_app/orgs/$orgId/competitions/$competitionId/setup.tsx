import { createFileRoute } from "@tanstack/react-router";
import { CompetitionSetupPage } from "@/modules/competitions/presentation/competition-setup-page.tsx";

export const Route = createFileRoute("/_app/orgs/$orgId/competitions/$competitionId/setup")({
  component: SetupRoute,
});

function SetupRoute() {
  const { orgId, competitionId } = Route.useParams();
  return <CompetitionSetupPage competitionId={competitionId} organizationId={orgId} />;
}
