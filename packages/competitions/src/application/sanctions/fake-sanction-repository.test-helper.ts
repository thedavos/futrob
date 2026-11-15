import type { CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";
import type {
  CompetitionSanction,
  SanctionRevocation,
} from "../../domain/entities/competition-sanction.ts";
import type { CompetitionSanctionRepository } from "../../domain/ports/competition-sanction.repository.ts";

export class FakeSanctionRepository implements CompetitionSanctionRepository {
  readonly rows: CompetitionSanction[] = [];

  async create(sanction: CompetitionSanction): Promise<CompetitionSanction> {
    this.rows.push(sanction);
    return sanction;
  }

  async findById(organizationId: OrganizationId, competitionId: CompetitionId, id: string) {
    return (
      this.rows.find(
        (row) =>
          row.id === id &&
          row.organizationId === organizationId &&
          row.competitionId === competitionId,
      ) ?? null
    );
  }

  async listByCompetition(organizationId: OrganizationId, competitionId: CompetitionId) {
    return this.rows
      .filter((row) => row.organizationId === organizationId && row.competitionId === competitionId)
      .reverse();
  }

  async listByTeam(organizationId: OrganizationId, competitionId: CompetitionId, teamId: TeamId) {
    return (await this.listByCompetition(organizationId, competitionId)).filter(
      (row) => row.teamId === teamId,
    );
  }

  async revoke(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    id: string,
    revocation: SanctionRevocation,
  ) {
    const index = this.rows.findIndex(
      (row) =>
        row.id === id &&
        row.organizationId === organizationId &&
        row.competitionId === competitionId &&
        row.revocation === null,
    );
    if (index < 0) return null;
    const revoked = { ...this.rows[index]!, revocation };
    this.rows[index] = revoked;
    return revoked;
  }
}
