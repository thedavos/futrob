import type {
  PlayerRecentProviderMatchDetailDto,
  PlayerRecentProviderMatchDto,
  ProviderMatchDto,
} from "@futrob/api-contracts";
import type { ParameterlessMessageKey } from "@/shared/presentation/i18n/catalogs.ts";
import { playerMatchSide } from "./player-match-view.ts";
import {
  matchHighlights,
  type MatchHighlight,
  type MatchHighlightsModel,
} from "./provider-match-detail-highlights.ts";

export type { MatchHighlight, MatchHighlightsModel };

export type ProviderPlayer = ProviderMatchDto["players"][number];
type ProviderTeam = ProviderMatchDto["home"];

export type TeamStatValue =
  | { readonly kind: "ready"; readonly value: number }
  | { readonly kind: "unknown" };

export type TeamComparisonMetricKey =
  | "goals"
  | "shots"
  | "passesMade"
  | "passAccuracy"
  | "tacklesMade"
  | "redCards"
  | "yellowCards"
  | "assists";

export type TeamComparisonMetricFormat = "count" | "percent";

export interface TeamComparisonMetric {
  readonly key: TeamComparisonMetricKey;
  readonly format: TeamComparisonMetricFormat;
  readonly labelKey: ParameterlessMessageKey;
}

export const TEAM_COMPARISON_METRICS = [
  { key: "goals", format: "count", labelKey: "player.metric.goals" },
  { key: "shots", format: "count", labelKey: "player.metric.shots" },
  { key: "passesMade", format: "count", labelKey: "player.metric.passesMade" },
  { key: "passAccuracy", format: "percent", labelKey: "player.matchDetail.metric.passAccuracy" },
  { key: "tacklesMade", format: "count", labelKey: "player.metric.tacklesMade" },
  { key: "redCards", format: "count", labelKey: "player.metric.redCards" },
  { key: "yellowCards", format: "count", labelKey: "player.metric.yellowCards" },
  { key: "assists", format: "count", labelKey: "player.metric.assists" },
] as const satisfies readonly TeamComparisonMetric[];

export type TeamComparisonStats = {
  readonly [K in TeamComparisonMetricKey]: TeamStatValue;
};

export interface TeamComparisonSide {
  readonly team: ProviderTeam;
  readonly stats: TeamComparisonStats;
}

export interface TeamComparisonModel {
  readonly selected: TeamComparisonSide;
  readonly opponent: TeamComparisonSide;
}

export type MatchHighlightKind = MatchHighlight["kind"];

export type ProviderPlayerMetricKey =
  | "position"
  | "minutesPlayed"
  | "goals"
  | "assists"
  | "shots"
  | "passAttempts"
  | "passesMade"
  | "tackleAttempts"
  | "tacklesMade"
  | "saves"
  | "yellowCards"
  | "redCards"
  | "rating";

interface TextProviderPlayerMetric {
  readonly kind: "text";
  readonly key: "position";
  readonly labelKey: ParameterlessMessageKey;
}

interface NumberProviderPlayerMetric {
  readonly kind: "number";
  readonly key: Exclude<ProviderPlayerMetricKey, "position">;
  readonly labelKey: ParameterlessMessageKey;
}

export type ProviderPlayerMetric = TextProviderPlayerMetric | NumberProviderPlayerMetric;

export const PROVIDER_PLAYER_METRICS = [
  { kind: "text", key: "position", labelKey: "player.matchDetail.metric.position" },
  { kind: "number", key: "minutesPlayed", labelKey: "player.metric.minutes" },
  { kind: "number", key: "goals", labelKey: "player.metric.goals" },
  { kind: "number", key: "assists", labelKey: "player.metric.assists" },
  { kind: "number", key: "shots", labelKey: "player.metric.shots" },
  { kind: "number", key: "passAttempts", labelKey: "player.metric.passAttempts" },
  { kind: "number", key: "passesMade", labelKey: "player.metric.passesMade" },
  { kind: "number", key: "tackleAttempts", labelKey: "player.metric.tackleAttempts" },
  { kind: "number", key: "tacklesMade", labelKey: "player.metric.tacklesMade" },
  { kind: "number", key: "saves", labelKey: "player.metric.saves" },
  { kind: "number", key: "yellowCards", labelKey: "player.metric.yellowCards" },
  { kind: "number", key: "redCards", labelKey: "player.metric.redCards" },
  { kind: "number", key: "rating", labelKey: "player.metric.rating" },
] as const satisfies readonly ProviderPlayerMetric[];

export function providerPositionLabelKey(value: string): ParameterlessMessageKey | null {
  switch (value) {
    case "goalkeeper":
      return "player.matchDetail.position.goalkeeper";
    case "defender":
      return "player.matchDetail.position.defender";
    case "midfielder":
      return "player.matchDetail.position.midfielder";
    case "forward":
      return "player.matchDetail.position.forward";
    default:
      return null;
  }
}

export interface ProviderRosterPlayer {
  readonly player: ProviderPlayer;
  readonly isPersonal: boolean;
}

export interface ProviderRosterSection {
  readonly team: ProviderTeam;
  readonly players: readonly ProviderRosterPlayer[];
}

export interface ProviderMatchRosterModel {
  readonly selected: ProviderRosterSection;
  readonly opponent: ProviderRosterSection;
}

export type PlayedAppearance = Extract<
  PlayerRecentProviderMatchDetailDto,
  { kind: "played" }
>["appearance"];

export interface ProviderMatchDetailModel {
  readonly listed: PlayerRecentProviderMatchDto;
  readonly sides: ProviderMatchRosterModel;
  readonly comparison: TeamComparisonModel;
  readonly highlights: MatchHighlightsModel;
  readonly appearance: PlayedAppearance | null;
}

export function providerMatchDetailModel(
  detail: PlayerRecentProviderMatchDetailDto,
): ProviderMatchDetailModel {
  const sides = providerMatchRosterModel(detail);
  return {
    listed: listedMatchFromDetail(detail),
    sides,
    comparison: {
      selected: {
        team: sides.selected.team,
        stats: teamStats(sides.selected.team, sides.selected.players),
      },
      opponent: {
        team: sides.opponent.team,
        stats: teamStats(sides.opponent.team, sides.opponent.players),
      },
    },
    highlights: matchHighlights(sides),
    appearance: detail.kind === "played" ? detail.appearance : null,
  };
}

export function listedMatchFromDetail(
  detail: PlayerRecentProviderMatchDetailDto,
): PlayerRecentProviderMatchDto {
  const { players: _players, ...match } = detail.match;
  const listedMvpDisplayName = listedMvpDisplayNameFromDetail(detail);
  switch (detail.kind) {
    case "played":
      return {
        kind: "played",
        match,
        appearance: detail.appearance,
        listedExternalClubId: detail.listedExternalClubId,
        listedMvpDisplayName,
      };
    case "not_played":
      return {
        kind: "not_played",
        match,
        listedExternalClubId: detail.listedExternalClubId,
        listedMvpDisplayName,
      };
    default: {
      const _exhaustive: never = detail;
      return _exhaustive;
    }
  }
}

function listedMvpDisplayNameFromDetail(detail: PlayerRecentProviderMatchDetailDto): string | null {
  const listedMvp = detail.match.players.find(
    (player) => player.isMvp === true && player.externalClubId === detail.listedExternalClubId,
  );
  if (listedMvp) return listedMvp.displayName;
  if (
    detail.kind === "played" &&
    detail.appearance.isMvp === true &&
    detail.appearance.externalClubId === detail.listedExternalClubId
  ) {
    return detail.appearance.displayName;
  }
  return null;
}

export function providerMatchRosterModel(
  detail: PlayerRecentProviderMatchDetailDto,
): ProviderMatchRosterModel {
  const side = playerMatchSide(detail);
  if (side === null) {
    throw new TypeError("Listed club is not part of the provider match");
  }

  const selected = side === "home" ? detail.match.home : detail.match.away;
  const opponent = side === "home" ? detail.match.away : detail.match.home;
  return {
    selected: rosterSection(detail, selected),
    opponent: rosterSection(detail, opponent),
  };
}

export interface ComparisonBarShares {
  readonly selected: number;
  readonly opponent: number;
}

export function comparisonBarShares(
  selected: TeamStatValue,
  opponent: TeamStatValue,
): ComparisonBarShares {
  const selectedValue = selected.kind === "ready" ? selected.value : 0;
  const opponentValue = opponent.kind === "ready" ? opponent.value : 0;
  const max = Math.max(selectedValue, opponentValue);
  if (max === 0) {
    const empty: ComparisonBarShares = { selected: 0, opponent: 0 };
    return empty;
  }
  const shares: ComparisonBarShares = {
    selected: (selectedValue / max) * 100,
    opponent: (opponentValue / max) * 100,
  };
  return shares;
}

function teamStats(
  team: ProviderTeam,
  players: readonly ProviderRosterPlayer[],
): TeamComparisonStats {
  const roster = players.map((entry) => entry.player);
  const passesMade = sumKnown(roster, (player) => player.passesMade);
  const passAttempts = sumKnown(roster, (player) => player.passAttempts);
  return {
    goals: { kind: "ready", value: team.goals },
    shots: sumKnown(roster, (player) => player.shots),
    passesMade,
    passAccuracy: passAccuracy(passesMade, passAttempts),
    tacklesMade: sumKnown(roster, (player) => player.tacklesMade),
    redCards: sumKnown(roster, (player) => player.redCards),
    yellowCards: sumKnown(roster, (player) => player.yellowCards),
    assists: sumKnown(roster, (player) => player.assists),
  };
}

function sumKnown(
  players: readonly ProviderPlayer[],
  value: (player: ProviderPlayer) => number | null,
): TeamStatValue {
  if (players.length === 0) return { kind: "unknown" };
  let total = 0;
  for (const player of players) {
    const stat = value(player);
    if (stat === null) return { kind: "unknown" };
    total += stat;
  }
  return { kind: "ready", value: total };
}

function passAccuracy(made: TeamStatValue, attempts: TeamStatValue): TeamStatValue {
  if (made.kind === "unknown" || attempts.kind === "unknown" || attempts.value === 0) {
    return { kind: "unknown" };
  }
  return { kind: "ready", value: made.value / attempts.value };
}

function rosterSection(
  detail: PlayerRecentProviderMatchDetailDto,
  team: ProviderTeam,
): ProviderRosterSection {
  return {
    team,
    players: sortProviderPlayers(
      detail.match.players.filter((player) => player.externalClubId === team.externalClubId),
    ).map((player) => ({
      player,
      isPersonal:
        detail.kind === "played" &&
        player.externalClubId === detail.appearance.externalClubId &&
        player.externalPlayerId === detail.appearance.externalPlayerId,
    })),
  };
}

export function sortProviderPlayers(players: readonly ProviderPlayer[]): readonly ProviderPlayer[] {
  return players
    .map((player, index) => ({ player, index }))
    .sort((left, right) => {
      const ratingOrder = compareRatings(left.player.rating, right.player.rating);
      if (ratingOrder !== 0) return ratingOrder;
      const nameOrder = left.player.displayName.localeCompare(right.player.displayName, "en", {
        sensitivity: "base",
      });
      return nameOrder === 0 ? left.index - right.index : nameOrder;
    })
    .map(({ player }) => player);
}

export function compareRatings(left: number | null, right: number | null): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return right - left;
}
