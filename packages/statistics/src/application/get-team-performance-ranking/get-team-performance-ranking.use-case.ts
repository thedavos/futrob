import type { ActorId, AuthorizationPort } from "@futrob/shared-kernel";
import type {
  TeamPerformanceRankingSnapshot,
  TeamPerformanceScope,
} from "../../domain/entities/team-performance-ranking-snapshot.ts";
import { StatisticsAuthorizationForbidden } from "../../domain/errors/statistics.errors.ts";
import type { TeamPerformanceRankingRepository } from "../../domain/ports/team-performance-ranking.repository.ts";
import { STATISTICS_PERMISSION } from "../../domain/policies/statistics-permissions.ts";

export class GetTeamPerformanceRankingUseCase {
  constructor(
    private readonly deps: {
      readonly rankings: TeamPerformanceRankingRepository;
      readonly authorization: AuthorizationPort;
    },
  ) {}

  async execute(
    input: TeamPerformanceScope & { readonly actorId: ActorId },
  ): Promise<TeamPerformanceRankingSnapshot | null> {
    const decision = await this.deps.authorization.decide({
      actorId: input.actorId,
      permission: STATISTICS_PERMISSION.read,
      scope: { organizationId: input.organizationId, competitionId: input.competitionId },
    });
    if (!decision.allowed)
      throw new StatisticsAuthorizationForbidden({
        code: "statistics.read_forbidden",
        message: "The actor cannot read competition statistics",
      });
    return this.deps.rankings.find(input);
  }
}
