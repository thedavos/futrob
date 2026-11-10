import type { CompetitionId, OrganizationId, TeamId } from "@futrob/shared-kernel";
import type {
  CompetitionSanction,
  SanctionRevocation,
} from "../entities/competition-sanction.ts";

/** Append-only store: rows are created and revoked, never edited or deleted. */
export interface CompetitionSanctionRepository {
  create(sanction: CompetitionSanction): Promise<CompetitionSanction>;
  findById(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    sanctionId: string,
  ): Promise<CompetitionSanction | null>;
  /** Every sanction of the competition, revoked included, newest first. */
  listByCompetition(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
  ): Promise<readonly CompetitionSanction[]>;
  /** Sanctions on the Team or on its players, newest first. */
  listByTeam(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    teamId: TeamId,
  ): Promise<readonly CompetitionSanction[]>;
  /**
   * Compare-and-set: records the revocation only while the sanction is still active.
   * Returns the stored sanction, or `null` when it was already revoked.
   */
  revoke(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    sanctionId: string,
    revocation: SanctionRevocation,
  ): Promise<CompetitionSanction | null>;
}
