import { createFileRoute } from "@tanstack/react-router";
import { PlayerOnboardingGuard } from "@/modules/statistics/presentation/player-onboarding-guard.tsx";
import { CaptainRosterPage } from "@/modules/teams/presentation/captain/captain-roster-page.tsx";

export const Route = createFileRoute("/_app/player_/competitions_/$competitionId_/team/roster")({
  head: () => ({ meta: [{ title: "Plantilla | Futrob" }] }),
  component: PlayerCaptainRosterPageRoute,
});

function PlayerCaptainRosterPageRoute() {
  const { competitionId } = Route.useParams();
  return (
    <PlayerOnboardingGuard>
      <CaptainRosterPage competitionId={competitionId} organizationId={null} />
    </PlayerOnboardingGuard>
  );
}
