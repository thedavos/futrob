import type { PlayerRecentProviderMatchDto } from "@futrob/api-contracts";

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
  return item.listedMvpDisplayName;
}
