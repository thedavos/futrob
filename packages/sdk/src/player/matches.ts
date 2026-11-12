import type {
  GetMyRecentMatchesResponse,
  PlayerRecentProviderMatchDto,
} from "@futrob/api-contracts";

/**
 * Mis partidos: the provider matches of the selected EA club, as web shows them
 * (`apps/web/src/modules/statistics/presentation/player-match-view*.ts`). These are provider
 * observations, not official results.
 */
export const PLAYER_MATCHES_VIEWS = ["all", "league", "playoff", "friendly"] as const;
export type PlayerMatchesView = (typeof PLAYER_MATCHES_VIEWS)[number];

export const MATCH_SORT_ORDERS = ["newest", "oldest"] as const;
export type MatchSortOrder = (typeof MATCH_SORT_ORDERS)[number];

export type ProviderMatchMode = "leagueMatch" | "playoffMatch" | "friendlyMatch";
export type MatchOutcome = "win" | "draw" | "loss" | "unknown";
export type MatchSide = "home" | "away";
export type ScoringFeat = "hatTrick" | "poker" | "repoker";
export type CalendarDayKind = "today" | "yesterday" | "other";

type MatchSides = {
  readonly listedExternalClubId: string;
  readonly match: {
    readonly home: {
      readonly externalClubId: string;
      readonly name: string;
      readonly goals: number;
    };
    readonly away: {
      readonly externalClubId: string;
      readonly name: string;
      readonly goals: number;
    };
  };
};

const VIEW_MODE = {
  league: "leagueMatch",
  playoff: "playoffMatch",
  friendly: "friendlyMatch",
} as const satisfies Record<Exclude<PlayerMatchesView, "all">, ProviderMatchMode>;

export function providerMatchMode(item: {
  readonly match: { readonly game: { readonly mode: string } };
}): ProviderMatchMode | null {
  switch (item.match.game.mode) {
    case "leagueMatch":
    case "playoffMatch":
    case "friendlyMatch":
      return item.match.game.mode;
    default:
      return null;
  }
}

export function matchesForView(
  matches: readonly PlayerRecentProviderMatchDto[],
  view: PlayerMatchesView,
): readonly PlayerRecentProviderMatchDto[] {
  if (view === "all") return matches;
  return matches.filter((item) => providerMatchMode(item) === VIEW_MODE[view]);
}

export function sortMatchesByOccurredAt(
  matches: readonly PlayerRecentProviderMatchDto[],
  order: MatchSortOrder,
): readonly PlayerRecentProviderMatchDto[] {
  return [...matches].sort((left, right) => {
    const delta = Date.parse(left.match.occurredAt) - Date.parse(right.match.occurredAt);
    if (delta !== 0) return order === "oldest" ? delta : -delta;
    return left.match.id.localeCompare(right.match.id);
  });
}

/** Which side the listed (selected) club played; `null` when it is on neither. */
export function playerMatchSide(item: MatchSides): MatchSide | null {
  if (item.match.home.externalClubId === item.listedExternalClubId) return "home";
  if (item.match.away.externalClubId === item.listedExternalClubId) return "away";
  return null;
}

/** Win/draw/loss from the selected club's side, whether or not the player played. */
export function matchOutcome(item: MatchSides): MatchOutcome {
  const side = playerMatchSide(item);
  if (side === null) return "unknown";
  const scored = side === "home" ? item.match.home.goals : item.match.away.goals;
  const conceded = side === "home" ? item.match.away.goals : item.match.home.goals;
  if (scored > conceded) return "win";
  if (scored < conceded) return "loss";
  return "draw";
}

export function opponentClubName(item: MatchSides): string | null {
  const side = playerMatchSide(item);
  if (side === null) return null;
  const name = (side === "home" ? item.match.away.name : item.match.home.name).trim();
  return name.length > 0 ? name : null;
}

/** Goals in one appearance: 3 hat-trick, 4 poker, 5+ repoker. */
export function scoringFeat(goals: number | null): ScoringFeat | null {
  if (goals === null || goals < 3) return null;
  if (goals >= 5) return "repoker";
  if (goals === 4) return "poker";
  return "hatTrick";
}

export function appearanceScoringFeat(item: PlayerRecentProviderMatchDto): ScoringFeat | null {
  return item.kind === "played" ? scoringFeat(item.appearance.goals) : null;
}

/** Forfeit or disconnection: the score is not a played result. */
export function isDnfMatch(item: {
  readonly match: {
    readonly metadata: { readonly winnerByForfeit: boolean; readonly wasDisconnected: boolean };
  };
}): boolean {
  return item.match.metadata.winnerByForfeit || item.match.metadata.wasDisconnected;
}

function startOfLocalDay(date: Date): Date {
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
  const today = startOfLocalDay(now);
  if (day === today.getTime()) return "today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return day === yesterday.getTime() ? "yesterday" : "other";
}

export type MatchDayGroup = {
  readonly dayKey: string;
  readonly occurredAt: Date;
  readonly kind: CalendarDayKind;
  readonly matches: readonly PlayerRecentProviderMatchDto[];
};

/** Consecutive matches of one local calendar day, in the order given. */
export function groupMatchesByDay(
  matches: readonly PlayerRecentProviderMatchDto[],
  now: Date,
): readonly MatchDayGroup[] {
  const groups: { dayKey: string; matches: PlayerRecentProviderMatchDto[] }[] = [];
  for (const item of matches) {
    const dayKey = calendarDayKey(new Date(item.match.occurredAt));
    const last = groups.at(-1);
    if (last?.dayKey === dayKey) last.matches.push(item);
    else groups.push({ dayKey, matches: [item] });
  }
  return groups.map((group) => {
    const occurredAt = new Date(group.matches[0]!.match.occurredAt);
    return {
      dayKey: group.dayKey,
      occurredAt,
      kind: calendarDayKind(occurredAt, now),
      matches: group.matches,
    };
  });
}

/**
 * What Mis partidos shows for a response, view and order. Missing prerequisites, no matches at
 * all and no matches for the chosen view are distinct states.
 */
export type PlayerMatchesState =
  | { readonly kind: "needs-club" }
  | { readonly kind: "needs-game-account" }
  | { readonly kind: "empty" }
  | { readonly kind: "filtered-empty"; readonly view: Exclude<PlayerMatchesView, "all"> }
  | { readonly kind: "ready"; readonly days: readonly MatchDayGroup[] };

export function presentPlayerMatches(
  response: GetMyRecentMatchesResponse,
  input: { readonly view: PlayerMatchesView; readonly order: MatchSortOrder; readonly now: Date },
): PlayerMatchesState {
  if (response.status === "needs_club") return { kind: "needs-club" };
  if (response.status === "needs_game_account") return { kind: "needs-game-account" };
  if (response.matches.length === 0) return { kind: "empty" };
  const visible = matchesForView(response.matches, input.view);
  if (visible.length === 0 && input.view !== "all") {
    return { kind: "filtered-empty", view: input.view };
  }
  return {
    kind: "ready",
    days: groupMatchesByDay(sortMatchesByOccurredAt(visible, input.order), input.now),
  };
}

/** One player's line in a provider match (the same schema as an appearance). */
export type ProviderPlayerMatchStatsDto = Extract<
  PlayerRecentProviderMatchDto,
  { kind: "played" }
>["appearance"];

type DetailMatch = {
  readonly listedExternalClubId: string;
  readonly match: {
    readonly home: {
      readonly externalClubId: string;
      readonly name: string;
      readonly goals: number;
    };
    readonly away: {
      readonly externalClubId: string;
      readonly name: string;
      readonly goals: number;
    };
    readonly players: readonly ProviderPlayerMatchStatsDto[];
  };
};

export type MatchRoster = {
  readonly side: MatchSide;
  readonly externalClubId: string;
  readonly name: string;
  readonly goals: number;
  readonly players: readonly ProviderPlayerMatchStatsDto[];
};

/**
 * Both line-ups of a match detail: the selected club first, then the rival. Each line-up is
 * ordered by rating, highest first, with unknown ratings last (design.md, «Detalle de partido
 * personal»). Stats stay as the provider sent them: `null` is never turned into zero.
 */
export function matchRosters(detail: DetailMatch): readonly MatchRoster[] {
  const listedSide = playerMatchSide(detail) ?? "home";
  const order: readonly MatchSide[] = listedSide === "home" ? ["home", "away"] : ["away", "home"];
  return order.map((side) => {
    const team = detail.match[side];
    return {
      side,
      externalClubId: team.externalClubId,
      name: team.name,
      goals: team.goals,
      players: detail.match.players
        .filter((player) => player.externalClubId === team.externalClubId)
        .sort((left, right) => {
          if (left.rating === null) return right.rating === null ? 0 : 1;
          if (right.rating === null) return -1;
          return right.rating - left.rating;
        }),
    };
  });
}
