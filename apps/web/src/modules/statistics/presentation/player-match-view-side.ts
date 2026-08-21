import type { PlayerRecentProviderMatchDto } from "@futrob/api-contracts";

export type MatchOutcome = "win" | "draw" | "loss" | "unknown";

export type MatchSide = "home" | "away";

export function listedClubId(item: { readonly listedExternalClubId: string }): string {
  return item.listedExternalClubId;
}

export function playerMatchSide(item: {
  readonly listedExternalClubId: string;
  readonly match: {
    readonly home: { readonly externalClubId: string };
    readonly away: { readonly externalClubId: string };
  };
}): MatchSide | null {
  const clubId = listedClubId(item);
  if (item.match.home.externalClubId === clubId) return "home";
  if (item.match.away.externalClubId === clubId) return "away";
  return null;
}

export function listedClubGoals(item: PlayerRecentProviderMatchDto): number | null {
  const side = playerMatchSide(item);
  if (side === "home") return item.match.home.goals;
  if (side === "away") return item.match.away.goals;
  return null;
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
