import type {
  ActorId,
  AuthorizationPort,
  CompetitionId,
  OrganizationId,
} from "@futrob/shared-kernel";
import type { RankingKind, RankingSnapshot } from "../../domain/entities/ranking-snapshot.ts";
import { StatisticsAuthorizationForbidden } from "../../domain/errors/statistics.errors.ts";
import type { RankingSnapshotRepository } from "../../domain/ports/ranking-snapshot.repository.ts";
import { STATISTICS_PERMISSION } from "../../domain/policies/statistics-permissions.ts";

export interface GetCompetitionRankingsInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
  readonly kind?: RankingKind;
}

export interface GetCompetitionRankingsDependencies {
  readonly rankings: RankingSnapshotRepository;
  readonly authorization: AuthorizationPort;
}

export class GetCompetitionRankingsUseCase {
  constructor(private readonly deps: GetCompetitionRankingsDependencies) {}

  async execute(input: GetCompetitionRankingsInput): Promise<RankingSnapshot[]> {
    const decision = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: STATISTICS_PERMISSION.read,
      scope: {
        organizationId: input.organizationId,
        competitionId: input.competitionId,
      },
    });
    if (!decision.allowed) {
      throw new StatisticsAuthorizationForbidden({
        code: "statistics.read_forbidden",
        message: "The actor cannot read competition statistics",
      });
    }

    if (input.kind !== undefined) {
      const snapshot = await this.deps.rankings.findByCompetitionAndKind(
        input.competitionId,
        input.kind,
      );
      return snapshot === null ? [] : [snapshot];
    }

    return this.deps.rankings.listByCompetition(input.competitionId);
  }
}
