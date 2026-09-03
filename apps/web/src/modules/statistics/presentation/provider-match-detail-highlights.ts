import {
  listedProviderPlayers,
  matchLeader,
  matchMvpPlayer,
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
  const opponentPlayers = sides.opponent.players.map((entry) => entry.player);
  const items: MatchHighlight[] = [];
  const allPlayers = listedProviderPlayers(sides);
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
  const scorer = matchLeader(allPlayers, (player) => player.goals);
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

function matchBestOpponent(players: readonly ProviderPlayer[]): ProviderPlayer | null {
  const rated = players.filter((player) => player.rating !== null);
  return rated.length === 0 ? null : (sortProviderPlayers(rated)[0] ?? null);
}
