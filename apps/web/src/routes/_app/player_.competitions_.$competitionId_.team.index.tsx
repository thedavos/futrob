import { createFileRoute } from "@tanstack/react-router";
import { PlayerOnboardingGuard } from "@/modules/statistics/presentation/player-onboarding-guard.tsx";
import { PageScaffold } from "@/shared/presentation/page-scaffold.tsx";

export const Route = createFileRoute("/_app/player_/competitions_/$competitionId_/team/")({
  head: () => ({ meta: [{ title: "Mi equipo | Futrob" }] }),
  component: () => (
    <PlayerOnboardingGuard>
      <PageScaffold page="competitionPlayer.team" />
    </PlayerOnboardingGuard>
  ),
});
