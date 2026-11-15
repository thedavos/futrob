import type { CompetitionMembership, CompetitionMembershipRepository } from "@futrob/competitions";
import {
  asActorId,
  asCompetitionId,
  asOrganizationId,
  type ActorId,
  type CompetitionId,
  type OrganizationId,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { z } from "zod";
import { pgTimestampSchema } from "@/adapters/persistence/pg-scalar.ts";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

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

  async listForOrganizationActors(
    organizationId: OrganizationId,
    actorIds: readonly ActorId[],
  ): Promise<readonly CompetitionMembership[]> {
    if (actorIds.length === 0) return [];
    const result = await getPgExecutor(this.pool).query(
      `SELECT organization_id, competition_id, actor_id, role, created_at
       FROM competition_memberships
       WHERE organization_id = $1 AND actor_id = ANY($2::text[])`,
      [organizationId, [...actorIds]],
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
