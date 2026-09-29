import { createFileRoute } from "@tanstack/react-router";
import { PlayerOnboardingGuard } from "@/modules/statistics/presentation/player-onboarding-guard.tsx";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";

export const Route = createFileRoute("/_app/player_/competitions_/$competitionId_/matches")({
  head: () => ({ meta: [{ title: "Partidos | Futrob" }] }),
  component: () => (
    <PlayerOnboardingGuard>
      <PageScaffold page="competitionPlayer.matches" />
    </PlayerOnboardingGuard>
  ),
});
