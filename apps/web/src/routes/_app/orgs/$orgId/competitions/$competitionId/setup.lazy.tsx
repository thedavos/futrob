import { createLazyFileRoute } from "@tanstack/react-router";
import { CompetitionSetupPage } from "@/modules/competitions/presentation/competition-setup-page.tsx";

export const Route = createLazyFileRoute("/_app/orgs/$orgId/competitions/$competitionId/setup")({
  component: SetupRoute,
});

function SetupRoute() {
  const { orgId, competitionId } = Route.useParams();
  const { step } = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <CompetitionSetupPage
      competitionId={competitionId}
      currentStep={step ?? "information"}
      onStepChange={(next) => void navigate({ search: { step: next } })}
      organizationId={orgId}
    />
  );
}
