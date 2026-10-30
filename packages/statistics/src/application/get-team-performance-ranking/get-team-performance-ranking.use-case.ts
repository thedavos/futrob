import type { ActorId, AuthorizationPort } from "@futrob/shared-kernel";
import type {
  TeamPerformanceRankingSnapshot,
  TeamPerformanceScope,
} from "../../domain/entities/team-performance-ranking-snapshot.ts";
import { StatisticsAuthorizationForbidden } from "../../domain/errors/statistics.errors.ts";
import { PerformanceRankingNotInPlan } from "../../domain/errors/team-performance.errors.ts";
import type { PerformanceRankingAccessPort } from "../../domain/ports/performance-ranking-access.port.ts";
import type { TeamPerformanceRankingRepository } from "../../domain/ports/team-performance-ranking.repository.ts";
import { STATISTICS_PERMISSION } from "../../domain/policies/statistics-permissions.ts";

export class GetTeamPerformanceRankingUseCase {
  constructor(
    private readonly deps: {
      readonly rankings: TeamPerformanceRankingRepository;
      readonly authorization: AuthorizationPort;
      readonly planAccess: PerformanceRankingAccessPort;
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
    if (!(await this.deps.planAccess.includesPerformanceRanking(input.organizationId)))
      throw new PerformanceRankingNotInPlan({
        code: "statistics.performance_ranking_not_in_plan",
        message: "The organization's plan does not include the performance ranking",
      });
    return this.deps.rankings.find(input);
  }
}
