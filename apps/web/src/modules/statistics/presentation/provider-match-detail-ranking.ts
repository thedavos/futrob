import { compareRatings, type ProviderPlayer } from "./provider-match-detail-model.ts";

export const MIN_PLAYMAKER_PASS_ATTEMPTS = 8;

export function matchRatioLeader(
  players: readonly ProviderPlayer[],
  made: (player: ProviderPlayer) => number | null,
  attempts: (player: ProviderPlayer) => number | null,
  minAttempts = 1,
): ProviderPlayer | null {
  const contenders: {
    readonly player: ProviderPlayer;
    readonly index: number;
    readonly tried: number;
    readonly ratio: number;
  }[] = [];
  for (const [index, player] of players.entries()) {
    const completed = made(player);
    const tried = attempts(player);
    if (completed === null || tried === null || tried < minAttempts || completed <= 0) continue;
    contenders.push({ player, index, tried, ratio: completed / tried });
  }
  if (contenders.length === 0) return null;
  const [best] = contenders.sort((left, right) => {
    const ratioOrder = right.ratio - left.ratio;
    if (ratioOrder !== 0) return ratioOrder;
    const volumeOrder = right.tried - left.tried;
    if (volumeOrder !== 0) return volumeOrder;
    const ratingOrder = compareRatings(left.player.rating, right.player.rating);
    if (ratingOrder !== 0) return ratingOrder;
    return left.index - right.index;
  });
  return best?.player ?? null;
}

export function matchVolumeRatioLeader(
  players: readonly ProviderPlayer[],
  made: (player: ProviderPlayer) => number | null,
  attempts: (player: ProviderPlayer) => number | null,
): ProviderPlayer | null {
  const contenders: {
    readonly player: ProviderPlayer;
    readonly index: number;
    readonly completed: number;
    readonly ratio: number | null;
  }[] = [];
  for (const [index, player] of players.entries()) {
    const completed = made(player);
    if (completed === null || completed <= 0) continue;
    const tried = attempts(player);
    const ratio = tried !== null && tried > 0 ? completed / tried : null;
    contenders.push({ player, index, completed, ratio });
  }
  if (contenders.length === 0) return null;
  const [best] = contenders.sort((left, right) => {
    const volumeOrder = right.completed - left.completed;
    if (volumeOrder !== 0) return volumeOrder;
    const ratioOrder = compareRatings(left.ratio, right.ratio);
    if (ratioOrder !== 0) return ratioOrder;
    const ratingOrder = compareRatings(left.player.rating, right.player.rating);
    if (ratingOrder !== 0) return ratingOrder;
    return left.index - right.index;
  });
  return best?.player ?? null;
}
