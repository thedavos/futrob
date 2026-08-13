import {
  ok,
  type ClockPort,
  type CompetitionId,
  type EventPublisherPort,
  type Result,
  type TransactionPort,
} from "@futrob/shared-kernel";
import {
  RANKING_KINDS,
  type RankingEligibilityConfig,
  type RankingKind,
} from "../../domain/entities/ranking-snapshot.ts";
import { buildCompetitionRankings } from "../../domain/policies/build-competition-rankings.ts";
import type { PlayerMatchContributionRepository } from "../../domain/ports/player-match-contribution.repository.ts";
import type { RankingSnapshotRepository } from "../../domain/ports/ranking-snapshot.repository.ts";
import type { TeamMatchContributionRepository } from "../../domain/ports/team-match-contribution.repository.ts";

export interface RebuildCompetitionRankingsInput {
  readonly competitionId: CompetitionId;
  readonly eligibility?: Partial<RankingEligibilityConfig>;
}

export interface RebuildCompetitionRankingsOutput {
  readonly competitionId: CompetitionId;
  readonly kinds: readonly RankingKind[];
}

export interface RebuildCompetitionRankingsDependencies {
  readonly contributions: PlayerMatchContributionRepository;
  readonly teamContributions: TeamMatchContributionRepository;
  readonly rankings: RankingSnapshotRepository;
  readonly eventPublisher: EventPublisherPort;
  readonly transaction: TransactionPort;
  readonly clock: ClockPort;
}

export class RebuildCompetitionRankingsUseCase {
  constructor(private readonly deps: RebuildCompetitionRankingsDependencies) {}

  async execute(
    input: RebuildCompetitionRankingsInput,
  ): Promise<Result<RebuildCompetitionRankingsOutput, never>> {
    const playerContributions = await this.deps.contributions.listByCompetition(
      input.competitionId,
    );
    const teamContributions = await this.deps.teamContributions.listByCompetition(
      input.competitionId,
    );
    const organizationId =
      playerContributions[0]?.organizationId ?? teamContributions[0]?.organizationId;

    const snapshots =
      organizationId === undefined
        ? []
        : buildCompetitionRankings({
            competitionId: input.competitionId,
            organizationId,
            playerContributions,
            teamContributions,
            eligibility: input.eligibility,
            updatedAt: this.deps.clock.now(),
          });

    await this.deps.transaction.runInTransaction(async () => {
      await this.deps.rankings.replaceForCompetition(input.competitionId, snapshots);
    });

    // Always publish the closed kind set so consumers invalidate after a full clear.
    const kinds = [...RANKING_KINDS];
    await this.deps.eventPublisher.publish({
      eventName: "statistics.rankings-updated",
      occurredAt: this.deps.clock.now().toISOString(),
      payload: {
        competitionId: input.competitionId,
        kinds,
      },
    });

    return ok({
      competitionId: input.competitionId,
      kinds,
    });
  }
}
