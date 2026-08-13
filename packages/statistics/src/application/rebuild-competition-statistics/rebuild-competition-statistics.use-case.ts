import type { OfficialResult, OfficialResultReaderPort } from "@futrob/results";
import {
  err,
  ok,
  type ClockPort,
  type CompetitionId,
  type EventPublisherPort,
  type Result,
  type TransactionPort,
} from "@futrob/shared-kernel";
import type { PlayerMatchContribution } from "../../domain/entities/player-match-contribution.ts";
import type { ProjectOfficialResultError } from "../../domain/errors/project-official-result.errors.ts";
import type { PlayerCompetitionStatsRepository } from "../../domain/ports/player-competition-stats.repository.ts";
import type { PlayerMatchContributionRepository } from "../../domain/ports/player-match-contribution.repository.ts";
import type { PlayerPersonalStatsRepository } from "../../domain/ports/player-personal-stats.repository.ts";
import { aggregatePlayerContributions } from "../../domain/policies/aggregate-player-contributions.ts";
import type { ProjectOfficialResultUseCase } from "../project-official-result/project-official-result.use-case.ts";

export interface RebuildCompetitionStatisticsInput {
  readonly competitionId: CompetitionId;
}

export interface RebuildCompetitionStatisticsOutput {
  readonly competitionId: CompetitionId;
  readonly officialResultsProjected: number;
  readonly contributionsProjected: number;
}

export interface RebuildCompetitionStatisticsDependencies {
  readonly officialResults: OfficialResultReaderPort;
  readonly projectOfficialResult: Pick<ProjectOfficialResultUseCase, "execute">;
  readonly contributions: PlayerMatchContributionRepository;
  readonly competitionStats: PlayerCompetitionStatsRepository;
  readonly personalStats: PlayerPersonalStatsRepository;
  readonly eventPublisher: EventPublisherPort;
  readonly transaction: TransactionPort;
  readonly clock: ClockPort;
}

export class RebuildCompetitionStatisticsUseCase {
  constructor(private readonly deps: RebuildCompetitionStatisticsDependencies) {}

  async execute(
    input: RebuildCompetitionStatisticsInput,
  ): Promise<Result<RebuildCompetitionStatisticsOutput, ProjectOfficialResultError>> {
    const officialResults = await this.deps.officialResults.listByCompetition(input.competitionId);
    const latestResults = latestByEncounter(officialResults);
    const previous = await this.deps.contributions.listByCompetition(input.competitionId);
    const affectedPlayerProfiles = matchedPlayerProfiles(previous);

    const rebuilt = await this.deps.transaction.runInTransaction(async () => {
      await this.deps.contributions.deleteByCompetition(input.competitionId);
      let officialResultsProjected = 0;
      let contributionsProjected = 0;

      for (const officialResult of latestResults) {
        switch (officialResult.status) {
          case "approved": {
            const projected = await this.deps.projectOfficialResult.execute({
              officialResultId: officialResult.id,
            });
            if (!projected.isOk()) return err(projected.error);
            officialResultsProjected += 1;
            contributionsProjected += projected.value.contributionsProjected;
            break;
          }
          case "voided":
            break;
          default:
            assertNever(officialResult.status);
        }
      }

      const current = await this.deps.contributions.listByCompetition(input.competitionId);
      addMatchedPlayerProfiles(affectedPlayerProfiles, current);
      await this.rebuildAggregates(input.competitionId, previous, current, affectedPlayerProfiles);

      return ok({
        competitionId: input.competitionId,
        officialResultsProjected,
        contributionsProjected,
      });
    });

    if (!rebuilt.isOk()) return rebuilt;
    await this.deps.eventPublisher.publish({
      eventName: "statistics.competition-stats-rebuilt",
      occurredAt: this.deps.clock.now().toISOString(),
      payload: rebuilt.value,
    });
    return rebuilt;
  }

  private async rebuildAggregates(
    competitionId: CompetitionId,
    previous: readonly PlayerMatchContribution[],
    current: readonly PlayerMatchContribution[],
    affectedPlayerProfiles: ReadonlySet<string>,
  ): Promise<void> {
    const organizationId = current[0]?.organizationId ?? previous[0]?.organizationId;
    if (!organizationId) return;

    const updatedAt = this.deps.clock.now();
    for (const playerProfileId of affectedPlayerProfiles) {
      const competitionContributions = current.filter(
        (contribution) =>
          contribution.correlationStatus === "matched" &&
          contribution.playerProfileId === playerProfileId,
      );
      await this.deps.competitionStats.upsert({
        playerProfileId,
        competitionId,
        organizationId,
        ...aggregatePlayerContributions(competitionContributions),
        updatedAt,
      });

      const personalContributions = (
        await this.deps.contributions.listByPlayerProfile(playerProfileId)
      ).filter(
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
}

function latestByEncounter(results: readonly OfficialResult[]): OfficialResult[] {
  const latest = new Map<string, OfficialResult>();
  for (const result of [...results].sort(
    (left, right) =>
      left.encounterId.localeCompare(right.encounterId) || left.revision - right.revision,
  )) {
    latest.set(result.encounterId, result);
  }
  return [...latest.values()];
}

function matchedPlayerProfiles(contributions: readonly PlayerMatchContribution[]): Set<string> {
  const profiles = new Set<string>();
  addMatchedPlayerProfiles(profiles, contributions);
  return profiles;
}

function addMatchedPlayerProfiles(
  profiles: Set<string>,
  contributions: readonly PlayerMatchContribution[],
): void {
  for (const contribution of contributions) {
    if (contribution.correlationStatus === "matched" && contribution.playerProfileId !== null) {
      profiles.add(contribution.playerProfileId);
    }
  }
}

function assertNever(status: never): never {
  throw new RangeError(`Unsupported official result status: ${String(status)}`);
}
