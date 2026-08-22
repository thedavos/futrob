import {
  compareRatings,
  sortProviderPlayers,
  type ProviderMatchRosterModel,
  type ProviderPlayer,
} from "./provider-match-detail-model.ts";

export type MatchHighlight =
  | {
      readonly kind: "mvp";
      readonly player: ProviderPlayer;
      readonly rating: number | null;
      readonly assists: number | null;
      readonly passesMade: number | null;
      readonly passAttempts: number | null;
    }
  | {
      readonly kind: "scorer";
      readonly player: ProviderPlayer;
      readonly goals: number | null;
      readonly shots: number | null;
      readonly rating: number | null;
    }
  | {
      readonly kind: "playmaker";
      readonly player: ProviderPlayer;
      readonly assists: number | null;
      readonly passesMade: number | null;
      readonly passAttempts: number | null;
      readonly rating: number | null;
    }
  | {
      readonly kind: "rival";
      readonly player: ProviderPlayer;
      readonly rating: number | null;
      readonly passesMade: number | null;
      readonly passAttempts: number | null;
      readonly tacklesMade: number | null;
    };

export interface MatchHighlightsModel {
  readonly items: readonly MatchHighlight[];
}

export function matchHighlights(sides: ProviderMatchRosterModel): MatchHighlightsModel {
  const selectedPlayers = sides.selected.players.map((entry) => entry.player);
  const opponentPlayers = sides.opponent.players.map((entry) => entry.player);
  const items: MatchHighlight[] = [];
  const allPlayers = [...selectedPlayers, ...opponentPlayers];
  const mvp = matchMvpPlayer(allPlayers);
  if (mvp) {
    items.push({
      kind: "mvp",
      player: mvp,
      rating: mvp.rating,
      assists: mvp.assists,
      passesMade: mvp.passesMade,
      passAttempts: mvp.passAttempts,
    });
  }
  const scorer = matchTopScorer(allPlayers);
  if (scorer) {
    items.push({
      kind: "scorer",
      player: scorer,
      goals: scorer.goals,
      shots: scorer.shots,
      rating: scorer.rating,
    });
  }
  const playmaker = matchLeader(allPlayers, (player) => player.assists);
  if (playmaker) {
    items.push({
      kind: "playmaker",
      player: playmaker,
      assists: playmaker.assists,
      passesMade: playmaker.passesMade,
      passAttempts: playmaker.passAttempts,
      rating: playmaker.rating,
    });
  }
  const rival = matchBestOpponent(opponentPlayers);
  if (rival) {
    items.push({
      kind: "rival",
      player: rival,
      rating: rival.rating,
      passesMade: rival.passesMade,
      passAttempts: rival.passAttempts,
      tacklesMade: rival.tacklesMade,
    });
  }
  return { items };
}

export function matchMvpPlayer(players: readonly ProviderPlayer[]): ProviderPlayer | null {
  const flagged = players.filter((player) => player.isMvp === true);
  return flagged.length === 0 ? null : (sortProviderPlayers(flagged)[0] ?? null);
}

function matchLeader(
  players: readonly ProviderPlayer[],
  value: (player: ProviderPlayer) => number | null,
): ProviderPlayer | null {
  const contenders = players
    .map((player, index) => ({ player, index, stat: value(player) }))
    .filter((entry) => entry.stat !== null && entry.stat > 0);
  if (contenders.length === 0) return null;
  const [best] = contenders.sort((left, right) => {
    const statOrder = (right.stat ?? 0) - (left.stat ?? 0);
    if (statOrder !== 0) return statOrder;
    const ratingOrder = compareRatings(left.player.rating, right.player.rating);
    if (ratingOrder !== 0) return ratingOrder;
    return left.index - right.index;
  });
  return best?.player ?? null;
}

function matchTopScorer(players: readonly ProviderPlayer[]): ProviderPlayer | null {
  const scorers = players.filter((player) => player.goals !== null && player.goals > 0);
  if (scorers.length === 0) return null;
  return (
    [...scorers]
      .map((player, index) => ({ player, index }))
      .sort((left, right) => {
        const goalsOrder = (right.player.goals ?? 0) - (left.player.goals ?? 0);
        if (goalsOrder !== 0) return goalsOrder;
        const ratingOrder = compareRatings(left.player.rating, right.player.rating);
        if (ratingOrder !== 0) return ratingOrder;
        return left.index - right.index;
      })[0]?.player ?? null
  );
}

function matchBestOpponent(players: readonly ProviderPlayer[]): ProviderPlayer | null {
  const rated = players.filter((player) => player.rating !== null);
  return rated.length === 0 ? null : (sortProviderPlayers(rated)[0] ?? null);
}
