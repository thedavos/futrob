import type {
  Competition,
  CompetitionDraft,
  CompetitionMembership,
  CompetitionMembershipRepository,
  CompetitionMatchRules,
  CompetitionRepository,
  CompetitionRules,
} from "@futrob/competitions";
import {
  asActorId,
  asCompetitionId,
  asOrganizationId,
  type CompetitionId,
  type ActorId,
  type OrganizationId,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import {
  getPgExecutor,
  isInPgTransaction,
  type PgExecutor,
} from "@/adapters/persistence/pg-transaction.ts";

export class PostgresCompetitionRepository implements CompetitionRepository {
  constructor(private readonly pool: Pool) {}

  async saveDraft(draft: CompetitionDraft): Promise<CompetitionDraft> {
    if (isInPgTransaction()) {
      return this.writeDraft(getPgExecutor(this.pool), draft);
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await this.writeDraft(client, draft);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async writeDraft(
    executor: PgExecutor,
    draft: CompetitionDraft,
  ): Promise<CompetitionDraft> {
    const competitionResult = await executor.query(
      `INSERT INTO competitions (
         id, organization_id, name, status, modality, game_edition, platform, region,
         time_zone, format, created_by_actor_id, creation_key, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (creation_key) WHERE creation_key IS NOT NULL DO UPDATE SET
         name = EXCLUDED.name,
         game_edition = EXCLUDED.game_edition,
         platform = EXCLUDED.platform,
         region = EXCLUDED.region,
         time_zone = EXCLUDED.time_zone,
         format = EXCLUDED.format,
         updated_at = EXCLUDED.updated_at
       WHERE competitions.status = 'draft'
       RETURNING *`,
      [
        draft.competition.id,
        draft.competition.organizationId,
        draft.competition.name,
        draft.competition.status,
        draft.competition.modality,
        draft.competition.gameEdition,
        draft.competition.platform,
        draft.competition.region,
        draft.competition.timeZone,
        draft.competition.format,
        draft.competition.createdByActorId,
        draft.competition.creationKey ?? null,
        draft.competition.createdAt.toISOString(),
        draft.competition.updatedAt.toISOString(),
      ],
    );
    const competition = rehydrateCompetition(competitionResult.rows[0]);
    const rulesResult = await executor.query(
      `INSERT INTO competition_rules (
         competition_id, version, regular_stage, knockout_stage, away_goals_enabled,
         max_roster_size, require_verified_external_club, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (competition_id, version) DO UPDATE SET
         regular_stage = EXCLUDED.regular_stage,
         knockout_stage = EXCLUDED.knockout_stage,
         away_goals_enabled = EXCLUDED.away_goals_enabled,
         max_roster_size = EXCLUDED.max_roster_size,
         require_verified_external_club = EXCLUDED.require_verified_external_club
       RETURNING *`,
      [
        competition.id,
        draft.rules.version,
        draft.rules.regularStage,
        draft.rules.knockoutStage,
        draft.rules.awayGoalsEnabled,
        draft.rules.maxRosterSize,
        draft.rules.requireVerifiedExternalClub,
        draft.rules.createdAt.toISOString(),
      ],
    );
    return { competition, rules: rehydrateRules(rulesResult.rows[0]) };
  }

  async findById(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
  ): Promise<CompetitionDraft | null> {
    return this.findOne(`WHERE c.organization_id = $1 AND c.id = $2`, [
      organizationId,
      competitionId,
    ]);
  }

  async findByCreationKey(creationKey: string): Promise<CompetitionDraft | null> {
    return this.findOne(`WHERE c.creation_key = $1`, [creationKey]);
  }

  async findRulesByCompetitionId(competitionId: CompetitionId): Promise<CompetitionRules | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT competition_id, version, regular_stage, knockout_stage, away_goals_enabled,
              max_roster_size, require_verified_external_club, created_at
       FROM competition_rules
       WHERE competition_id = $1 AND version = 1`,
      [competitionId],
    );
    return result.rows[0] ? rehydrateRules(result.rows[0]) : null;
  }

  private async findOne(
    where: string,
    values: readonly unknown[],
  ): Promise<CompetitionDraft | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT c.*,
              r.version AS rules_version,
              r.regular_stage,
              r.knockout_stage,
              r.away_goals_enabled,
              r.max_roster_size,
              r.require_verified_external_club,
              r.created_at AS rules_created_at
       FROM competitions c
       INNER JOIN competition_rules r ON r.competition_id = c.id AND r.version = 1
       ${where}`,
      [...values],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      competition: rehydrateCompetition(row),
      rules: rehydrateRules({
        competition_id: row.id,
        version: row.rules_version,
        regular_stage: row.regular_stage,
        knockout_stage: row.knockout_stage,
        away_goals_enabled: row.away_goals_enabled,
        max_roster_size: row.max_roster_size,
        require_verified_external_club: row.require_verified_external_club,
        created_at: row.rules_created_at,
      }),
    };
  }
}

export class PostgresCompetitionMembershipRepository implements CompetitionMembershipRepository {
  constructor(private readonly pool: Pool) {}

  async add(membership: CompetitionMembership): Promise<CompetitionMembership> {
    const result = await getPgExecutor(this.pool).query(
      `INSERT INTO competition_memberships (
         organization_id, competition_id, actor_id, role, created_at
       ) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (competition_id, actor_id) DO UPDATE SET role = competition_memberships.role
       RETURNING organization_id, competition_id, actor_id, role, created_at`,
      [
        membership.organizationId,
        membership.competitionId,
        membership.actorId,
        membership.role,
        membership.createdAt.toISOString(),
      ],
    );
    return rehydrateCompetitionMembership(result.rows[0]);
  }

  async findByCompetitionAndActor(
    competitionId: CompetitionId,
    actorId: ActorId,
  ): Promise<CompetitionMembership | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT organization_id, competition_id, actor_id, role, created_at
       FROM competition_memberships
       WHERE competition_id = $1 AND actor_id = $2`,
      [competitionId, actorId],
    );
    return result.rows[0] ? rehydrateCompetitionMembership(result.rows[0]) : null;
  }
}

function rehydrateCompetitionMembership(row: Record<string, unknown>): CompetitionMembership {
  return {
    organizationId: asOrganizationId(String(row.organization_id)),
    competitionId: asCompetitionId(String(row.competition_id)),
    actorId: asActorId(String(row.actor_id)),
    role: row.role as CompetitionMembership["role"],
    createdAt: new Date(String(row.created_at)),
  };
}

function rehydrateCompetition(row: Record<string, unknown>): Competition {
  return {
    id: asCompetitionId(String(row.id)),
    organizationId: asOrganizationId(String(row.organization_id)),
    name: String(row.name),
    status: row.status as Competition["status"],
    modality: "fc-clubs",
    gameEdition: String(row.game_edition),
    platform: row.platform as Competition["platform"],
    region: row.region as Competition["region"],
    timeZone: String(row.time_zone),
    format: row.format as Competition["format"],
    createdByActorId: asActorId(String(row.created_by_actor_id)),
    creationKey: typeof row.creation_key === "string" ? row.creation_key : undefined,
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

function rehydrateRules(row: Record<string, unknown>): CompetitionRules {
  return {
    competitionId: asCompetitionId(String(row.competition_id)),
    version: Number(row.version),
    regularStage: (row.regular_stage as CompetitionMatchRules | null) ?? null,
    knockoutStage: (row.knockout_stage as CompetitionMatchRules | null) ?? null,
    awayGoalsEnabled: false,
    maxRosterSize: (row.max_roster_size as number | null) ?? null,
    requireVerifiedExternalClub: Boolean(row.require_verified_external_club ?? false),
    createdAt: new Date(String(row.created_at)),
  };
}
