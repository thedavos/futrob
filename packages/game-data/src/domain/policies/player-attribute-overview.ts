import type { ProviderPlayerMatchStats } from "../entities/provider-match.ts";
import { isDefensiveRole, isOffensiveRole, type PlayerPitchRole } from "./player-pitch-role.ts";

export type PlayerGameOutcome = "win" | "draw" | "loss" | "unknown";

export interface PlayerGameAppearanceSample {
  readonly occurredAt: Date;
  readonly clubId: string;
  readonly clubName: string;
  readonly position: string | null;
  readonly role: PlayerPitchRole;
  readonly outcome: PlayerGameOutcome;
  readonly appearance: ProviderPlayerMatchStats;
}

export type AttributeCategory = "attack" | "pass" | "defense" | "impact" | "discipline";

export type AttributeComponentKey =
  | "goalsPerMatch"
  | "shotsPerMatch"
  | "shotAccuracy"
  | "offensiveRoleRating"
  | "passSuccess"
  | "passVolume"
  | "tacklesMadePerMatch"
  | "tackleSuccess"
  | "defensiveRoleRating"
  | "averageRating"
  | "winRate"
  | "goalsAssistsPerMatch"
  | "fewerRedsPerMatch";

export type AttributeRawKind = "perMatch" | "percent" | "rating" | "score";

export interface AttributeComponent {
  readonly key: AttributeComponentKey;
  readonly weight: number;
  readonly raw: number | null;
  readonly rawKind: AttributeRawKind;
  readonly score: number | null;
  readonly points: number;
  readonly confidence: number;
  readonly sampleCount: number;
}

export interface AttributeCategoryScore {
  readonly category: AttributeCategory;
  readonly score: number;
  readonly components: readonly AttributeComponent[];
}

const RATING_FLOOR = 5;
const RATING_CEILING = 10;
const ROLE_RATING_FULL_CONFIDENCE = 14;
const REDS_PER_MATCH_CAP = 0.25;

const CAPS = {
  goalsPerMatch: 1,
  shotsPerMatch: 4,
  passVolumePerMatch: 40,
  tacklesMadePerMatch: 5,
  goalsAssistsPerMatch: 1.5,
} as const;

const WEIGHTS = {
  attack: {
    goalsPerMatch: 0.3,
    shotsPerMatch: 0.2,
    shotAccuracy: 0.2,
    offensiveRoleRating: 0.3,
  },
  pass: {
    passSuccess: 0.8,
    passVolume: 0.2,
  },
  defense: {
    tacklesMadePerMatch: 0.25,
    tackleSuccess: 0.05,
    defensiveRoleRating: 0.7,
  },
  impact: {
    averageRating: 0.72,
    winRate: 0.23,
    goalsAssistsPerMatch: 0.05,
  },
  discipline: {
    fewerRedsPerMatch: 1,
  },
} as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function ratingToScore(rating: number): number {
  return clamp(((rating - RATING_FLOOR) / (RATING_CEILING - RATING_FLOOR)) * 100, 0, 100);
}

function perMatchToScore(value: number, cap: number): number {
  return clamp((value / cap) * 100, 0, 100);
}

function ratioToScore(ratio: number): number {
  return clamp(ratio * 100, 0, 100);
}

function fewerRedsToScore(redsPerMatch: number): number {
  return clamp((1 - redsPerMatch / REDS_PER_MATCH_CAP) * 100, 0, 100);
}

function mean(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function perMatch(sum: number, known: number): number | null {
  return known === 0 ? null : sum / known;
}

function ratio(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : numerator / denominator;
}

function component(
  key: AttributeComponentKey,
  weight: number,
  raw: number | null,
  rawKind: AttributeRawKind,
  score: number | null,
  confidence = 1,
  sampleCount = 0,
): AttributeComponent {
  const points = score === null ? 0 : Math.round(weight * score * confidence);
  return { key, weight, raw, rawKind, score, points, confidence, sampleCount };
}

function categoryScore(
  category: AttributeCategory,
  components: readonly AttributeComponent[],
): AttributeCategoryScore {
  return {
    category,
    score: clamp(
      components.reduce((sum, item) => sum + item.points, 0),
      0,
      100,
    ),
    components,
  };
}

export function computePlayerAttributeOverview(
  samples: readonly PlayerGameAppearanceSample[],
): readonly AttributeCategoryScore[] {
  const played = samples.length;
  let goals = 0;
  let goalsKnown = 0;
  let shots = 0;
  let shotsKnown = 0;
  let assists = 0;
  let assistsKnown = 0;
  let passAttempts = 0;
  let passesMade = 0;
  let passKnown = 0;
  let tackleAttempts = 0;
  let tacklesMade = 0;
  let tackleKnown = 0;
  let reds = 0;
  let redsKnown = 0;
  const ratings: number[] = [];
  const offensiveRatings: number[] = [];
  const defensiveRatings: number[] = [];
  let wins = 0;
  let decided = 0;

  for (const sample of samples) {
    const stats = sample.appearance;
    if (stats.goals !== null) {
      goals += stats.goals;
      goalsKnown += 1;
    }
    if (stats.shots !== null) {
      shots += stats.shots;
      shotsKnown += 1;
    }
    if (stats.assists !== null) {
      assists += stats.assists;
      assistsKnown += 1;
    }
    if (stats.passAttempts !== null && stats.passesMade !== null) {
      passAttempts += stats.passAttempts;
      passesMade += stats.passesMade;
      passKnown += 1;
    }
    if (stats.tackleAttempts !== null && stats.tacklesMade !== null) {
      tackleAttempts += stats.tackleAttempts;
      tacklesMade += stats.tacklesMade;
      tackleKnown += 1;
    }
    if (stats.redCards !== null) {
      reds += stats.redCards;
      redsKnown += 1;
    }
    if (stats.rating !== null) {
      ratings.push(stats.rating);
      if (isOffensiveRole(sample.role)) offensiveRatings.push(stats.rating);
      if (isDefensiveRole(sample.role)) defensiveRatings.push(stats.rating);
    }
    if (sample.outcome !== "unknown") {
      decided += 1;
      if (sample.outcome === "win") wins += 1;
    }
  }

  const goalsPerMatch = perMatch(goals, goalsKnown);
  const shotsPerMatch = perMatch(shots, shotsKnown);
  const shotAccuracy = ratio(goals, shots);
  const offensiveRating = mean(offensiveRatings);
  const passSuccess = ratio(passesMade, passAttempts);
  const passVolume = perMatch(passesMade, passKnown);
  const tacklesPerMatch = perMatch(tacklesMade, tackleKnown);
  const tackleSuccess = ratio(tacklesMade, tackleAttempts);
  const defensiveRating = mean(defensiveRatings);
  const averageRating = mean(ratings);
  const winRate = decided === 0 ? null : wins / decided;
  const gaKnown = Math.max(goalsKnown, assistsKnown);
  const goalsAssistsPerMatch =
    gaKnown === 0
      ? null
      : ((goalsKnown === 0 ? 0 : goals) + (assistsKnown === 0 ? 0 : assists)) / played;
  const redsPerMatch = perMatch(reds, redsKnown);
  const offensiveConfidence = clamp(offensiveRatings.length / ROLE_RATING_FULL_CONFIDENCE, 0, 1);
  const defensiveConfidence = clamp(defensiveRatings.length / ROLE_RATING_FULL_CONFIDENCE, 0, 1);

  return [
    categoryScore("attack", [
      component(
        "goalsPerMatch",
        WEIGHTS.attack.goalsPerMatch,
        goalsPerMatch,
        "perMatch",
        goalsPerMatch === null ? null : perMatchToScore(goalsPerMatch, CAPS.goalsPerMatch),
        1,
        goalsKnown,
      ),
      component(
        "shotsPerMatch",
        WEIGHTS.attack.shotsPerMatch,
        shotsPerMatch,
        "perMatch",
        shotsPerMatch === null ? null : perMatchToScore(shotsPerMatch, CAPS.shotsPerMatch),
        1,
        shotsKnown,
      ),
      component(
        "shotAccuracy",
        WEIGHTS.attack.shotAccuracy,
        shotAccuracy,
        "percent",
        shotAccuracy === null ? null : ratioToScore(shotAccuracy),
        1,
        shotsKnown,
      ),
      component(
        "offensiveRoleRating",
        WEIGHTS.attack.offensiveRoleRating,
        offensiveRating,
        "rating",
        offensiveRating === null ? null : ratingToScore(offensiveRating),
        offensiveConfidence,
        offensiveRatings.length,
      ),
    ]),
    categoryScore("pass", [
      component(
        "passSuccess",
        WEIGHTS.pass.passSuccess,
        passSuccess,
        "percent",
        passSuccess === null ? null : ratioToScore(passSuccess),
        1,
        passKnown,
      ),
      component(
        "passVolume",
        WEIGHTS.pass.passVolume,
        passVolume,
        "perMatch",
        passVolume === null ? null : perMatchToScore(passVolume, CAPS.passVolumePerMatch),
        1,
        passKnown,
      ),
    ]),
    categoryScore("defense", [
      component(
        "tacklesMadePerMatch",
        WEIGHTS.defense.tacklesMadePerMatch,
        tacklesPerMatch,
        "perMatch",
        tacklesPerMatch === null
          ? null
          : perMatchToScore(tacklesPerMatch, CAPS.tacklesMadePerMatch),
        1,
        tackleKnown,
      ),
      component(
        "tackleSuccess",
        WEIGHTS.defense.tackleSuccess,
        tackleSuccess,
        "percent",
        tackleSuccess === null ? null : ratioToScore(tackleSuccess),
        1,
        tackleKnown,
      ),
      component(
        "defensiveRoleRating",
        WEIGHTS.defense.defensiveRoleRating,
        defensiveRating,
        "rating",
        defensiveRating === null ? null : ratingToScore(defensiveRating),
        defensiveConfidence,
        defensiveRatings.length,
      ),
    ]),
    categoryScore("impact", [
      component(
        "averageRating",
        WEIGHTS.impact.averageRating,
        averageRating,
        "rating",
        averageRating === null ? null : ratingToScore(averageRating),
        1,
        ratings.length,
      ),
      component(
        "winRate",
        WEIGHTS.impact.winRate,
        winRate,
        "percent",
        winRate === null ? null : ratioToScore(winRate),
        1,
        decided,
      ),
      component(
        "goalsAssistsPerMatch",
        WEIGHTS.impact.goalsAssistsPerMatch,
        goalsAssistsPerMatch,
        "perMatch",
        goalsAssistsPerMatch === null
          ? null
          : perMatchToScore(goalsAssistsPerMatch, CAPS.goalsAssistsPerMatch),
        1,
        played,
      ),
    ]),
    categoryScore("discipline", [
      component(
        "fewerRedsPerMatch",
        WEIGHTS.discipline.fewerRedsPerMatch,
        redsPerMatch,
        "perMatch",
        redsPerMatch === null ? null : fewerRedsToScore(redsPerMatch),
        1,
        redsKnown,
      ),
    ]),
  ];
}
