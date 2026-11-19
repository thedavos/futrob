import {
  asEaSearchPlatform,
  EA_SEARCH_PLATFORM,
  type CompetitionPlatformDto,
  type EaSearchPlatform,
  type ExternalClubDto,
} from "@futrob/api-contracts";
import { GAME_PLATFORM } from "@futrob/shared-kernel";
import type { OnboardingHandoff } from "@/modules/identity/presentation/onboarding/onboarding-handoff.ts";

/**
 * The competition platform a club from each EA search platform plays on, when there is exactly
 * one. Cross-gen spans PlayStation, Xbox and PC, and Nintendo spans Switch 1 and 2, so a club
 * from either leaves the open competitions unfiltered.
 */
const COMPETITION_PLATFORM_BY_EA_PLATFORM = {
  [EA_SEARCH_PLATFORM.PS5]: GAME_PLATFORM.PLAYSTATION,
  [EA_SEARCH_PLATFORM.XBOX]: GAME_PLATFORM.XBOX,
  [EA_SEARCH_PLATFORM.CROSS_GEN]: null,
  [EA_SEARCH_PLATFORM.NINTENDO]: null,
} as const satisfies Record<EaSearchPlatform, CompetitionPlatformDto | null>;

export function competitionPlatformForClub(
  club: Pick<ExternalClubDto, "platform"> | null,
): CompetitionPlatformDto | null {
  const platform = club ? asEaSearchPlatform(club.platform) : null;
  return platform ? COMPETITION_PLATFORM_BY_EA_PLATFORM[platform] : null;
}

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
