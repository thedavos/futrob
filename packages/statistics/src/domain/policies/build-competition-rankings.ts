import type { TeamId } from "@futrob/shared-kernel";
import {
  RANKING_FORMULA_VERSION,
  RANKING_KINDS,
  type RankingEligibilityConfig,
  type RankingKind,
  type RankingRow,
  type RankingSnapshot,
} from "../entities/ranking-snapshot.ts";
import type { PlayerMatchContribution } from "../entities/player-match-contribution.ts";
import type { TeamMatchContribution } from "../entities/team-match-contribution.ts";
import { isEligibleForRanking, resolveRankingEligibility } from "./ranking-eligibility.ts";

export function buildCompetitionRankings(input: {
  readonly competitionId: RankingSnapshot["competitionId"];
  readonly organizationId: RankingSnapshot["organizationId"];
  readonly playerContributions: readonly PlayerMatchContribution[];
  readonly teamContributions: readonly TeamMatchContribution[];
  readonly eligibility?: Partial<RankingEligibilityConfig>;
  readonly updatedAt: Date;
}): RankingSnapshot[] {
  const eligibility = resolveRankingEligibility(input.eligibility);
  const matchedPlayers = input.playerContributions.filter(
    (contribution) =>
      contribution.correlationStatus === "matched" && contribution.playerProfileId !== null,
  );
  const teamMinutesByTeam = sumTeamMatchClockMinutes(matchedPlayers);
  const teamGoalsAgainstByKey = indexTeamGoalsAgainst(input.teamContributions);
  const players = aggregatePlayers(matchedPlayers, teamGoalsAgainstByKey);

  return RANKING_KINDS.map((kind) =>
    buildKindSnapshot({
      competitionId: input.competitionId,
      organizationId: input.organizationId,
      kind,
      players,
      teamMinutesByTeam,
      eligibility,
      updatedAt: input.updatedAt,
    }),
  );
}

interface PlayerRankingAggregate {
  readonly playerProfileId: string;
  readonly teamId: TeamId | null;
  readonly matchesPlayed: number;
  readonly minutes: number;
  readonly minutesByTeam: ReadonlyMap<TeamId, number>;
  readonly goals: number;
  readonly assists: number;
  readonly mvpAwards: number;
  readonly ratingSum: number;
  readonly ratingCount: number;
  readonly saves: number;
  readonly goalsAgainst: number;
  readonly goalkeeperMatches: number;
  readonly sourceRevisionMax: number;
}

function buildKindSnapshot(input: {
  readonly competitionId: RankingSnapshot["competitionId"];
  readonly organizationId: RankingSnapshot["organizationId"];
  readonly kind: RankingKind;
  readonly players: readonly PlayerRankingAggregate[];
  readonly teamMinutesByTeam: ReadonlyMap<TeamId, number>;
  readonly eligibility: RankingEligibilityConfig;
  readonly updatedAt: Date;
}): RankingSnapshot {
  const candidates = input.players
    .filter((player) => isEligiblePlayer(player, input.teamMinutesByTeam, input.eligibility))
    .filter((player) => qualifiesForKind(player, input.kind))
    .map((player) => ({
      player,
      value: valueForKind(player, input.kind),
      secondary: secondaryForKind(player, input.kind),
    }))
    .sort((left, right) => {
      const valueOrder =
        input.kind === "goalkeeper"
          ? right.value - left.value || left.secondary - right.secondary
          : right.value - left.value;
      return valueOrder || left.player.playerProfileId.localeCompare(right.player.playerProfileId);
    });

  const rows: RankingRow[] = candidates.map((candidate, index) => ({
    position: index + 1,
    playerProfileId: candidate.player.playerProfileId,
    teamId: candidate.player.teamId,
    value: candidate.value,
    matchesPlayed: candidate.player.matchesPlayed,
    minutes: candidate.player.minutes,
  }));

  return {
    competitionId: input.competitionId,
    organizationId: input.organizationId,
    kind: input.kind,
    formulaVersion: RANKING_FORMULA_VERSION,
    eligibility: input.eligibility,
    rows,
    sourceRevisionMax:
      candidates.length === 0
        ? 0
        : Math.max(...candidates.map((candidate) => candidate.player.sourceRevisionMax)),
    updatedAt: input.updatedAt,
  };
}

function isEligiblePlayer(
  player: PlayerRankingAggregate,
  teamMinutesByTeam: ReadonlyMap<TeamId, number>,
  eligibility: RankingEligibilityConfig,
): boolean {
  if (
    isEligibleForRanking({
      matchesPlayed: player.matchesPlayed,
      playerMinutes: player.minutes,
      teamMinutes: 0,
      eligibility,
    })
  ) {
    return true;
  }

  for (const [teamId, playerMinutes] of player.minutesByTeam) {
    const teamMinutes = teamMinutesByTeam.get(teamId) ?? 0;
    if (
      isEligibleForRanking({
        matchesPlayed: player.matchesPlayed,
        playerMinutes,
        teamMinutes,
        eligibility,
      })
    ) {
      return true;
    }
  }
  return false;
}

function qualifiesForKind(player: PlayerRankingAggregate, kind: RankingKind): boolean {
  switch (kind) {
    case "scorer":
      return player.goals > 0;
    case "assister":
      return player.assists > 0;
    case "rating":
      return player.ratingCount > 0;
    case "mvp":
      return player.mvpAwards > 0;
    case "goalkeeper":
      return player.goalkeeperMatches > 0;
    default:
      return assertNever(kind);
  }
}

function valueForKind(player: PlayerRankingAggregate, kind: RankingKind): number {
  switch (kind) {
    case "scorer":
      return player.goals;
    case "assister":
      return player.assists;
    case "rating":
      return player.ratingCount === 0 ? 0 : player.ratingSum / player.ratingCount;
    case "mvp":
      return player.mvpAwards;
    case "goalkeeper":
      return player.saves;
    default:
      return assertNever(kind);
  }
}

function secondaryForKind(player: PlayerRankingAggregate, kind: RankingKind): number {
  switch (kind) {
    case "goalkeeper":
      return player.goalsAgainst;
    case "scorer":
    case "assister":
    case "rating":
    case "mvp":
      return 0;
    default:
      return assertNever(kind);
  }
}

function aggregatePlayers(
  contributions: readonly PlayerMatchContribution[],
  teamGoalsAgainstByKey: ReadonlyMap<string, number>,
): PlayerRankingAggregate[] {
  const byPlayer = new Map<string, MutablePlayer>();

  for (const contribution of contributions) {
    const playerProfileId = contribution.playerProfileId;
    if (playerProfileId === null) continue;
    const current =
      byPlayer.get(playerProfileId) ??
      ({
        playerProfileId,
        teamId: null,
        matchesPlayed: 0,
        minutes: 0,
        minutesByTeam: new Map<TeamId, number>(),
        goals: 0,
        assists: 0,
        mvpAwards: 0,
        ratingSum: 0,
        ratingCount: 0,
        saves: 0,
        goalsAgainst: 0,
        goalkeeperMatches: 0,
        sourceRevisionMax: 0,
        teamMinutesAccumulator: new Map<TeamId, number>(),
      } satisfies MutablePlayer);

    current.matchesPlayed += 1;
    current.sourceRevisionMax = Math.max(current.sourceRevisionMax, contribution.revision);
    if (contribution.minutesPlayed !== null) {
      current.minutes += contribution.minutesPlayed;
      if (contribution.teamId !== null) {
        current.minutesByTeam.set(
          contribution.teamId,
          (current.minutesByTeam.get(contribution.teamId) ?? 0) + contribution.minutesPlayed,
        );
      }
    }
    if (contribution.goals !== null) current.goals += contribution.goals;
    if (contribution.assists !== null) current.assists += contribution.assists;
    if (contribution.isMvp === true) current.mvpAwards += 1;
    if (contribution.rating !== null) {
      current.ratingSum += contribution.rating;
      current.ratingCount += 1;
    }

    if (isGoalkeeperPosition(contribution.position)) {
      current.goalkeeperMatches += 1;
      if (contribution.saves !== null) current.saves += contribution.saves;
      if (contribution.teamId !== null) {
        const key = teamGoalsAgainstKey({
          encounterId: contribution.encounterId,
          officialSlot: contribution.officialSlot,
          teamId: contribution.teamId,
        });
        current.goalsAgainst += teamGoalsAgainstByKey.get(key) ?? 0;
      }
    }

    if (contribution.teamId !== null) {
      current.teamMinutesAccumulator.set(
        contribution.teamId,
        (current.teamMinutesAccumulator.get(contribution.teamId) ?? 0) +
          (contribution.minutesPlayed ?? 0),
      );
    }

    byPlayer.set(playerProfileId, current);
  }

  return [...byPlayer.values()].map((player) => {
    let primaryTeam: TeamId | null = null;
    let primaryMinutes = -1;
    for (const [teamId, minutes] of player.teamMinutesAccumulator) {
      if (
        minutes > primaryMinutes ||
        (minutes === primaryMinutes &&
          primaryTeam !== null &&
          teamId.localeCompare(primaryTeam) < 0) ||
        (minutes === primaryMinutes && primaryTeam === null)
      ) {
        primaryTeam = teamId;
        primaryMinutes = minutes;
      }
    }
    return {
      playerProfileId: player.playerProfileId,
      teamId: primaryTeam,
      matchesPlayed: player.matchesPlayed,
      minutes: player.minutes,
      minutesByTeam: player.minutesByTeam,
      goals: player.goals,
      assists: player.assists,
      mvpAwards: player.mvpAwards,
      ratingSum: player.ratingSum,
      ratingCount: player.ratingCount,
      saves: player.saves,
      goalsAgainst: player.goalsAgainst,
      goalkeeperMatches: player.goalkeeperMatches,
      sourceRevisionMax: player.sourceRevisionMax,
    };
  });
}

/**
 * Team clock for DEC-043 is available match time per team (max player minutes
 * on that side per official match), not the roster-sum of player minutes.
 * Missing minutes default to 90 so a full match still has a usable clock.
 */
function sumTeamMatchClockMinutes(
  contributions: readonly PlayerMatchContribution[],
): Map<TeamId, number> {
  const perMatch = new Map<string, { readonly teamId: TeamId; readonly minutes: number }>();
  for (const contribution of contributions) {
    if (contribution.teamId === null) continue;
    const key = `${contribution.encounterId}:${contribution.officialSlot}:${contribution.teamId}`;
    const minutes = contribution.minutesPlayed ?? DEFAULT_MATCH_CLOCK_MINUTES;
    const current = perMatch.get(key);
    if (current === undefined || minutes > current.minutes) {
      perMatch.set(key, { teamId: contribution.teamId, minutes });
    }
  }

  const totals = new Map<TeamId, number>();
  for (const { teamId, minutes } of perMatch.values()) {
    totals.set(teamId, (totals.get(teamId) ?? 0) + minutes);
  }
  return totals;
}

const DEFAULT_MATCH_CLOCK_MINUTES = 90;

function indexTeamGoalsAgainst(
  contributions: readonly TeamMatchContribution[],
): Map<string, number> {
  const index = new Map<string, number>();
  for (const contribution of contributions) {
    if (contribution.correlationStatus !== "matched" || contribution.teamId === null) continue;
    index.set(
      teamGoalsAgainstKey({
        encounterId: contribution.encounterId,
        officialSlot: contribution.officialSlot,
        teamId: contribution.teamId,
      }),
      contribution.goalsAgainst,
    );
  }
  return index;
}

function teamGoalsAgainstKey(input: {
  readonly encounterId: string;
  readonly officialSlot: 1 | 2;
  readonly teamId: TeamId;
}): string {
  return `${input.encounterId}:${input.officialSlot}:${input.teamId}`;
}

export function isGoalkeeperPosition(position: string | null): boolean {
  if (position === null) return false;
  const normalized = position
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  return (
    normalized === "gk" ||
    normalized === "goalkeeper" ||
    normalized === "goalie" ||
    normalized === "portero" ||
    normalized === "arquero"
  );
}

interface MutablePlayer {
  playerProfileId: string;
  teamId: TeamId | null;
  matchesPlayed: number;
  minutes: number;
  minutesByTeam: Map<TeamId, number>;
  goals: number;
  assists: number;
  mvpAwards: number;
  ratingSum: number;
  ratingCount: number;
  saves: number;
  goalsAgainst: number;
  goalkeeperMatches: number;
  sourceRevisionMax: number;
  teamMinutesAccumulator: Map<TeamId, number>;
}

function assertNever(value: never): never {
  throw new RangeError(`Unsupported ranking kind: ${String(value)}`);
}
