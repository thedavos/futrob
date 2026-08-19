import type { PlayerRecentProviderMatchDto } from "@futrob/api-contracts";

export const PLAYER_MATCHES_VIEWS = ["all", "league", "playoff", "friendly"] as const;
export type PlayerMatchesView = (typeof PLAYER_MATCHES_VIEWS)[number];

export const MATCH_SORT_ORDERS = ["newest", "oldest"] as const;
export type MatchSortOrder = (typeof MATCH_SORT_ORDERS)[number];

export type ProviderMatchMode = "leagueMatch" | "playoffMatch" | "friendlyMatch";

export function isPlayerMatchesView(value: string | null): value is PlayerMatchesView {
  return value !== null && PLAYER_MATCHES_VIEWS.some((view) => view === value);
}

export function isMatchSortOrder(value: string | null): value is MatchSortOrder {
  return value !== null && MATCH_SORT_ORDERS.some((order) => order === value);
}

export function showsMatchTypeBadge(view: PlayerMatchesView): boolean {
  return view === "all";
}

export type ScoringFeat = "hatTrick" | "poker" | "repoker";

export function scoringFeat(goals: number | null): ScoringFeat | null {
  if (goals === null || goals < 3) return null;
  if (goals >= 5) return "repoker";
  if (goals === 4) return "poker";
  return "hatTrick";
}

export function playedAppearance(
  item: PlayerRecentProviderMatchDto,
): Extract<PlayerRecentProviderMatchDto, { kind: "played" }>["appearance"] | null {
  return item.kind === "played" ? item.appearance : null;
}

export function appearanceScoringFeat(item: PlayerRecentProviderMatchDto): ScoringFeat | null {
  return scoringFeat(playedAppearance(item)?.goals ?? null);
}

export function scoringFeatPlayerName(item: PlayerRecentProviderMatchDto): string | null {
  const appearance = playedAppearance(item);
  if (!appearance || scoringFeat(appearance.goals) === null) return null;
  const name = appearance.displayName.trim();
  return name.length > 0 ? name : null;
}

export function isDnfMatch(item: PlayerRecentProviderMatchDto): boolean {
  return item.match.metadata.winnerByForfeit || item.match.metadata.wasDisconnected;
}

export function showsYellowCards(yellowCards: number | null): boolean {
  return yellowCards !== null && yellowCards > 0;
}

export function showsRedCards(redCards: number | null): boolean {
  return redCards !== null && redCards > 0;
}

export function matchMvpDisplayName(item: PlayerRecentProviderMatchDto): string | null {
  const listedMvp = item.match.players.find(
    (player) => player.isMvp === true && player.externalClubId === item.listedExternalClubId,
  );
  if (listedMvp) return listedMvp.displayName;
  const appearance = playedAppearance(item);
  if (appearance?.isMvp === true) return appearance.displayName;
  const named = item.match.players.find((player) => player.isMvp === true);
  return named && item.kind === "played" ? named.displayName : null;
}

export type MatchOutcome = "win" | "draw" | "loss" | "unknown";

export type MatchSide = "home" | "away";

export function listedClubId(item: PlayerRecentProviderMatchDto): string {
  return item.listedExternalClubId;
}

export function playerMatchSide(item: PlayerRecentProviderMatchDto): MatchSide | null {
  const clubId = listedClubId(item);
  if (item.match.home.externalClubId === clubId) return "home";
  if (item.match.away.externalClubId === clubId) return "away";
  return null;
}

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

export function listedClubGoals(item: PlayerRecentProviderMatchDto): number | null {
  const side = playerMatchSide(item);
  if (side === "home") return item.match.home.goals;
  if (side === "away") return item.match.away.goals;
  return null;
}

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

export type CalendarDayKind = "today" | "yesterday" | "other";

export type MatchDayGroup = {
  readonly dayKey: string;
  readonly occurredAt: Date;
  readonly matches: readonly PlayerRecentProviderMatchDto[];
};

export function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function calendarDayKey(occurredAt: Date): string {
  const day = startOfLocalDay(occurredAt);
  const month = String(day.getMonth() + 1).padStart(2, "0");
  const date = String(day.getDate()).padStart(2, "0");
  return `${day.getFullYear()}-${month}-${date}`;
}

export function calendarDayKind(occurredAt: Date, now: Date): CalendarDayKind {
  const day = startOfLocalDay(occurredAt).getTime();
  const today = startOfLocalDay(now).getTime();
  if (day === today) return "today";
  const yesterday = startOfLocalDay(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (day === yesterday.getTime()) return "yesterday";
  return "other";
}

export function matchOutcome(item: PlayerRecentProviderMatchDto): MatchOutcome {
  const side = playerMatchSide(item);
  if (side === null) return "unknown";
  const scored = side === "home" ? item.match.home.goals : item.match.away.goals;
  const conceded = side === "home" ? item.match.away.goals : item.match.home.goals;
  if (scored > conceded) return "win";
  if (scored < conceded) return "loss";
  return "draw";
}

export const RECENT_FORM_MIN_MATCHES = 2;
export const LAST_FORM_GAMES = 3;
export const RATING_SCALE_MAX = 10;
export const RATING_TREND_WINDOW = 5;

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

export function opponentClubName(item: PlayerRecentProviderMatchDto): string | null {
  const side = playerMatchSide(item);
  if (side === "home") {
    const name = item.match.away.name.trim();
    return name.length > 0 ? name : null;
  }
  if (side === "away") {
    const name = item.match.home.name.trim();
    return name.length > 0 ? name : null;
  }
  return null;
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

export function providerMatchMode(item: PlayerRecentProviderMatchDto): ProviderMatchMode | null {
  switch (item.match.game.mode) {
    case "leagueMatch":
    case "playoffMatch":
    case "friendlyMatch":
      return item.match.game.mode;
    default:
      return null;
  }
}

export function filterMatchesByMode(
  matches: readonly PlayerRecentProviderMatchDto[],
  mode: ProviderMatchMode,
): readonly PlayerRecentProviderMatchDto[] {
  return matches.filter((item) => providerMatchMode(item) === mode);
}

export function matchesForView(
  matches: readonly PlayerRecentProviderMatchDto[],
  view: PlayerMatchesView,
): readonly PlayerRecentProviderMatchDto[] {
  switch (view) {
    case "all":
      return matches;
    case "league":
      return filterMatchesByMode(matches, "leagueMatch");
    case "playoff":
      return filterMatchesByMode(matches, "playoffMatch");
    case "friendly":
      return filterMatchesByMode(matches, "friendlyMatch");
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}

export function sortMatchesByOccurredAt(
  matches: readonly PlayerRecentProviderMatchDto[],
  order: MatchSortOrder,
): readonly PlayerRecentProviderMatchDto[] {
  return [...matches].sort((left, right) => {
    const delta =
      new Date(left.match.occurredAt).getTime() - new Date(right.match.occurredAt).getTime();
    if (delta !== 0) return order === "oldest" ? delta : -delta;
    return left.match.id.localeCompare(right.match.id);
  });
}

export function groupMatchesByDay(
  matches: readonly PlayerRecentProviderMatchDto[],
): readonly MatchDayGroup[] {
  const groups = new Map<string, PlayerRecentProviderMatchDto[]>();
  const order: string[] = [];

  for (const item of matches) {
    const occurredAt = new Date(item.match.occurredAt);
    const dayKey = calendarDayKey(occurredAt);
    const existing = groups.get(dayKey);
    if (existing === undefined) {
      groups.set(dayKey, [item]);
      order.push(dayKey);
      continue;
    }
    existing.push(item);
  }

  return order.map((dayKey) => {
    const dayMatches = groups.get(dayKey) ?? [];
    return {
      dayKey,
      occurredAt: new Date(dayMatches[0]?.match.occurredAt ?? 0),
      matches: dayMatches,
    };
  });
}
