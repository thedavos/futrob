import type { PublicMatchScore } from "../domain/entities/public-competition.ts";

/** Field-by-field copy: whatever else a source score carries never reaches a spectator. */
export function toPublicScore(score: readonly PublicMatchScore[]): readonly PublicMatchScore[] {
  return score.map(({ homeGoals, awayGoals }) => ({ homeGoals, awayGoals }));
}
