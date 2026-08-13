import type {
  ActorId,
  AuthorizationPort,
  CompetitionId,
  OrganizationId,
} from "@futrob/shared-kernel";
import type { TeamCompetitionStats } from "../../domain/entities/team-competition-stats.ts";
import { StatisticsAuthorizationForbidden } from "../../domain/errors/statistics.errors.ts";
import type { TeamCompetitionStatsRepository } from "../../domain/ports/team-competition-stats.repository.ts";
import { STATISTICS_PERMISSION } from "../../domain/policies/statistics-permissions.ts";

export interface GetCompetitionTeamStatisticsInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
}

export interface GetCompetitionTeamStatisticsDependencies {
  readonly teamCompetitionStats: TeamCompetitionStatsRepository;
  readonly authorization: AuthorizationPort;
}

export class GetCompetitionTeamStatisticsUseCase {
  constructor(private readonly deps: GetCompetitionTeamStatisticsDependencies) {}

  async execute(input: GetCompetitionTeamStatisticsInput): Promise<TeamCompetitionStats[]> {
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
    return this.deps.teamCompetitionStats.listByCompetition(input.competitionId);
  }
}
