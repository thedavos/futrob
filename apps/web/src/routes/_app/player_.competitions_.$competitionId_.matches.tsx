import { createFileRoute } from "@tanstack/react-router";
import { PlayerCompetitionMatchesRoute } from "@/modules/results/presentation/player-competition-matches-page.tsx";
import { PlayerOnboardingGuard } from "@/modules/statistics/presentation/player-onboarding-guard.tsx";
import { getUiLocale } from "@/shared/presentation/i18n/locale.functions.ts";
import { onboardingHead } from "@/shared/presentation/i18n/onboarding-head.ts";

export const Route = createFileRoute("/_app/player_/competitions_/$competitionId_/matches")({
  loader: () => getUiLocale(),
  head: ({ loaderData }) => onboardingHead(loaderData, "matches.list.documentTitle"),
  component: PlayerMatchesPage,
});

function PlayerMatchesPage() {
  const { competitionId } = Route.useParams();
  return (
    <PlayerOnboardingGuard>
      <PlayerCompetitionMatchesRoute competitionId={competitionId} />
    </PlayerOnboardingGuard>
  );
}
