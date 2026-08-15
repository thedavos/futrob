import type { PlayerRecentProviderMatchDto } from "@futrob/api-contracts";

export const RECENT_CALENDAR_DAYS = 7;

export const PLAYER_MATCHES_VIEWS = ["recent", "league", "playoff", "friendly", "all"] as const;
export type PlayerMatchesView = (typeof PLAYER_MATCHES_VIEWS)[number];

export type ProviderMatchMode = "leagueMatch" | "playoffMatch" | "friendlyMatch";

export function isPlayerMatchesView(value: unknown): value is PlayerMatchesView {
  return PLAYER_MATCHES_VIEWS.some((view) => view === value);
}

export function showsMatchTypeBadge(view: PlayerMatchesView): boolean {
  return view === "recent" || view === "all";
}

export type ScoringFeat = "hatTrick" | "poker" | "repoker";

export function scoringFeat(goals: number | null): ScoringFeat | null {
  if (goals === null || goals < 3) return null;
  if (goals >= 5) return "repoker";
  if (goals === 4) return "poker";
  return "hatTrick";
}

export function scoringFeatPlayerName(item: PlayerRecentProviderMatchDto): string | null {
  if (scoringFeat(item.appearance.goals) === null) return null;
  const name = item.appearance.displayName.trim();
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
  const named = item.match.players.find((player) => player.isMvp === true);
  if (named) return named.displayName;
  if (item.appearance.isMvp === true) return item.appearance.displayName;
  return null;
}

export type MatchOutcome = "win" | "draw" | "loss" | "unknown";

export type MatchSide = "home" | "away";

export function playerMatchSide(item: PlayerRecentProviderMatchDto): MatchSide | null {
  const clubId = item.appearance.externalClubId;
  if (item.match.home.externalClubId === clubId) return "home";
  if (item.match.away.externalClubId === clubId) return "away";
  return null;
}

export type MatchRecordSummary = {
  readonly wins: number;
  readonly draws: number;
  readonly losses: number;
  readonly goals: number | null;
  readonly assists: number | null;
  readonly averageRating: number | null;
};

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

export function isWithinRecentCalendarDays(
  occurredAt: Date,
  now: Date,
  days = RECENT_CALENDAR_DAYS,
): boolean {
  const start = startOfLocalDay(now);
  start.setDate(start.getDate() - (days - 1));
  return occurredAt.getTime() >= start.getTime();
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
    if (item.appearance.goals !== null) {
      goalsSum += item.appearance.goals;
      goalsCount += 1;
    }
    if (item.appearance.assists !== null) {
      assistsSum += item.appearance.assists;
      assistsCount += 1;
    }
    if (item.appearance.rating !== null) {
      ratingSum += item.appearance.rating;
      ratingCount += 1;
    }
  }

  return {
    wins,
    draws,
    losses,
    goals: goalsCount === 0 ? null : goalsSum,
    assists: assistsCount === 0 ? null : assistsSum,
    averageRating: ratingCount === 0 ? null : ratingSum / ratingCount,
  };
}

export function filterRecentMatches(
  matches: readonly PlayerRecentProviderMatchDto[],
  now: Date,
): readonly PlayerRecentProviderMatchDto[] {
  return matches.filter((item) => isWithinRecentCalendarDays(new Date(item.match.occurredAt), now));
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
  now: Date,
): readonly PlayerRecentProviderMatchDto[] {
  switch (view) {
    case "recent":
      return filterRecentMatches(matches, now);
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
