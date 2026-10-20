import { createFileRoute } from "@tanstack/react-router";
import { EncounterRoute } from "@/modules/results/presentation/encounter-route.tsx";
import { getUiLocale } from "@/shared/presentation/i18n/locale.functions.ts";
import { onboardingHead } from "@/shared/presentation/i18n/onboarding-head.ts";

export const Route = createFileRoute(
  "/_app/orgs/$orgId/competitions/$competitionId/encounters_/$encounterId",
)({
  loader: () => getUiLocale(),
  head: ({ loaderData }) => onboardingHead(loaderData, "encounter.documentTitle"),
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
