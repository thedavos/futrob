import {
  computePlayerAttributeOverview,
  type AttributeCategoryScore,
  type PlayerGameAppearanceSample,
  type PlayerGameOutcome,
} from "./player-attribute-overview.ts";

export type { PlayerGameAppearanceSample };
import {
  nextEloRating,
  PLAYER_ELO_START,
  playerEloFromOutcomes,
  type RatedMatchOutcome,
} from "./player-game-elo.ts";
import type { PlayerPitchRole } from "./player-pitch-role.ts";

export type PlayerStatisticMetric =
  | "goals"
  | "assists"
  | "shots"
  | "passAttempts"
  | "passesMade"
  | "tackleAttempts"
  | "tacklesMade"
  | "saves"
  | "yellowCards"
  | "redCards"
  | "mvpAwards"
  | "rating";

export interface PlayerGameStatTotals {
  readonly goals: number;
  readonly assists: number;
  readonly shots: number;
  readonly passAttempts: number;
  readonly passesMade: number;
  readonly tackleAttempts: number;
  readonly tacklesMade: number;
  readonly saves: number;
  readonly yellowCards: number;
  readonly redCards: number;
  readonly mvpAwards: number;
  readonly rating: number;
}

type MutablePlayerGameStatTotals = {
  -readonly [K in keyof PlayerGameStatTotals]: PlayerGameStatTotals[K];
};

export type PlayerGameStatRates = {
  readonly [K in PlayerStatisticMetric]: number | null;
};

export interface PlayerGameStatBlock {
  readonly matchesPlayed: number;
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
  readonly minutes: number | null;
  readonly totals: PlayerGameStatTotals;
  readonly averages: PlayerGameStatRates;
  readonly partial: { readonly [K in PlayerStatisticMetric | "minutes"]: boolean };
}

export interface PlayerEloSnapshot {
  readonly rating: number;
  readonly ratedMatches: number;
}

export interface PlayerEvolutionPoint {
  readonly occurredAt: Date;
  readonly elo: number;
  readonly rating: number | null;
  readonly outcome: PlayerGameOutcome;
}

export interface PlayerTeamStatBlock extends PlayerGameStatBlock {
  readonly clubId: string;
  readonly clubName: string;
}

export interface PlayerPositionStatBlock extends PlayerGameStatBlock {
  readonly position: string;
  readonly role: PlayerPitchRole;
}

export interface PlayerIdentity {
  readonly displayName: string;
  readonly preferredPosition: string | null;
  readonly preferredRole: PlayerPitchRole;
}

export interface PlayerGameProfile {
  readonly identity: PlayerIdentity;
  readonly sampleSize: number;
  readonly elo: PlayerEloSnapshot;
  readonly attributes: readonly AttributeCategoryScore[];
  readonly evolution: readonly PlayerEvolutionPoint[];
  readonly summary: PlayerGameStatBlock;
  readonly byTeam: readonly PlayerTeamStatBlock[];
  readonly byPosition: readonly PlayerPositionStatBlock[];
}

export function buildPlayerGameProfile(
  samples: readonly PlayerGameAppearanceSample[],
  declaredDisplayName: string | null = null,
): PlayerGameProfile {
  const chronological = [...samples].sort(
    (left, right) => left.occurredAt.getTime() - right.occurredAt.getTime(),
  );
  const ratedOutcomes = chronological
    .map((sample) => sample.outcome)
    .filter((outcome): outcome is RatedMatchOutcome => outcome !== "unknown");
  const byPosition = groupByPosition(samples);

  return {
    identity: identityFrom(samples, byPosition, declaredDisplayName),
    sampleSize: samples.length,
    elo: playerEloFromOutcomes(ratedOutcomes),
    attributes: computePlayerAttributeOverview(samples),
    evolution: evolutionFrom(chronological),
    summary: summarizeSamples(samples),
    byTeam: groupByTeam(samples),
    byPosition,
  };
}

function identityFrom(
  samples: readonly PlayerGameAppearanceSample[],
  byPosition: readonly PlayerPositionStatBlock[],
  declaredDisplayName: string | null,
): PlayerIdentity {
  const preferred = byPosition[0];
  return {
    displayName:
      mostFrequent(samples.map((sample) => sample.appearance.displayName.trim()).filter(Boolean)) ??
      declaredDisplayName ??
      "player",
    preferredPosition: preferred && preferred.position !== "unknown" ? preferred.position : null,
    preferredRole: preferred?.role ?? "unknown",
  };
}

function mostFrequent(values: readonly string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  let winner = values[0]!;
  let highest = 0;
  for (const value of values) {
    const next = (counts.get(value) ?? 0) + 1;
    counts.set(value, next);
    if (next > highest) {
      winner = value;
      highest = next;
    }
  }
  return winner;
}

function evolutionFrom(
  chronological: readonly PlayerGameAppearanceSample[],
): PlayerEvolutionPoint[] {
  let elo = PLAYER_ELO_START;
  const points: PlayerEvolutionPoint[] = [];
  for (const sample of chronological) {
    if (sample.outcome !== "unknown") {
      elo = nextEloRating(elo, sample.outcome);
    }
    points.push({
      occurredAt: sample.occurredAt,
      elo: Math.round(elo),
      rating: sample.appearance.rating,
      outcome: sample.outcome,
    });
  }
  return points;
}

function groupByTeam(samples: readonly PlayerGameAppearanceSample[]): PlayerTeamStatBlock[] {
  const groups = new Map<string, PlayerGameAppearanceSample[]>();
  for (const sample of samples) {
    const existing = groups.get(sample.clubId);
    if (existing) existing.push(sample);
    else groups.set(sample.clubId, [sample]);
  }
  return [...groups.entries()]
    .map(([clubId, rows]) => ({
      clubId,
      clubName: rows[0]?.clubName ?? clubId,
      ...summarizeSamples(rows),
    }))
    .sort((left, right) => right.matchesPlayed - left.matchesPlayed);
}

function groupByPosition(
  samples: readonly PlayerGameAppearanceSample[],
): PlayerPositionStatBlock[] {
  const groups = new Map<string, PlayerGameAppearanceSample[]>();
  for (const sample of samples) {
    const position = sample.position?.trim() || "unknown";
    const existing = groups.get(position);
    if (existing) existing.push(sample);
    else groups.set(position, [sample]);
  }
  return [...groups.entries()]
    .map(([position, rows]) => ({
      position,
      role: rows[0]?.role ?? "unknown",
      ...summarizeSamples(rows),
    }))
    .sort((left, right) => right.matchesPlayed - left.matchesPlayed);
}

function summarizeSamples(samples: readonly PlayerGameAppearanceSample[]): PlayerGameStatBlock {
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let minutesSum = 0;
  let minutesKnown = 0;
  const known = emptyTotals();
  const totals = emptyTotals();

  for (const sample of samples) {
    switch (sample.outcome) {
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
        break;
      default: {
        const _exhaustive: never = sample.outcome;
        return _exhaustive;
      }
    }
    const stats = sample.appearance;
    if (stats.minutesPlayed !== null) {
      minutesSum += stats.minutesPlayed;
      minutesKnown += 1;
    }
    accumulate(totals, known, "goals", stats.goals);
    accumulate(totals, known, "assists", stats.assists);
    accumulate(totals, known, "shots", stats.shots);
    accumulate(totals, known, "passAttempts", stats.passAttempts);
    accumulate(totals, known, "passesMade", stats.passesMade);
    accumulate(totals, known, "tackleAttempts", stats.tackleAttempts);
    accumulate(totals, known, "tacklesMade", stats.tacklesMade);
    accumulate(totals, known, "saves", stats.saves);
    accumulate(totals, known, "yellowCards", stats.yellowCards);
    accumulate(totals, known, "redCards", stats.redCards);
    accumulate(totals, known, "mvpAwards", stats.isMvp === null ? null : stats.isMvp ? 1 : 0);
    accumulate(totals, known, "rating", stats.rating);
  }

  const matchesPlayed = samples.length;
  const frozenTotals: PlayerGameStatTotals = { ...totals };
  const averages: PlayerGameStatRates = {
    goals: rate(totals.goals, known.goals),
    assists: rate(totals.assists, known.assists),
    shots: rate(totals.shots, known.shots),
    passAttempts: rate(totals.passAttempts, known.passAttempts),
    passesMade: rate(totals.passesMade, known.passesMade),
    tackleAttempts: rate(totals.tackleAttempts, known.tackleAttempts),
    tacklesMade: rate(totals.tacklesMade, known.tacklesMade),
    saves: rate(totals.saves, known.saves),
    yellowCards: rate(totals.yellowCards, known.yellowCards),
    redCards: rate(totals.redCards, known.redCards),
    mvpAwards: rate(totals.mvpAwards, known.mvpAwards),
    rating: rate(totals.rating, known.rating),
  };

  return {
    matchesPlayed,
    wins,
    draws,
    losses,
    minutes: minutesKnown === 0 ? null : minutesSum,
    totals: frozenTotals,
    averages,
    partial: {
      minutes: minutesKnown > 0 && minutesKnown < matchesPlayed,
      goals: isPartial(known.goals, matchesPlayed),
      assists: isPartial(known.assists, matchesPlayed),
      shots: isPartial(known.shots, matchesPlayed),
      passAttempts: isPartial(known.passAttempts, matchesPlayed),
      passesMade: isPartial(known.passesMade, matchesPlayed),
      tackleAttempts: isPartial(known.tackleAttempts, matchesPlayed),
      tacklesMade: isPartial(known.tacklesMade, matchesPlayed),
      saves: isPartial(known.saves, matchesPlayed),
      yellowCards: isPartial(known.yellowCards, matchesPlayed),
      redCards: isPartial(known.redCards, matchesPlayed),
      mvpAwards: isPartial(known.mvpAwards, matchesPlayed),
      rating: isPartial(known.rating, matchesPlayed),
    },
  };
}

function rate(sum: number, known: number): number | null {
  return known === 0 ? null : sum / known;
}

function isPartial(known: number, matchesPlayed: number): boolean {
  return known > 0 && known < matchesPlayed;
}

function accumulate(
  totals: MutablePlayerGameStatTotals,
  known: MutablePlayerGameStatTotals,
  metric: PlayerStatisticMetric,
  value: number | null,
): void {
  if (value === null) return;
  totals[metric] += value;
  known[metric] += 1;
}

function emptyTotals(): MutablePlayerGameStatTotals {
  return {
    goals: 0,
    assists: 0,
    shots: 0,
    passAttempts: 0,
    passesMade: 0,
    tackleAttempts: 0,
    tacklesMade: 0,
    saves: 0,
    yellowCards: 0,
    redCards: 0,
    mvpAwards: 0,
    rating: 0,
  };
}
