export const PLAYER_ELO_START = 1500;
export const PLAYER_ELO_K = 24;
export const PLAYER_ELO_OPPONENT = 1500;

export type RatedMatchOutcome = "win" | "draw" | "loss";

export function expectedEloScore(rating: number, opponentRating = PLAYER_ELO_OPPONENT): number {
  return 1 / (1 + 10 ** ((opponentRating - rating) / 400));
}

export function actualEloScore(outcome: RatedMatchOutcome): number {
  switch (outcome) {
    case "win":
      return 1;
    case "draw":
      return 0.5;
    case "loss":
      return 0;
    default: {
      const _exhaustive: never = outcome;
      return _exhaustive;
    }
  }
}

export function nextEloRating(rating: number, outcome: RatedMatchOutcome): number {
  return rating + PLAYER_ELO_K * (actualEloScore(outcome) - expectedEloScore(rating));
}

export interface PlayerEloRating {
  readonly rating: number;
  readonly ratedMatches: number;
}

export function playerEloFromOutcomes(outcomes: readonly RatedMatchOutcome[]): PlayerEloRating {
  let rating = PLAYER_ELO_START;
  for (const outcome of outcomes) {
    rating = nextEloRating(rating, outcome);
  }
  return { rating: Math.round(rating), ratedMatches: outcomes.length };
}
