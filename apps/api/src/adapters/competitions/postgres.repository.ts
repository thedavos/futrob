import type {
  Competition,
  CompetitionDraft,
  CompetitionMembership,
  CompetitionMembershipRepository,
  CompetitionMatchRules,
  CompetitionRepository,
  CompetitionRules,
  CompetitionStatus,
} from "@futrob/competitions";
import { DEFAULT_TEAM_RANGE } from "@futrob/competitions";
import {
  calendarDate,
  coverColumns,
  rehydrateCover,
} from "@/adapters/competitions/competition-profile-columns.ts";
import {
  competitionFormatSchema,
  competitionPlatformSchema,
  competitionRegionSchema,
  competitionStatusSchema,
} from "@futrob/api-contracts";
import {
  asActorId,
  asCompetitionId,
  asOrganizationId,
  type CompetitionId,
  type ActorId,
  type OrganizationId,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { z } from "zod";
import { pgTimestampSchema } from "@/adapters/persistence/pg-scalar.ts";
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
         time_zone, format, created_by_actor_id, creation_key, created_at, updated_at,
         min_teams, max_teams, starts_on, ends_on, cover_kind, cover_value
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
         $19, $20)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         game_edition = EXCLUDED.game_edition,
         platform = EXCLUDED.platform,
         region = EXCLUDED.region,
         time_zone = EXCLUDED.time_zone,
         format = EXCLUDED.format,
         min_teams = EXCLUDED.min_teams,
         max_teams = EXCLUDED.max_teams,
         starts_on = EXCLUDED.starts_on,
         ends_on = EXCLUDED.ends_on,
         cover_kind = EXCLUDED.cover_kind,
         cover_value = EXCLUDED.cover_value,
         updated_at = EXCLUDED.updated_at
       WHERE competitions.status = 'draft' AND competitions.organization_id = EXCLUDED.organization_id
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
        draft.competition.teams.min,
        draft.competition.teams.max,
        draft.competition.schedule.startsOn,
        draft.competition.schedule.endsOn,
        ...coverColumns(draft.competition.cover),
      ],
    );
    const competition = rehydrateCompetition(competitionResult.rows[0]);
    const rulesResult = await executor.query(
      `INSERT INTO competition_rules (
         competition_id, version, regular_stage, knockout_stage, away_goals_enabled,
         max_roster_size, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (competition_id, version) DO UPDATE SET
         regular_stage = EXCLUDED.regular_stage,
         knockout_stage = EXCLUDED.knockout_stage,
         away_goals_enabled = EXCLUDED.away_goals_enabled,
         max_roster_size = EXCLUDED.max_roster_size
       RETURNING *`,
      [
        competition.id,
        draft.rules.version,
        draft.rules.regularStage,
        draft.rules.knockoutStage,
        draft.rules.awayGoalsEnabled,
        draft.rules.maxRosterSize,
        draft.rules.createdAt.toISOString(),
      ],
    );
    return { competition, rules: rehydrateRules(rulesResult.rows[0]) };
  }

  async publish(draft: CompetitionDraft): Promise<CompetitionDraft> {
    const result = await getPgExecutor(this.pool).query(
      `UPDATE competitions
       SET status = 'published', updated_at = $3
       WHERE id = $1 AND organization_id = $2 AND status IN ('draft', 'registration')
       RETURNING *`,
      [
        draft.competition.id,
        draft.competition.organizationId,
        draft.competition.updatedAt.toISOString(),
      ],
    );
    if (!result.rows[0]) return draft;
    return { ...draft, competition: rehydrateCompetition(result.rows[0]) };
  }

  async saveCover(draft: CompetitionDraft): Promise<CompetitionDraft> {
    const [coverKind, coverValue] = coverColumns(draft.competition.cover);
    const result = await getPgExecutor(this.pool).query(
      `UPDATE competitions
       SET cover_kind = $3, cover_value = $4, updated_at = $5
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      [
        draft.competition.id,
        draft.competition.organizationId,
        coverKind,
        coverValue,
        draft.competition.updatedAt.toISOString(),
      ],
    );
    if (!result.rows[0]) return draft;
    return { ...draft, competition: rehydrateCompetition(result.rows[0]) };
  }

  async changeStatus(
    draft: CompetitionDraft,
    expected: CompetitionStatus,
  ): Promise<CompetitionDraft | null> {
    const result = await getPgExecutor(this.pool).query(
      `UPDATE competitions
       SET status = $3, updated_at = $4
       WHERE id = $1 AND organization_id = $2 AND status = $5
       RETURNING *`,
      [
        draft.competition.id,
        draft.competition.organizationId,
        draft.competition.status,
        draft.competition.updatedAt.toISOString(),
        expected,
      ],
    );
    if (!result.rows[0]) return null;
    return { ...draft, competition: rehydrateCompetition(result.rows[0]) };
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
              max_roster_size, created_at
       FROM competition_rules
       WHERE competition_id = $1 AND version = 1`,
      [competitionId],
    );
    return result.rows[0] ? rehydrateRules(result.rows[0]) : null;
  }

  async listByOrganization(organizationId: OrganizationId): Promise<Competition[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, organization_id, name, status, modality, game_edition, platform, region,
              time_zone, format, created_by_actor_id, creation_key, created_at, updated_at,
              min_teams, max_teams, starts_on, ends_on, cover_kind, cover_value
       FROM competitions
       WHERE organization_id = $1
       ORDER BY updated_at DESC`,
      [organizationId],
    );
    return result.rows.map((row) => rehydrateCompetition(row));
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

  async updateRole(membership: CompetitionMembership): Promise<CompetitionMembership> {
    const result = await getPgExecutor(this.pool).query(
      `UPDATE competition_memberships
       SET role = $4
       WHERE organization_id = $1 AND competition_id = $2 AND actor_id = $3
       RETURNING organization_id, competition_id, actor_id, role, created_at`,
      [membership.organizationId, membership.competitionId, membership.actorId, membership.role],
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

  async listByActor(actorId: ActorId): Promise<readonly CompetitionMembership[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT organization_id, competition_id, actor_id, role, created_at
       FROM competition_memberships
       WHERE actor_id = $1
       ORDER BY created_at DESC`,
      [actorId],
    );
    return result.rows.map(rehydrateCompetitionMembership);
  }
}

export interface CompetitionMembershipRow {
  organization_id: string;
  competition_id: string;
  actor_id: string;
  role: string;
  created_at: Date | string;
}

export interface CompetitionRow {
  id: string;
  organization_id: string;
  name: string;
  status: string;
  modality?: string;
  game_edition: string;
  platform: string;
  region: string;
  time_zone: string;
  format: string;
  created_by_actor_id: string;
  creation_key: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  min_teams?: number;
  max_teams?: number | null;
  starts_on?: Date | string | null;
  ends_on?: Date | string | null;
  cover_kind?: string;
  cover_value?: string;
}

export interface CompetitionRulesRow {
  competition_id: string;
  version: number;
  regular_stage: CompetitionMatchRules | null;
  knockout_stage: CompetitionMatchRules | null;
  away_goals_enabled?: boolean;
  max_roster_size: number | null;
  created_at: Date | string;
}

const competitionMembershipRoleSchema = z.enum(["staff", "captain", "player"]);

function rehydrateCompetitionMembership(row: CompetitionMembershipRow): CompetitionMembership {
  return {
    organizationId: asOrganizationId(row.organization_id),
    competitionId: asCompetitionId(row.competition_id),
    actorId: asActorId(row.actor_id),
    role: competitionMembershipRoleSchema.parse(row.role),
    createdAt: pgTimestampSchema.parse(row.created_at),
  };
}

export function rehydrateCompetition(row: CompetitionRow): Competition {
  return {
    id: asCompetitionId(row.id),
    organizationId: asOrganizationId(row.organization_id),
    name: row.name,
    status: competitionStatusSchema.parse(row.status),
    modality: "fc-clubs",
    gameEdition: row.game_edition,
    platform: competitionPlatformSchema.parse(row.platform),
    region: competitionRegionSchema.parse(row.region),
    timeZone: row.time_zone,
    format: competitionFormatSchema.parse(row.format),
    createdByActorId: asActorId(row.created_by_actor_id),
    creationKey: row.creation_key ?? undefined,
    teams: { min: row.min_teams ?? DEFAULT_TEAM_RANGE.min, max: row.max_teams ?? null },
    schedule: { startsOn: calendarDate(row.starts_on), endsOn: calendarDate(row.ends_on) },
    cover: rehydrateCover(row.organization_id, row.cover_kind, row.cover_value),
    createdAt: pgTimestampSchema.parse(row.created_at),
    updatedAt: pgTimestampSchema.parse(row.updated_at),
  };
}

function rehydrateRules(row: CompetitionRulesRow): CompetitionRules {
  return {
    competitionId: asCompetitionId(row.competition_id),
    version: Number(row.version),
    regularStage: row.regular_stage ?? null,
    knockoutStage: row.knockout_stage ?? null,
    awayGoalsEnabled: false,
    maxRosterSize: row.max_roster_size ?? null,
    createdAt: new Date(row.created_at),
  };
}
