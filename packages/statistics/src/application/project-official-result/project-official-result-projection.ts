import type {
  EncounterReaderPort,
  EncounterScheduleSnapshot,
  OfficialResult,
} from "@futrob/results";
import { assertNever, type TeamId } from "@futrob/shared-kernel";
import type { PlayerMatchContribution } from "../../domain/entities/player-match-contribution.ts";
import type {
  StandingResolutionMode,
  TeamMatchContribution,
  TeamMatchSide,
} from "../../domain/entities/team-match-contribution.ts";
import type { CompetitionMatchRulesReaderPort } from "../../domain/ports/competition-match-rules-reader.port.ts";
import type { PlayerIdentityResolverPort } from "../../domain/ports/player-identity-resolver.port.ts";
import { DEFAULT_COMPETITION_MATCH_POINTS } from "../../domain/policies/build-competition-standings.ts";

export interface OfficialResultProjectionDependencies {
  readonly encounterReader?: EncounterReaderPort;
  readonly identities: PlayerIdentityResolverPort;
  readonly matchRules: CompetitionMatchRulesReaderPort;
}

export interface OfficialResultContributions {
  readonly players: PlayerMatchContribution[];
  readonly teams: TeamMatchContribution[];
}

/**
 * Contributions implied by one official result. Writes nothing, so callers decide
 * whether to refresh aggregates per result or once per competition.
 */
export async function projectOfficialResultContributions(
  deps: OfficialResultProjectionDependencies,
  officialResult: OfficialResult,
  frozenResolutionMode: StandingResolutionMode | undefined,
): Promise<OfficialResultContributions> {
  switch (officialResult.status) {
    case "approved": {
      const encounter = (await deps.encounterReader?.getById(officialResult.encounterId)) ?? null;
      const resolutionMode =
        frozenResolutionMode ??
        (
          (await deps.matchRules.getPointsRules({
            competitionId: officialResult.competitionId,
            stageId: encounter?.stageId,
          })) ?? DEFAULT_COMPETITION_MATCH_POINTS
        ).resolutionMode;
      return {
        players: await buildPlayerContributions(deps.identities, officialResult, encounter),
        teams: buildTeamContributions(officialResult, encounter, resolutionMode),
      };
    }
    case "voided":
      return { players: [], teams: [] };
    default:
      return assertNever(officialResult.status, "Unsupported official result status");
  }
}

export function mapExternalClubToTeam(input: {
  readonly externalClubId: string;
  readonly homeExternalClubId: string;
  readonly awayExternalClubId: string;
  readonly homeTeamId: TeamId | null;
  readonly awayTeamId: TeamId | null;
}): TeamId | null {
  if (input.externalClubId === input.homeExternalClubId) return input.homeTeamId;
  if (input.externalClubId === input.awayExternalClubId) return input.awayTeamId;
  return null;
}

export function playerContributionId(input: {
  readonly officialResultId: string;
  readonly revision: number;
  readonly officialSlot: 1 | 2;
  readonly externalPlayerId: string;
}): string {
  return [
    input.officialResultId,
    input.revision,
    input.officialSlot,
    encodeURIComponent(input.externalPlayerId),
  ].join(":");
}

export function teamContributionId(input: {
  readonly officialResultId: string;
  readonly revision: number;
  readonly officialSlot: 1 | 2;
  readonly side: TeamMatchSide;
  readonly resolutionMode: TeamMatchContribution["resolutionMode"];
}): string {
  return [
    input.officialResultId,
    input.revision,
    input.officialSlot,
    input.side,
    input.resolutionMode,
  ].join(":");
}

export function rollUpSlotPlayers(
  players: OfficialResult["slots"][number]["players"],
): Pick<
  TeamMatchContribution,
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
  | "isMvp"
  | "rating"
> {
  if (players.length === 0) {
    return {
      minutesPlayed: null,
      goals: null,
      assists: null,
      shots: null,
      passAttempts: null,
      passesMade: null,
      tackleAttempts: null,
      tacklesMade: null,
      saves: null,
      yellowCards: null,
      redCards: null,
      isMvp: null,
      rating: null,
    };
  }

  return {
    // Team time on pitch is the match duration: the longest any player was on,
    // not the sum of player minutes (which would inflate team per-90 rates).
    minutesPlayed: maxNullable(players.map((player) => player.minutesPlayed)),
    // Strict sums: if any player row lacks a metric, the team total for that
    // metric stays unknown so aggregation marks it partial instead of treating
    // missing data as zero.
    goals: strictSumNullable(players.map((player) => player.goals)),
    assists: strictSumNullable(players.map((player) => player.assists)),
    shots: strictSumNullable(players.map((player) => player.shots)),
    passAttempts: strictSumNullable(players.map((player) => player.passAttempts)),
    passesMade: strictSumNullable(players.map((player) => player.passesMade)),
    tackleAttempts: strictSumNullable(players.map((player) => player.tackleAttempts)),
    tacklesMade: strictSumNullable(players.map((player) => player.tacklesMade)),
    saves: strictSumNullable(players.map((player) => player.saves)),
    yellowCards: strictSumNullable(players.map((player) => player.yellowCards)),
    redCards: strictSumNullable(players.map((player) => player.redCards)),
    isMvp: players.some((player) => player.isMvp === true)
      ? true
      : players.every((player) => player.isMvp === false)
        ? false
        : null,
    // Same invariant as the sums: a partially-rated lineup leaves the team
    // rating unknown instead of averaging over whoever happened to report.
    rating: players.some((player) => player.rating === null)
      ? null
      : averageNullable(players.map((player) => player.rating)),
  };
}

function maxNullable(values: readonly (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null);
  return present.length === 0 ? null : Math.max(...present);
}

function strictSumNullable(values: readonly (number | null)[]): number | null {
  if (values.some((value) => value === null)) return null;
  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

function averageNullable(values: readonly (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) return null;
  return present.reduce((sum, value) => sum + value, 0) / present.length;
}

async function buildPlayerContributions(
  identities: PlayerIdentityResolverPort,
  officialResult: OfficialResult,
  encounter: EncounterScheduleSnapshot | null,
): Promise<PlayerMatchContribution[]> {
  const contributions: PlayerMatchContribution[] = [];
  for (const slot of officialResult.slots) {
    // Identity lookups are independent per player; resolve them concurrently.
    const resolutions = await Promise.all(
      slot.players.map((player) =>
        identities.resolve({
          externalPlayerId: player.externalPlayerId,
          platform: slot.platform,
          gameEdition: slot.gameEdition,
          organizationId: officialResult.organizationId,
          competitionId: officialResult.competitionId,
          teamId:
            mapExternalClubToTeam({
              externalClubId: player.externalClubId,
              homeExternalClubId: slot.homeExternalClubId,
              awayExternalClubId: slot.awayExternalClubId,
              homeTeamId: encounter?.homeTeamId ?? null,
              awayTeamId: encounter?.awayTeamId ?? null,
            }) ?? undefined,
        }),
      ),
    );
    for (const [index, player] of slot.players.entries()) {
      const teamId = mapExternalClubToTeam({
        externalClubId: player.externalClubId,
        homeExternalClubId: slot.homeExternalClubId,
        awayExternalClubId: slot.awayExternalClubId,
        homeTeamId: encounter?.homeTeamId ?? null,
        awayTeamId: encounter?.awayTeamId ?? null,
      });
      const resolution = resolutions[index]!;
      contributions.push({
        id: playerContributionId({
          officialResultId: officialResult.id,
          revision: officialResult.revision,
          officialSlot: slot.officialSlot,
          externalPlayerId: player.externalPlayerId,
        }),
        officialResultId: officialResult.id,
        revision: officialResult.revision,
        encounterId: officialResult.encounterId,
        competitionId: officialResult.competitionId,
        organizationId: officialResult.organizationId,
        officialSlot: slot.officialSlot,
        playerProfileId: resolution.status === "matched" ? resolution.playerProfileId : null,
        gameAccountId: resolution.status === "matched" ? resolution.gameAccountId : null,
        teamId,
        correlationStatus: resolution.status,
        externalPlayerId: player.externalPlayerId,
        displayName: player.displayName,
        externalClubId: player.externalClubId,
        platform: slot.platform,
        gameEdition: slot.gameEdition,
        position: player.position,
        minutesPlayed: player.minutesPlayed,
        goals: player.goals,
        assists: player.assists,
        shots: player.shots,
        passAttempts: player.passAttempts,
        passesMade: player.passesMade,
        tackleAttempts: player.tackleAttempts,
        tacklesMade: player.tacklesMade,
        saves: player.saves,
        yellowCards: player.yellowCards,
        redCards: player.redCards,
        isMvp: player.isMvp,
        rating: player.rating,
      });
    }
  }
  return contributions;
}

function buildTeamContributions(
  officialResult: OfficialResult,
  encounter: EncounterScheduleSnapshot | null,
  resolutionMode: StandingResolutionMode,
): TeamMatchContribution[] {
  const contributions: TeamMatchContribution[] = [];
  for (const slot of officialResult.slots) {
    for (const side of ["home", "away"] as const) {
      const externalClubId = side === "home" ? slot.homeExternalClubId : slot.awayExternalClubId;
      const goalsFor = side === "home" ? slot.homeGoals : slot.awayGoals;
      const goalsAgainst = side === "home" ? slot.awayGoals : slot.homeGoals;
      // Slot home/away clubs map to encounter team IDs (same as player contributions).
      // Do not use live ExternalClubConnection IDs — re-links must not blank standings.
      const teamId = mapExternalClubToTeam({
        externalClubId,
        homeExternalClubId: slot.homeExternalClubId,
        awayExternalClubId: slot.awayExternalClubId,
        homeTeamId: encounter?.homeTeamId ?? null,
        awayTeamId: encounter?.awayTeamId ?? null,
      });
      const correlationStatus = teamId === null ? "unmatched" : "matched";
      const rolled = rollUpSlotPlayers(
        slot.players.filter((player) => player.externalClubId === externalClubId),
      );
      contributions.push({
        id: teamContributionId({
          officialResultId: officialResult.id,
          revision: officialResult.revision,
          officialSlot: slot.officialSlot,
          side,
          resolutionMode,
        }),
        officialResultId: officialResult.id,
        revision: officialResult.revision,
        encounterId: officialResult.encounterId,
        competitionId: officialResult.competitionId,
        organizationId: officialResult.organizationId,
        officialSlot: slot.officialSlot,
        resolutionMode,
        teamId,
        correlationStatus,
        side,
        externalClubId,
        goalsFor,
        goalsAgainst,
        platform: slot.platform,
        gameEdition: slot.gameEdition,
        ...rolled,
      });
    }
  }
  return contributions;
}
