import type {
  EncounterReaderPort,
  OfficialResult,
  OfficialResultReaderPort,
} from "@futrob/results";
import {
  err,
  ok,
  type ClockPort,
  type Result,
  type TeamId,
  type TransactionPort,
} from "@futrob/shared-kernel";
import type { PlayerMatchContribution } from "../../domain/entities/player-match-contribution.ts";
import type {
  TeamMatchContribution,
  TeamMatchSide,
} from "../../domain/entities/team-match-contribution.ts";
import {
  OfficialResultNotFound,
  type ProjectOfficialResultError,
} from "../../domain/errors/project-official-result.errors.ts";
import type { CompetitionMatchRulesReaderPort } from "../../domain/ports/competition-match-rules-reader.port.ts";
import type { CompetitionStandingSnapshotRepository } from "../../domain/ports/competition-standing-snapshot.repository.ts";
import type { PlayerCompetitionStatsRepository } from "../../domain/ports/player-competition-stats.repository.ts";
import type { PlayerIdentityResolverPort } from "../../domain/ports/player-identity-resolver.port.ts";
import type { PlayerMatchContributionRepository } from "../../domain/ports/player-match-contribution.repository.ts";
import type { PlayerPersonalStatsRepository } from "../../domain/ports/player-personal-stats.repository.ts";
import type { TeamCompetitionStatsRepository } from "../../domain/ports/team-competition-stats.repository.ts";
import type { TeamMatchContributionRepository } from "../../domain/ports/team-match-contribution.repository.ts";
import { aggregatePlayerContributions } from "../../domain/policies/aggregate-player-contributions.ts";
import { aggregateTeamContributions } from "../../domain/policies/aggregate-team-contributions.ts";
import {
  buildCompetitionStandings,
  DEFAULT_COMPETITION_MATCH_POINTS,
} from "../../domain/policies/build-competition-standings.ts";
import type { RebuildCompetitionRankingsUseCase } from "../rebuild-competition-rankings/rebuild-competition-rankings.use-case.ts";

export type ProjectOfficialResultInput =
  | { readonly officialResultId: string; readonly rebuildRankings?: boolean }
  | { readonly encounterId: OfficialResult["encounterId"]; readonly rebuildRankings?: boolean };

export interface ProjectOfficialResultOutput {
  readonly officialResultId: string;
  readonly revision: number;
  readonly contributionsProjected: number;
  readonly matchedPlayerProfiles: number;
}

export interface ProjectOfficialResultDependencies {
  readonly officialResults: OfficialResultReaderPort;
  readonly encounterReader?: EncounterReaderPort;
  readonly identities: PlayerIdentityResolverPort;
  readonly contributions: PlayerMatchContributionRepository;
  readonly competitionStats: PlayerCompetitionStatsRepository;
  readonly personalStats: PlayerPersonalStatsRepository;
  readonly teamContributions: TeamMatchContributionRepository;
  readonly teamCompetitionStats: TeamCompetitionStatsRepository;
  readonly standings: CompetitionStandingSnapshotRepository;
  readonly matchRules: CompetitionMatchRulesReaderPort;
  readonly rebuildRankings?: Pick<RebuildCompetitionRankingsUseCase, "execute">;
  readonly transaction: TransactionPort;
  readonly clock: ClockPort;
}

export class ProjectOfficialResultUseCase {
  constructor(private readonly deps: ProjectOfficialResultDependencies) {}

  async execute(
    input: ProjectOfficialResultInput,
  ): Promise<Result<ProjectOfficialResultOutput, ProjectOfficialResultError>> {
    const officialResult =
      "officialResultId" in input
        ? await this.deps.officialResults.getById(input.officialResultId)
        : await this.deps.officialResults.getApprovedByEncounter(input.encounterId);

    if (!officialResult) {
      return err(
        new OfficialResultNotFound({
          code: "statistics.official_result_not_found",
          message: "Official result was not found.",
        }),
      );
    }

    const previousPlayers = await this.deps.contributions.listByEncounter(
      officialResult.encounterId,
    );
    const previousTeams = await this.deps.teamContributions.listByEncounter(
      officialResult.encounterId,
    );
    const projectedRevision = Math.max(
      previousPlayers.reduce(
        (maximum, contribution) => Math.max(maximum, contribution.revision),
        0,
      ),
      previousTeams.reduce((maximum, contribution) => Math.max(maximum, contribution.revision), 0),
    );
    if (projectedRevision > officialResult.revision) {
      return ok({
        officialResultId: officialResult.id,
        revision: officialResult.revision,
        contributionsProjected: 0,
        matchedPlayerProfiles: 0,
      });
    }

    const nextPlayers = await this.playerContributionsForStatus(officialResult);
    const nextTeams = await this.teamContributionsForStatus(officialResult);
    const affectedPlayerProfiles = new Set<string>();
    addMatchedProfiles(affectedPlayerProfiles, previousPlayers);
    addMatchedProfiles(affectedPlayerProfiles, nextPlayers);
    const affectedTeams = new Set<TeamId>();
    addMatchedTeams(affectedTeams, previousTeams);
    addMatchedTeams(affectedTeams, nextTeams);

    await this.deps.transaction.runInTransaction(async () => {
      await this.deps.contributions.deleteByEncounterRevision({
        encounterId: officialResult.encounterId,
        revision: "all",
      });
      await this.deps.teamContributions.deleteByEncounterRevision({
        encounterId: officialResult.encounterId,
        revision: "all",
      });
      await this.deps.contributions.saveMany(nextPlayers);
      await this.deps.teamContributions.saveMany(nextTeams);
      await this.rebuildPlayerAggregates(officialResult, affectedPlayerProfiles);
      await this.rebuildTeamAggregates(officialResult, affectedTeams);
      await this.rebuildStandings(officialResult);
    });

    if (input.rebuildRankings !== false && this.deps.rebuildRankings) {
      await this.deps.rebuildRankings.execute({
        competitionId: officialResult.competitionId,
      });
    }

    return ok({
      officialResultId: officialResult.id,
      revision: officialResult.revision,
      contributionsProjected: nextPlayers.length,
      matchedPlayerProfiles: affectedPlayerProfiles.size,
    });
  }

  private async playerContributionsForStatus(
    officialResult: OfficialResult,
  ): Promise<PlayerMatchContribution[]> {
    switch (officialResult.status) {
      case "approved":
        return this.buildPlayerContributions(officialResult);
      case "voided":
        return [];
      default:
        return assertNever(officialResult.status);
    }
  }

  private async teamContributionsForStatus(
    officialResult: OfficialResult,
  ): Promise<TeamMatchContribution[]> {
    switch (officialResult.status) {
      case "approved":
        return this.buildTeamContributions(officialResult);
      case "voided":
        return [];
      default:
        return assertNever(officialResult.status);
    }
  }

  private async rebuildPlayerAggregates(
    officialResult: OfficialResult,
    affectedPlayerProfiles: ReadonlySet<string>,
  ): Promise<void> {
    const updatedAt = this.deps.clock.now();
    for (const playerProfileId of affectedPlayerProfiles) {
      const allPlayerContributions =
        await this.deps.contributions.listByPlayerProfile(playerProfileId);
      const competitionContributions = allPlayerContributions.filter(
        (contribution) =>
          contribution.correlationStatus === "matched" &&
          contribution.playerProfileId === playerProfileId &&
          contribution.competitionId === officialResult.competitionId,
      );
      await this.deps.competitionStats.upsert({
        playerProfileId,
        competitionId: officialResult.competitionId,
        organizationId: officialResult.organizationId,
        ...aggregatePlayerContributions(competitionContributions),
        updatedAt,
      });

      const personalContributions = allPlayerContributions.filter(
        (contribution) =>
          contribution.correlationStatus === "matched" &&
          contribution.playerProfileId === playerProfileId,
      );
      await this.deps.personalStats.upsert({
        playerProfileId,
        ...aggregatePlayerContributions(personalContributions),
        updatedAt,
      });
    }
  }

  private async rebuildTeamAggregates(
    officialResult: OfficialResult,
    affectedTeams: ReadonlySet<TeamId>,
  ): Promise<void> {
    const updatedAt = this.deps.clock.now();
    for (const teamId of affectedTeams) {
      const competitionContributions = (
        await this.deps.teamContributions.listByTeam(teamId)
      ).filter(
        (contribution) =>
          contribution.correlationStatus === "matched" &&
          contribution.teamId === teamId &&
          contribution.competitionId === officialResult.competitionId,
      );
      await this.deps.teamCompetitionStats.upsert({
        teamId,
        competitionId: officialResult.competitionId,
        organizationId: officialResult.organizationId,
        ...aggregateTeamContributions(competitionContributions),
        updatedAt,
      });
    }
  }

  private async rebuildStandings(officialResult: OfficialResult): Promise<void> {
    const contributions = await this.deps.teamContributions.listByCompetition(
      officialResult.competitionId,
    );
    const pointsRules =
      (await this.deps.matchRules.getPointsRules(officialResult.competitionId)) ??
      DEFAULT_COMPETITION_MATCH_POINTS;
    await this.deps.standings.upsert(
      buildCompetitionStandings({
        competitionId: officialResult.competitionId,
        organizationId: officialResult.organizationId,
        contributions,
        pointsRules,
        updatedAt: this.deps.clock.now(),
      }),
    );
  }

  private async buildPlayerContributions(
    officialResult: OfficialResult,
  ): Promise<PlayerMatchContribution[]> {
    const encounter =
      (await this.deps.encounterReader?.getById(officialResult.encounterId)) ?? null;
    const contributions: PlayerMatchContribution[] = [];
    for (const slot of officialResult.slots) {
      for (const player of slot.players) {
        const teamId = mapExternalClubToTeam({
          externalClubId: player.externalClubId,
          homeExternalClubId: slot.homeExternalClubId,
          awayExternalClubId: slot.awayExternalClubId,
          homeTeamId: encounter?.homeTeamId ?? null,
          awayTeamId: encounter?.awayTeamId ?? null,
        });
        const resolution = await this.deps.identities.resolve({
          externalPlayerId: player.externalPlayerId,
          platform: slot.platform,
          gameEdition: slot.gameEdition,
          organizationId: officialResult.organizationId,
          competitionId: officialResult.competitionId,
          teamId: teamId ?? undefined,
        });
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

  private async buildTeamContributions(
    officialResult: OfficialResult,
  ): Promise<TeamMatchContribution[]> {
    const encounter =
      (await this.deps.encounterReader?.getById(officialResult.encounterId)) ?? null;
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
          }),
          officialResultId: officialResult.id,
          revision: officialResult.revision,
          encounterId: officialResult.encounterId,
          competitionId: officialResult.competitionId,
          organizationId: officialResult.organizationId,
          officialSlot: slot.officialSlot,
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
}

function assertNever(status: never): never {
  throw new RangeError(`Unsupported official result status: ${String(status)}`);
}

function mapExternalClubToTeam(input: {
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

function addMatchedProfiles(
  profiles: Set<string>,
  contributions: readonly PlayerMatchContribution[],
): void {
  for (const contribution of contributions) {
    if (contribution.correlationStatus === "matched" && contribution.playerProfileId !== null) {
      profiles.add(contribution.playerProfileId);
    }
  }
}

function addMatchedTeams(
  teams: Set<TeamId>,
  contributions: readonly TeamMatchContribution[],
): void {
  for (const contribution of contributions) {
    if (contribution.correlationStatus === "matched" && contribution.teamId !== null) {
      teams.add(contribution.teamId);
    }
  }
}

function playerContributionId(input: {
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

function teamContributionId(input: {
  readonly officialResultId: string;
  readonly revision: number;
  readonly officialSlot: 1 | 2;
  readonly side: TeamMatchSide;
}): string {
  return [input.officialResultId, input.revision, input.officialSlot, input.side].join(":");
}

function rollUpSlotPlayers(
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
    minutesPlayed: sumNullable(players.map((player) => player.minutesPlayed)),
    goals: sumNullable(players.map((player) => player.goals)),
    assists: sumNullable(players.map((player) => player.assists)),
    shots: sumNullable(players.map((player) => player.shots)),
    passAttempts: sumNullable(players.map((player) => player.passAttempts)),
    passesMade: sumNullable(players.map((player) => player.passesMade)),
    tackleAttempts: sumNullable(players.map((player) => player.tackleAttempts)),
    tacklesMade: sumNullable(players.map((player) => player.tacklesMade)),
    saves: sumNullable(players.map((player) => player.saves)),
    yellowCards: sumNullable(players.map((player) => player.yellowCards)),
    redCards: sumNullable(players.map((player) => player.redCards)),
    isMvp: players.some((player) => player.isMvp === true)
      ? true
      : players.every((player) => player.isMvp === false)
        ? false
        : null,
    rating: averageNullable(players.map((player) => player.rating)),
  };
}

function sumNullable(values: readonly (number | null)[]): number | null {
  if (values.every((value) => value === null)) return null;
  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

function averageNullable(values: readonly (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null);
  if (present.length === 0) return null;
  return present.reduce((sum, value) => sum + value, 0) / present.length;
}
