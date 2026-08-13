import {
  DEFAULT_RANKING_ELIGIBILITY,
  type RankingEligibilityConfig,
} from "../entities/ranking-snapshot.ts";

export function resolveRankingEligibility(
  override?: Partial<RankingEligibilityConfig>,
): RankingEligibilityConfig {
  return {
    minimumMatches: override?.minimumMatches ?? DEFAULT_RANKING_ELIGIBILITY.minimumMatches,
    minimumTeamMinutesRatio:
      override?.minimumTeamMinutesRatio ?? DEFAULT_RANKING_ELIGIBILITY.minimumTeamMinutesRatio,
  };
}

export function isEligibleForRanking(input: {
  readonly matchesPlayed: number;
  readonly playerMinutes: number;
  readonly teamMinutes: number;
  readonly eligibility?: Partial<RankingEligibilityConfig>;
}): boolean {
  const eligibility = resolveRankingEligibility(input.eligibility);
  if (input.matchesPlayed >= eligibility.minimumMatches) return true;
  if (input.teamMinutes <= 0) return false;
  return input.playerMinutes / input.teamMinutes >= eligibility.minimumTeamMinutesRatio;
}
