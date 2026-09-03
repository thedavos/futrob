import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import {
  isSameProviderPlayer,
  listedProviderPlayers,
  matchLeader,
  matchMvpPlayer,
  type ProviderMatchRosterModel,
  type ProviderPlayer,
  type ProviderRosterPlayer,
  type ProviderTeam,
} from "./provider-match-detail-model.ts";
import {
  MIN_PLAYMAKER_PASS_ATTEMPTS,
  matchRatioLeader,
  matchVolumeRatioLeader,
} from "./provider-match-detail-ranking.ts";

export const ROSTER_PLAYER_BADGE_PRIORITY = [
  "you",
  "mvp",
  "scorer",
  "playmaker",
  "assister",
  "defender",
] as const;

export type RosterPlayerBadge = (typeof ROSTER_PLAYER_BADGE_PRIORITY)[number];

export const MAX_ROSTER_PLAYER_BADGES = 2;

export const ROSTER_PLAYER_BADGE_LABEL_KEYS = {
  you: "player.matchDetail.you",
  mvp: "player.matches.mvp",
  scorer: "player.matchDetail.highlights.scorer",
  playmaker: "player.matchDetail.rosters.badge.playmaker",
  assister: "player.matchDetail.rosters.badge.assister",
  defender: "player.matchDetail.rosters.badge.defender",
} as const satisfies Record<RosterPlayerBadge, ParameterlessMessageKey>;

export type RosterColumnKey =
  | "player"
  | "position"
  | "rating"
  | "goals"
  | "assists"
  | "shots"
  | "passes"
  | "tackles";

export const ROSTER_COLUMNS = [
  { key: "player", labelKey: "player.matchDetail.rosters.column.player", align: "start" },
  {
    key: "position",
    labelKey: "player.matchDetail.rosters.column.position",
    abbrTitleKey: "player.matchDetail.metric.position",
    align: "start",
  },
  { key: "rating", labelKey: "player.matchDetail.rosters.column.rating", align: "end" },
  {
    key: "goals",
    labelKey: "player.matchDetail.rosters.column.goals",
    abbrTitleKey: "player.metric.goals",
    align: "end",
  },
  {
    key: "assists",
    labelKey: "player.matchDetail.rosters.column.assists",
    abbrTitleKey: "player.metric.assists",
    align: "end",
  },
  { key: "shots", labelKey: "player.matchDetail.rosters.column.shots", align: "end" },
  { key: "passes", labelKey: "player.matchDetail.rosters.column.passes", align: "end" },
  { key: "tackles", labelKey: "player.matchDetail.rosters.column.tackles", align: "end" },
] as const satisfies readonly {
  readonly key: RosterColumnKey;
  readonly labelKey: ParameterlessMessageKey;
  readonly abbrTitleKey?: ParameterlessMessageKey;
  readonly align: "start" | "end";
}[];

export type RosterColumn = (typeof ROSTER_COLUMNS)[number];

export interface MatchRosterAwards {
  readonly mvp: ProviderPlayer | null;
  readonly scorer: ProviderPlayer | null;
  readonly playmaker: ProviderPlayer | null;
  readonly assister: ProviderPlayer | null;
  readonly defender: ProviderPlayer | null;
}

export type RatingTone = "normal" | "good" | "excellent";

export function matchRosterAwards(sides: ProviderMatchRosterModel): MatchRosterAwards {
  const players = listedProviderPlayers(sides);
  return {
    mvp: matchMvpPlayer(players),
    scorer: matchLeader(players, (player) => player.goals),
    playmaker: matchRatioLeader(
      players,
      (player) => player.passesMade,
      (player) => player.passAttempts,
      MIN_PLAYMAKER_PASS_ATTEMPTS,
    ),
    assister: matchLeader(players, (player) => player.assists),
    defender: matchVolumeRatioLeader(
      players,
      (player) => player.tacklesMade,
      (player) => player.tackleAttempts,
    ),
  };
}

export function rosterPlayerBadges(
  entry: ProviderRosterPlayer,
  awards: MatchRosterAwards,
): readonly RosterPlayerBadge[] {
  return ROSTER_PLAYER_BADGE_PRIORITY.filter((kind) =>
    isRosterBadgeVisible(kind, entry, awards),
  ).slice(0, MAX_ROSTER_PLAYER_BADGES);
}

function isRosterBadgeVisible(
  kind: RosterPlayerBadge,
  entry: ProviderRosterPlayer,
  awards: MatchRosterAwards,
): boolean {
  switch (kind) {
    case "you":
      return entry.isPersonal;
    case "mvp":
      return entry.player.isMvp === true;
    case "scorer":
      return isAwarded(entry.player, awards.scorer);
    case "playmaker":
      return isAwarded(entry.player, awards.playmaker);
    case "assister":
      return isAwarded(entry.player, awards.assister);
    case "defender":
      return isAwarded(entry.player, awards.defender);
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function ratingTone(rating: number | null): RatingTone {
  if (rating === null || rating < 7) return "normal";
  if (rating < 9) return "good";
  return "excellent";
}

export function ratingBadgeVariant(tone: RatingTone): "outline" | "primary" {
  switch (tone) {
    case "normal":
      return "outline";
    case "good":
    case "excellent":
      return "primary";
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

export function isRosterWinner(team: ProviderTeam, opponent: ProviderTeam): boolean {
  return team.goals > opponent.goals;
}

export function ratioLabel(
  made: number | null,
  attempts: number | null,
  numberFormat: Intl.NumberFormat,
): string {
  if (made === null || attempts === null) return "—";
  return `${numberFormat.format(made)}/${numberFormat.format(attempts)}`;
}

export function formatKnownNumber(value: number | null, numberFormat: Intl.NumberFormat): string {
  return value === null ? "—" : numberFormat.format(value);
}

function isAwarded(player: ProviderPlayer, winner: ProviderPlayer | null): boolean {
  return winner !== null && isSameProviderPlayer(player, winner);
}
