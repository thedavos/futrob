import type { OfficialResult, OfficialResultReaderPort } from "@futrob/results";
import {
  err,
  ok,
  type ClockPort,
  type CompetitionId,
  type EventPublisherPort,
  type Result,
  type TeamId,
  type TransactionPort,
} from "@futrob/shared-kernel";
import type { PlayerMatchContribution } from "../../domain/entities/player-match-contribution.ts";
import type { TeamMatchContribution } from "../../domain/entities/team-match-contribution.ts";
import type { ProjectOfficialResultError } from "../../domain/errors/project-official-result.errors.ts";
import type { CompetitionMatchRulesReaderPort } from "../../domain/ports/competition-match-rules-reader.port.ts";
import type { CompetitionStandingSnapshotRepository } from "../../domain/ports/competition-standing-snapshot.repository.ts";
import type { PlayerCompetitionStatsRepository } from "../../domain/ports/player-competition-stats.repository.ts";
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
import type { ProjectOfficialResultUseCase } from "../project-official-result/project-official-result.use-case.ts";
import type { RebuildCompetitionRankingsUseCase } from "../rebuild-competition-rankings/rebuild-competition-rankings.use-case.ts";

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
  readonly teamContributions: TeamMatchContributionRepository;
  readonly teamCompetitionStats: TeamCompetitionStatsRepository;
  readonly standings: CompetitionStandingSnapshotRepository;
  readonly matchRules: CompetitionMatchRulesReaderPort;
  readonly rebuildRankings: Pick<RebuildCompetitionRankingsUseCase, "execute">;
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
    const previousPlayers = await this.deps.contributions.listByCompetition(input.competitionId);
    const previousTeams = await this.deps.teamContributions.listByCompetition(input.competitionId);
    const affectedPlayerProfiles = matchedPlayerProfiles(previousPlayers);
    const affectedTeams = matchedTeams(previousTeams);

    const rebuilt = await this.deps.transaction.runInTransaction(async () => {
      await this.deps.contributions.deleteByCompetition(input.competitionId);
      await this.deps.teamContributions.deleteByCompetition(input.competitionId);
      await this.deps.teamCompetitionStats.deleteByCompetition(input.competitionId);
      await this.deps.standings.deleteByCompetition(input.competitionId);
      let officialResultsProjected = 0;
      let contributionsProjected = 0;

      for (const officialResult of latestResults) {
        switch (officialResult.status) {
          case "approved": {
            const projected = await this.deps.projectOfficialResult.execute({
              officialResultId: officialResult.id,
              rebuildRankings: false,
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

      const currentPlayers = await this.deps.contributions.listByCompetition(input.competitionId);
      const currentTeams = await this.deps.teamContributions.listByCompetition(input.competitionId);
      addMatchedPlayerProfiles(affectedPlayerProfiles, currentPlayers);
      addMatchedTeams(affectedTeams, currentTeams);
      await this.rebuildPlayerAggregates(
        input.competitionId,
        previousPlayers,
        currentPlayers,
        affectedPlayerProfiles,
      );
      await this.rebuildTeamAggregates(
        input.competitionId,
        previousTeams,
        currentTeams,
        affectedTeams,
      );
      await this.rebuildStandings(input.competitionId, previousTeams, currentTeams);

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
    await this.deps.rebuildRankings.execute({ competitionId: input.competitionId });
    return rebuilt;
  }

  private async rebuildPlayerAggregates(
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

  private async rebuildTeamAggregates(
    competitionId: CompetitionId,
    previous: readonly TeamMatchContribution[],
    current: readonly TeamMatchContribution[],
    affectedTeams: ReadonlySet<TeamId>,
  ): Promise<void> {
    const organizationId = current[0]?.organizationId ?? previous[0]?.organizationId;
    if (!organizationId) return;

    const updatedAt = this.deps.clock.now();
    for (const teamId of affectedTeams) {
      const competitionContributions = current.filter(
        (contribution) =>
          contribution.correlationStatus === "matched" && contribution.teamId === teamId,
      );
      await this.deps.teamCompetitionStats.upsert({
        teamId,
        competitionId,
        organizationId,
        ...aggregateTeamContributions(competitionContributions),
        updatedAt,
      });
    }
  }

  private async rebuildStandings(
    competitionId: CompetitionId,
    previous: readonly TeamMatchContribution[],
    current: readonly TeamMatchContribution[],
  ): Promise<void> {
    const organizationId = current[0]?.organizationId ?? previous[0]?.organizationId;
    if (!organizationId) {
      await this.deps.standings.deleteByCompetition(competitionId);
      return;
    }
    const pointsRules =
      (await this.deps.matchRules.getPointsRules(competitionId)) ??
      DEFAULT_COMPETITION_MATCH_POINTS;
    await this.deps.standings.upsert(
      buildCompetitionStandings({
        competitionId,
        organizationId,
        contributions: current,
        pointsRules,
        updatedAt: this.deps.clock.now(),
      }),
    );
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

function matchedTeams(contributions: readonly TeamMatchContribution[]): Set<TeamId> {
  const teams = new Set<TeamId>();
  addMatchedTeams(teams, contributions);
  return teams;
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

function assertNever(status: never): never {
  throw new RangeError(`Unsupported official result status: ${String(status)}`);
}
