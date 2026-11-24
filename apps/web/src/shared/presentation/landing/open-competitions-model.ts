import type { ExternalClubDto } from "@futrob/api-contracts";
import type { OnboardingHandoff } from "@/modules/identity/presentation/onboarding/onboarding-handoff.ts";

/** «Unirme»: onboarding set to join the competition, carrying the picked club if any. */
export function joinCompetitionHandoff(
  competitionId: string,
  club: ExternalClubDto | null,
): OnboardingHandoff {
  return {
    kind: "competition",
    competitionId,
    club: club
      ? {
          providerKey: club.providerKey,
          externalClubId: club.externalClubId,
          platform: club.platform,
          gameEdition: club.gameEdition,
        }
      : null,
  };
}
