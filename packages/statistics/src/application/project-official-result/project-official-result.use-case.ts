import type {
  EncounterReaderPort,
  OfficialResult,
  OfficialResultReaderPort,
} from "@futrob/results";
import {
  assertNever,
  err,
  ok,
  type ClockPort,
  type Result,
  type TeamId,
  type TransactionPort,
} from "@futrob/shared-kernel";
import type { PlayerMatchContribution } from "../../domain/entities/player-match-contribution.ts";
import type { TeamMatchContribution } from "../../domain/entities/team-match-contribution.ts";
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
import {
  addMatchedProfiles,
  addMatchedTeams,
  buildPlayerContributions as projectPlayerContributions,
  buildTeamContributions as projectTeamContributions,
  type PlayerProjectionDependencies,
} from "./project-official-result-projection.ts";

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
        : await this.deps.officialResults.getLatestByEncounter(input.encounterId);

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
        return projectPlayerContributions(this.projectionDeps(), officialResult);
      case "voided":
        return [];
      default:
        return assertNever(officialResult.status, "Unsupported official result status");
    }
  }

  private async teamContributionsForStatus(
    officialResult: OfficialResult,
  ): Promise<TeamMatchContribution[]> {
    switch (officialResult.status) {
      case "approved":
        return projectTeamContributions(
          { encounterReader: this.deps.encounterReader },
          officialResult,
        );
      case "voided":
        return [];
      default:
        return assertNever(officialResult.status, "Unsupported official result status");
    }
  }

  private projectionDeps(): PlayerProjectionDependencies {
    return {
      encounterReader: this.deps.encounterReader,
      identities: this.deps.identities,
    };
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
}
