import type {
  ActorId,
  AuthorizationPort,
  CompetitionId,
  OrganizationId,
} from "@futrob/shared-kernel";
import type { CompetitionStandingSnapshot } from "../../domain/entities/competition-standing-snapshot.ts";
import { StatisticsAuthorizationForbidden } from "../../domain/errors/statistics.errors.ts";
import type { CompetitionPlayoffSpotsReaderPort } from "../../domain/ports/competition-playoff-spots-reader.port.ts";
import type { CompetitionStandingSnapshotRepository } from "../../domain/ports/competition-standing-snapshot.repository.ts";
import { STATISTICS_PERMISSION } from "../../domain/policies/statistics-permissions.ts";

export interface GetCompetitionStandingsInput {
  readonly actorId: ActorId;
  readonly organizationId: OrganizationId;
  readonly competitionId: CompetitionId;
}

export interface CompetitionStandings extends CompetitionStandingSnapshot {
  readonly playoffSpots: number | null;
}

export interface GetCompetitionStandingsDependencies {
  readonly standings: CompetitionStandingSnapshotRepository;
  readonly playoffSpots: CompetitionPlayoffSpotsReaderPort;
  readonly authorization: AuthorizationPort;
}

export class GetCompetitionStandingsUseCase {
  constructor(private readonly deps: GetCompetitionStandingsDependencies) {}

  async execute(input: GetCompetitionStandingsInput): Promise<CompetitionStandings | null> {
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
    const snapshot = await this.deps.standings.findByCompetition(input.competitionId);
    if (!snapshot) return null;
    return {
      ...snapshot,
      playoffSpots: await this.deps.playoffSpots.find(input.organizationId, input.competitionId),
    };
  }
}
