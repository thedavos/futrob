import type { PlayerRecentProviderMatchDto } from "@futrob/api-contracts";

import { playedAppearance } from "./player-match-view-appearance.ts";
import { listedClubGoals, matchOutcome } from "./player-match-view-side.ts";
import { sortMatchesByOccurredAt } from "./player-match-view-filters.ts";

export type AppearanceContribution = "contributed" | "blank" | "unknown";

export type TeamGoalShare =
  | { readonly kind: "ready"; readonly ratio: number }
  | { readonly kind: "noClubGoals" }
  | { readonly kind: "unknown" };

export type ContributedRatio =
  | { readonly kind: "ready"; readonly contributed: number; readonly known: number }
  | { readonly kind: "unknown" };

export type ContributionPace =
  | { readonly kind: "ready"; readonly rate: number }
  | { readonly kind: "unknown" };

export type ContributionSummary = {
  readonly playedAppearances: number;
  readonly contributed: ContributedRatio;
  readonly pace: ContributionPace;
  readonly teamGoalShare: TeamGoalShare;
};

export type MatchRecordSummary = {
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
  readonly goals: number | null;
  readonly assists: number | null;
  readonly goalsPlusAssists: number | null;
  readonly averageRating: number | null;
  readonly contributions: ContributionSummary;
};

export const RECENT_FORM_MIN_MATCHES = 2;
export const LAST_FORM_GAMES = 3;
export const RATING_SCALE_MAX = 10;
export const RATING_TREND_WINDOW = 5;

export function appearanceContribution({
  assists,
  goals,
}: {
  readonly assists: number | null;
  readonly goals: number | null;
}): AppearanceContribution {
  if ((goals ?? 0) > 0 || (assists ?? 0) > 0) return "contributed";
  if (goals === 0 && assists === 0) return "blank";
  return "unknown";
}

export function averageAppearanceRating(
  matches: readonly PlayerRecentProviderMatchDto[],
): number | null {
  let sum = 0;
  let count = 0;
  for (const item of matches) {
    const rating = playedAppearance(item)?.rating;
    if (rating !== null && rating !== undefined) {
      sum += rating;
      count += 1;
    }
  }
  return count === 0 ? null : sum / count;
}

export type RatingTrend = {
  readonly delta: number;
  readonly window: number;
};

export function ratingTrendVsLast(
  matches: readonly PlayerRecentProviderMatchDto[],
  window = RATING_TREND_WINDOW,
): RatingTrend | null {
  const timeline = formTimeline(matches);
  if (timeline.length <= window) return null;
  const recentAvg = averageAppearanceRating(timeline.slice(-window));
  const previousAvg = averageAppearanceRating(timeline.slice(0, -window));
  if (recentAvg === null || previousAvg === null) return null;
  return { delta: recentAvg - previousAvg, window };
}

export function showsRecentForm(matches: readonly PlayerRecentProviderMatchDto[]): boolean {
  return matches.length >= RECENT_FORM_MIN_MATCHES;
}

export function showsPerformanceStats(record: MatchRecordSummary): boolean {
  return record.averageRating !== null;
}

export function showsContributionStats(record: MatchRecordSummary): boolean {
  return record.goalsPlusAssists !== null;
}

export function formTimeline(
  matches: readonly PlayerRecentProviderMatchDto[],
): readonly PlayerRecentProviderMatchDto[] {
  return sortMatchesByOccurredAt(matches, "oldest");
}

export function lastFormGames(
  matches: readonly PlayerRecentProviderMatchDto[],
  count = LAST_FORM_GAMES,
): readonly PlayerRecentProviderMatchDto[] {
  return formTimeline(matches).slice(-count);
}

export function summarizeMatchRecord(
  matches: readonly PlayerRecentProviderMatchDto[],
): MatchRecordSummary {
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsSum = 0;
  let goalsCount = 0;
  let assistsSum = 0;
  let assistsCount = 0;
  let ratingSum = 0;
  let ratingCount = 0;

  for (const item of matches) {
    const outcome = matchOutcome(item);
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
        break;
      default: {
        const _exhaustive: never = outcome;
        return _exhaustive;
      }
    }
    const appearance = playedAppearance(item);
    if (!appearance) continue;
    if (appearance.goals !== null) {
      goalsSum += appearance.goals;
      goalsCount += 1;
    }
    if (appearance.assists !== null) {
      assistsSum += appearance.assists;
      assistsCount += 1;
    }
    if (appearance.rating !== null) {
      ratingSum += appearance.rating;
      ratingCount += 1;
    }
  }

  const goals = goalsCount === 0 ? null : goalsSum;
  const assists = assistsCount === 0 ? null : assistsSum;
  const goalsPlusAssists =
    goals === null && assists === null ? null : (goals ?? 0) + (assists ?? 0);

  return {
    wins,
    draws,
    losses,
    goals,
    assists,
    goalsPlusAssists,
    averageRating: ratingCount === 0 ? null : ratingSum / ratingCount,
    contributions: summarizeContributions({ matches, goalsPlusAssists }),
  };
}

export function summarizeContributions({
  goalsPlusAssists,
  matches,
}: {
  readonly goalsPlusAssists: number | null;
  readonly matches: readonly PlayerRecentProviderMatchDto[];
}): ContributionSummary {
  let playedAppearances = 0;
  let contributedMatches = 0;
  let knownContributionMatches = 0;
  let playerGoalsForShare = 0;
  let shareSampleCount = 0;
  let clubGoalsForShare = 0;

  for (const item of matches) {
    const appearance = playedAppearance(item);
    if (!appearance) continue;
    playedAppearances += 1;
    const contribution = appearanceContribution({
      goals: appearance.goals,
      assists: appearance.assists,
    });
    switch (contribution) {
      case "contributed":
        contributedMatches += 1;
        knownContributionMatches += 1;
        break;
      case "blank":
        knownContributionMatches += 1;
        break;
      case "unknown":
        break;
      default: {
        const _exhaustive: never = contribution;
        return _exhaustive;
      }
    }
    const clubGoals = listedClubGoals(item);
    if (appearance.goals !== null && clubGoals !== null) {
      playerGoalsForShare += appearance.goals;
      shareSampleCount += 1;
      clubGoalsForShare += clubGoals;
    }
  }

  return {
    playedAppearances,
    contributed:
      knownContributionMatches === 0
        ? { kind: "unknown" }
        : {
            kind: "ready",
            contributed: contributedMatches,
            known: knownContributionMatches,
          },
    pace:
      goalsPlusAssists === null || playedAppearances === 0 || knownContributionMatches === 0
        ? { kind: "unknown" }
        : { kind: "ready", rate: goalsPlusAssists / playedAppearances },
    teamGoalShare: teamGoalShareFromSample({
      clubGoals: clubGoalsForShare,
      playerGoals: playerGoalsForShare,
      sampleCount: shareSampleCount,
    }),
  };
}

function teamGoalShareFromSample({
  clubGoals,
  playerGoals,
  sampleCount,
}: {
  readonly clubGoals: number;
  readonly playerGoals: number;
  readonly sampleCount: number;
}): TeamGoalShare {
  if (sampleCount === 0) return { kind: "unknown" };
  if (clubGoals === 0) return { kind: "noClubGoals" };
  return { kind: "ready", ratio: playerGoals / clubGoals };
}
