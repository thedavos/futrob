import {
  SANCTION_TARGET,
  SANCTION_TYPES,
  type CompetitionSanction,
  type CompetitionSanctionRepository,
  type SanctionRevocation,
  type SanctionTargetType,
  type SanctionType,
} from "@futrob/competitions";
import {
  Panic,
  TIME_SORT_DIRECTION,
  asActorId,
  asCompetitionId,
  asOrganizationId,
  asTeamId,
  compareByTime,
  type CompetitionId,
  type OrganizationId,
  type TeamId,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

const newestFirst = compareByTime<CompetitionSanction>(
  (sanction) => sanction.imposedAt,
  TIME_SORT_DIRECTION.desc,
);

export class InMemoryCompetitionSanctionRepository implements CompetitionSanctionRepository {
  readonly rows = new Map<string, CompetitionSanction>();

  async create(sanction: CompetitionSanction): Promise<CompetitionSanction> {
    this.rows.set(sanction.id, sanction);
    return sanction;
  }

  async findById(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    sanctionId: string,
  ): Promise<CompetitionSanction | null> {
    const row = this.rows.get(sanctionId);
    return row?.organizationId === organizationId && row.competitionId === competitionId
      ? row
      : null;
  }

  async listByCompetition(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
  ): Promise<readonly CompetitionSanction[]> {
    return this.inCompetition(organizationId, competitionId);
  }

  async listByTeam(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    teamId: TeamId,
  ): Promise<readonly CompetitionSanction[]> {
    return this.inCompetition(organizationId, competitionId).filter((row) => row.teamId === teamId);
  }

  async revoke(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    sanctionId: string,
    revocation: SanctionRevocation,
  ): Promise<CompetitionSanction | null> {
    const current = await this.findById(organizationId, competitionId, sanctionId);
    if (!current || current.revocation !== null) return null;
    const revoked = { ...current, revocation };
    this.rows.set(sanctionId, revoked);
    return revoked;
  }

  private inCompetition(organizationId: OrganizationId, competitionId: CompetitionId) {
    return [...this.rows.values()]
      .filter((row) => row.organizationId === organizationId && row.competitionId === competitionId)
      .sort(newestFirst);
  }
}

const COLUMNS = `id, organization_id, competition_id, target_type, team_id, player_profile_id,
  type, points_deducted, suspension_matches, encounter_id, reason, imposed_by_actor_id,
  imposed_at, request_id, revoked_by_actor_id, revoked_at, revocation_reason,
  revocation_request_id`;

interface SanctionRow {
  id: string;
  organization_id: string;
  competition_id: string;
  target_type: string;
  team_id: string;
  player_profile_id: string | null;
  type: string;
  points_deducted: number | null;
  suspension_matches: number | null;
  encounter_id: string | null;
  reason: string;
  imposed_by_actor_id: string;
  imposed_at: Date | string;
  request_id: string;
  revoked_by_actor_id: string | null;
  revoked_at: Date | string | null;
  revocation_reason: string | null;
  revocation_request_id: string | null;
}

/** Every read is scoped by organization and competition (tenancy in application code). */
export class PostgresCompetitionSanctionRepository implements CompetitionSanctionRepository {
  constructor(private readonly pool: Pool) {}

  async create(sanction: CompetitionSanction): Promise<CompetitionSanction> {
    const row = await this.one(
      `INSERT INTO competition_sanctions (
         id, organization_id, competition_id, target_type, team_id, player_profile_id, type,
         points_deducted, suspension_matches, encounter_id, reason, imposed_by_actor_id,
         imposed_at, request_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING ${COLUMNS}`,
      [
        sanction.id,
        sanction.organizationId,
        sanction.competitionId,
        sanction.targetType,
        sanction.teamId,
        sanction.playerProfileId,
        sanction.type,
        sanction.pointsDeducted,
        sanction.suspensionMatches,
        sanction.encounterId,
        sanction.reason,
        sanction.imposedByActorId,
        sanction.imposedAt.toISOString(),
        sanction.requestId,
      ],
    );
    if (!row) throw new Panic("Sanction insert returned no row");
    return row;
  }

  findById(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    sanctionId: string,
  ): Promise<CompetitionSanction | null> {
    return this.one(
      `SELECT ${COLUMNS} FROM competition_sanctions
       WHERE organization_id = $1 AND competition_id = $2 AND id = $3`,
      [organizationId, competitionId, sanctionId],
    );
  }

  listByCompetition(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
  ): Promise<readonly CompetitionSanction[]> {
    return this.many(
      `SELECT ${COLUMNS} FROM competition_sanctions
       WHERE organization_id = $1 AND competition_id = $2
       ORDER BY imposed_at DESC, id DESC`,
      [organizationId, competitionId],
    );
  }

  listByTeam(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    teamId: TeamId,
  ): Promise<readonly CompetitionSanction[]> {
    return this.many(
      `SELECT ${COLUMNS} FROM competition_sanctions
       WHERE organization_id = $1 AND competition_id = $2 AND team_id = $3
       ORDER BY imposed_at DESC, id DESC`,
      [organizationId, competitionId, teamId],
    );
  }

  revoke(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    sanctionId: string,
    revocation: SanctionRevocation,
  ): Promise<CompetitionSanction | null> {
    return this.one(
      `UPDATE competition_sanctions
       SET revoked_by_actor_id = $4, revoked_at = $5, revocation_reason = $6,
           revocation_request_id = $7
       WHERE organization_id = $1 AND competition_id = $2 AND id = $3 AND revoked_at IS NULL
       RETURNING ${COLUMNS}`,
      [
        organizationId,
        competitionId,
        sanctionId,
        revocation.actorId,
        revocation.at.toISOString(),
        revocation.reason,
        revocation.requestId,
      ],
    );
  }

  private async one(text: string, values: unknown[]): Promise<CompetitionSanction | null> {
    return (await this.many(text, values))[0] ?? null;
  }

  private async many(text: string, values: unknown[]): Promise<CompetitionSanction[]> {
    const result = await getPgExecutor(this.pool).query<SanctionRow>(text, values);
    return result.rows.map(rehydrate);
  }
}

const TARGETS: ReadonlySet<string> = new Set(Object.values(SANCTION_TARGET));
const TYPES: ReadonlySet<string> = new Set(SANCTION_TYPES);

function isTarget(value: string): value is SanctionTargetType {
  return TARGETS.has(value);
}

function isType(value: string): value is SanctionType {
  return TYPES.has(value);
}

function revocationOf(row: SanctionRow): SanctionRevocation | null {
  if (
    row.revoked_at === null ||
    row.revoked_by_actor_id === null ||
    row.revocation_reason === null ||
    row.revocation_request_id === null
  ) {
    return null;
  }
  return {
    actorId: asActorId(row.revoked_by_actor_id),
    at: new Date(row.revoked_at),
    reason: row.revocation_reason,
    requestId: row.revocation_request_id,
  };
}

function rehydrate(row: SanctionRow): CompetitionSanction {
  if (!isTarget(row.target_type) || !isType(row.type)) {
    throw new Panic(`Unknown sanction target/type: ${row.target_type}/${row.type}`);
  }
  return {
    id: row.id,
    organizationId: asOrganizationId(row.organization_id),
    competitionId: asCompetitionId(row.competition_id),
    targetType: row.target_type,
    teamId: asTeamId(row.team_id),
    playerProfileId: row.player_profile_id,
    type: row.type,
    pointsDeducted: row.points_deducted,
    suspensionMatches: row.suspension_matches,
    encounterId: row.encounter_id,
    reason: row.reason,
    imposedByActorId: asActorId(row.imposed_by_actor_id),
    imposedAt: new Date(row.imposed_at),
    requestId: row.request_id,
    revocation: revocationOf(row),
  };
}
