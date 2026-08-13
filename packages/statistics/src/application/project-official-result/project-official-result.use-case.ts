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
import {
  OfficialResultNotFound,
  type ProjectOfficialResultError,
} from "../../domain/errors/project-official-result.errors.ts";
import type { PlayerCompetitionStatsRepository } from "../../domain/ports/player-competition-stats.repository.ts";
import type { PlayerIdentityResolverPort } from "../../domain/ports/player-identity-resolver.port.ts";
import type { PlayerMatchContributionRepository } from "../../domain/ports/player-match-contribution.repository.ts";
import type { PlayerPersonalStatsRepository } from "../../domain/ports/player-personal-stats.repository.ts";
import { aggregatePlayerContributions } from "../../domain/policies/aggregate-player-contributions.ts";

export type ProjectOfficialResultInput =
  | { readonly officialResultId: string }
  | { readonly encounterId: OfficialResult["encounterId"] };

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

    const previous = await this.deps.contributions.listByEncounter(officialResult.encounterId);
    const projectedRevision = previous.reduce(
      (maximum, contribution) => Math.max(maximum, contribution.revision),
      0,
    );
    if (projectedRevision > officialResult.revision) {
      return ok({
        officialResultId: officialResult.id,
        revision: officialResult.revision,
        contributionsProjected: 0,
        matchedPlayerProfiles: 0,
      });
    }

    const next = await this.contributionsForStatus(officialResult);
    const affectedPlayerProfiles = new Set<string>();
    addMatchedProfiles(affectedPlayerProfiles, previous);
    addMatchedProfiles(affectedPlayerProfiles, next);

    await this.deps.transaction.runInTransaction(async () => {
      await this.deps.contributions.deleteByEncounterRevision({
        encounterId: officialResult.encounterId,
        revision: "all",
      });
      await this.deps.contributions.saveMany(next);
      await this.rebuildAggregates(officialResult, affectedPlayerProfiles);
    });

    return ok({
      officialResultId: officialResult.id,
      revision: officialResult.revision,
      contributionsProjected: next.length,
      matchedPlayerProfiles: affectedPlayerProfiles.size,
    });
  }

  private async contributionsForStatus(
    officialResult: OfficialResult,
  ): Promise<PlayerMatchContribution[]> {
    switch (officialResult.status) {
      case "approved":
        return this.buildContributions(officialResult);
      case "voided":
        return [];
      default:
        return assertNever(officialResult.status);
    }
  }

  private async rebuildAggregates(
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

  private async buildContributions(
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
          id: contributionId({
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

function contributionId(input: {
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
