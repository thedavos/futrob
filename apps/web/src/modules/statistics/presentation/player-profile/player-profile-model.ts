import type { PlayerGameProfileDto } from "@futrob/api-contracts";

export type MatchOutcome = PlayerGameProfileDto["evolution"][number]["outcome"];
export type AttributeCategory = PlayerGameProfileDto["attributes"][number];
export type RatingEvolutionView = "empty" | "unavailable" | "ready";

export function playedMatchCount(summary: PlayerGameProfileDto["summary"]): number {
  return summary.wins + summary.draws + summary.losses;
}

export function winPercent(summary: PlayerGameProfileDto["summary"]): number | null {
  const total = playedMatchCount(summary);
  if (total === 0) return null;
  return Math.round((summary.wins / total) * 100);
}

export function ratingEvolutionView(
  evolution: PlayerGameProfileDto["evolution"],
): RatingEvolutionView {
  if (evolution.length === 0) return "empty";
  if (evolution.every((point) => point.rating === null)) return "unavailable";
  return "ready";
}

export function lastOutcomes(
  evolution: PlayerGameProfileDto["evolution"],
  count: number,
): readonly MatchOutcome[] {
  return evolution.slice(-count).map((point) => point.outcome);
}

export type OutcomeSplit = {
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
  readonly unknowns: number;
};

export function outcomeSplit(outcomes: readonly MatchOutcome[]): OutcomeSplit {
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let unknowns = 0;
  for (const outcome of outcomes) {
    switch (outcome) {
      case "win":
        wins += 1;
        break;
      case "draw":
        draws += 1;
        break;
      case "loss":
        losses += 1;
        break;
      case "unknown":
        unknowns += 1;
        break;
      default: {
        const _exhaustive: never = outcome;
        return _exhaustive;
      }
    }
  }
  return { wins, draws, losses, unknowns };
}

export function lastOutcomeSplit(
  evolution: PlayerGameProfileDto["evolution"],
  count: number,
): OutcomeSplit {
  return outcomeSplit(lastOutcomes(evolution, count));
}

export function primaryClubName(profile: PlayerGameProfileDto): string | null {
  return profile.byTeam[0]?.clubName ?? null;
}

export function defaultAttributeCategory(
  attributes: PlayerGameProfileDto["attributes"],
): AttributeCategory | null {
  return attributeByHighestScore(attributes);
}

export function attributeExtremes(attributes: PlayerGameProfileDto["attributes"]): {
  readonly strength: AttributeCategory;
  readonly toImprove: AttributeCategory;
} | null {
  const strength = attributeByHighestScore(attributes);
  const toImprove = attributeByLowestScore(attributes);
  if (strength === null || toImprove === null) return null;
  if (strength.category === toImprove.category) return null;
  return { strength, toImprove };
}

function attributeByHighestScore(
  attributes: PlayerGameProfileDto["attributes"],
): AttributeCategory | null {
  return pickAttribute(attributes, (best, next) => next.score > best.score);
}

function attributeByLowestScore(
  attributes: PlayerGameProfileDto["attributes"],
): AttributeCategory | null {
  return pickAttribute(attributes, (best, next) => next.score < best.score);
}

function pickAttribute(
  attributes: PlayerGameProfileDto["attributes"],
  preferNext: (current: AttributeCategory, next: AttributeCategory) => boolean,
): AttributeCategory | null {
  const first = attributes[0];
  if (first === undefined) return null;
  return attributes.reduce((current, next) => (preferNext(current, next) ? next : current), first);
}

export type RatingAxisScale = {
  readonly domain: readonly [number, number];
  readonly ticks: readonly number[];
};

export function ratingAxisScale(ratings: readonly (number | null)[]): RatingAxisScale {
  const values = ratings.filter((value): value is number => value !== null);
  const first = values[0];
  if (first === undefined) {
    return { domain: [0, 10], ticks: [0, 2, 4, 6, 8, 10] };
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const low = Math.floor(min * 2) / 2;
  const high = Math.max(low + 0.5, Math.ceil(max * 2) / 2);
  const ticks: number[] = [];
  for (let tick = low; tick <= high + Number.EPSILON; tick += 0.5) {
    ticks.push(Number(tick.toFixed(1)));
  }
  return { domain: [low, high], ticks };
}

export const CHART_COLORS = {
  line: "var(--muted-foreground)",
  grid: "var(--border-subtle)",
  axis: "var(--muted-foreground)",
  tooltipSurface: "var(--surface)",
  tooltipBorder: "var(--border)",
  radarFill: "color-mix(in oklab, var(--primary) 22%, transparent)",
  radarStroke: "var(--primary)",
  win: "var(--success)",
  draw: "var(--warning)",
  loss: "var(--danger)",
  unknown: "var(--muted-foreground)",
} as const;

export function outcomeColor(outcome: MatchOutcome): string {
  switch (outcome) {
    case "win":
      return CHART_COLORS.win;
    case "draw":
      return CHART_COLORS.draw;
    case "loss":
      return CHART_COLORS.loss;
    case "unknown":
      return CHART_COLORS.unknown;
    default: {
      const _exhaustive: never = outcome;
      return _exhaustive;
    }
  }
}
