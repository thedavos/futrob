import type {
  ActorId,
  AuthorizationPort,
  CompetitionId,
  OrganizationId,
} from "@futrob/shared-kernel";
import type { CompetitionStandingSnapshot } from "../../domain/entities/competition-standing-snapshot.ts";
import { StatisticsAuthorizationForbidden } from "../../domain/errors/statistics.errors.ts";
import type { CompetitionStandingSnapshotRepository } from "../../domain/ports/competition-standing-snapshot.repository.ts";
import { STATISTICS_PERMISSION } from "../../domain/policies/statistics-permissions.ts";

export interface GetCompetitionStandingsInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
}

export interface GetCompetitionStandingsDependencies {
  readonly standings: CompetitionStandingSnapshotRepository;
  readonly authorization: AuthorizationPort;
}

export class GetCompetitionStandingsUseCase {
  constructor(private readonly deps: GetCompetitionStandingsDependencies) {}

  async execute(input: GetCompetitionStandingsInput): Promise<CompetitionStandingSnapshot | null> {
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
    return this.deps.standings.findByCompetition(input.competitionId);
  }
}
