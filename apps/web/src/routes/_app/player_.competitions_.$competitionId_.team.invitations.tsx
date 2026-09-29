import { createFileRoute } from "@tanstack/react-router";
import { PlayerOnboardingGuard } from "@/modules/statistics/presentation/player-onboarding-guard.tsx";
import { CaptainInvitationsPage } from "@/modules/teams/presentation/captain/captain-invitations-page.tsx";

export const Route = createFileRoute(
  "/_app/player_/competitions_/$competitionId_/team/invitations",
)({
  head: () => ({ meta: [{ title: "Invitaciones del equipo | Futrob" }] }),
  component: PlayerCaptainInvitationsPageRoute,
});

function PlayerCaptainInvitationsPageRoute() {
  const { competitionId } = Route.useParams();
  return (
    <PlayerOnboardingGuard>
      <CaptainInvitationsPage competitionId={competitionId} organizationId={null} />
    </PlayerOnboardingGuard>
  );
}
