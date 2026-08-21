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
