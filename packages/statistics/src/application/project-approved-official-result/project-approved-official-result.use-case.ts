import type { OfficialResult, OfficialResultReaderPort } from "@futrob/results";
import { err, ok, type ClockPort, type Result } from "@futrob/shared-kernel";
import type { PlayerCompetitionStatsRepository } from "../../domain/ports/player-competition-stats.repository.ts";
import type { PlayerIdentityResolverPort } from "../../domain/ports/player-identity-resolver.port.ts";
import type { PlayerMatchContributionRepository } from "../../domain/ports/player-match-contribution.repository.ts";
import type { PlayerPersonalStatsRepository } from "../../domain/ports/player-personal-stats.repository.ts";
import type { PlayerMatchContribution } from "../../domain/entities/player-match-contribution.ts";
import { aggregatePlayerContributions } from "../../domain/policies/aggregate-player-contributions.ts";
import {
  OfficialResultNotApproved,
  OfficialResultNotFound,
  type ProjectApprovedOfficialResultError,
} from "../../domain/errors/project-official-result.errors.ts";

export type ProjectApprovedOfficialResultInput =
  | { readonly officialResultId: string }
  | { readonly encounterId: OfficialResult["encounterId"] };

export interface ProjectApprovedOfficialResultOutput {
  readonly officialResultId: string;
  readonly revision: number;
  readonly contributionsProjected: number;
  readonly matchedPlayerProfiles: number;
}

export interface ProjectApprovedOfficialResultDependencies {
  readonly officialResults: OfficialResultReaderPort;
  readonly identities: PlayerIdentityResolverPort;
  readonly contributions: PlayerMatchContributionRepository;
  readonly competitionStats: PlayerCompetitionStatsRepository;
  readonly personalStats: PlayerPersonalStatsRepository;
  readonly clock: ClockPort;
}

export class ProjectApprovedOfficialResultUseCase {
  constructor(private readonly deps: ProjectApprovedOfficialResultDependencies) {}

  async execute(
    input: ProjectApprovedOfficialResultInput,
  ): Promise<Result<ProjectApprovedOfficialResultOutput, ProjectApprovedOfficialResultError>> {
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
    if (officialResult.status !== "approved") {
      return err(
        new OfficialResultNotApproved({
          code: "statistics.official_result_not_approved",
          message: "Only approved official results can update statistics.",
          officialResultId: officialResult.id,
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

    const next = await this.buildContributions(officialResult);
    const affectedPlayerProfiles = new Set<string>();
    addMatchedProfiles(affectedPlayerProfiles, previous);
    addMatchedProfiles(affectedPlayerProfiles, next);

    await this.deps.contributions.deleteByEncounterRevision({
      encounterId: officialResult.encounterId,
      revision: "all",
    });
    await this.deps.contributions.saveMany(next);

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

    return ok({
      officialResultId: officialResult.id,
      revision: officialResult.revision,
      contributionsProjected: next.length,
      matchedPlayerProfiles: affectedPlayerProfiles.size,
    });
  }

  private async buildContributions(
    officialResult: OfficialResult,
  ): Promise<PlayerMatchContribution[]> {
    const contributions: PlayerMatchContribution[] = [];
    for (const slot of officialResult.slots) {
      for (const player of slot.players) {
        const resolution = await this.deps.identities.resolve({
          externalPlayerId: player.externalPlayerId,
          platform: slot.platform,
          gameEdition: slot.gameEdition,
          competitionId: officialResult.competitionId,
          teamContext: {
            externalClubId: player.externalClubId,
            officialSlot: slot.officialSlot,
          },
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
