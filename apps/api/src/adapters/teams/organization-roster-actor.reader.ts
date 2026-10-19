import { rosterMembershipRoleSchema } from "@futrob/api-contracts";
import {
  asActorId,
  asCompetitionId,
  type ActorId,
  type OrganizationId,
} from "@futrob/shared-kernel";
import type {
  OrganizationRosterActorAssignment,
  OrganizationRosterActorReader,
} from "@futrob/teams";
import type { Pool } from "pg";
import { z } from "zod";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";
import type { InMemoryPlayerProfileRepository } from "./in-memory.repository.ts";
import type { InMemoryCompetitionRosterMembershipRepository } from "./team-roster.repositories.ts";

const rosterActorRowSchema = z.object({
  actor_id: z.string(),
  competition_id: z.string(),
  role: rosterMembershipRoleSchema,
});

export const ORGANIZATION_ROSTER_ACTOR_LIST_SQL = `SELECT p.actor_id, r.competition_id, r.role
       FROM competition_roster_memberships r
       INNER JOIN player_profiles p ON p.id = r.player_profile_id
       WHERE r.organization_id = $1
         AND p.actor_id = ANY($2::text[])`;

export class PostgresOrganizationRosterActorReader implements OrganizationRosterActorReader {
  constructor(private readonly pool: Pool) {}

  async listByOrganizationActors(input: {
    readonly organizationId: OrganizationId;
    readonly actorIds: readonly ActorId[];
  }): Promise<readonly OrganizationRosterActorAssignment[]> {
    if (input.actorIds.length === 0) return [];
    const result = await getPgExecutor(this.pool).query(ORGANIZATION_ROSTER_ACTOR_LIST_SQL, [
      input.organizationId,
      [...input.actorIds],
    ]);
    return result.rows.map((row) => {
      const parsed = rosterActorRowSchema.parse(row);
      return {
        actorId: asActorId(parsed.actor_id),
        competitionId: asCompetitionId(parsed.competition_id),
        role: parsed.role,
      };
    });
  }
}

export class InMemoryOrganizationRosterActorReader implements OrganizationRosterActorReader {
  constructor(
    private readonly rosters: InMemoryCompetitionRosterMembershipRepository,
    private readonly profiles: InMemoryPlayerProfileRepository,
  ) {}

  async listByOrganizationActors(input: {
    readonly organizationId: OrganizationId;
    readonly actorIds: readonly ActorId[];
  }): Promise<readonly OrganizationRosterActorAssignment[]> {
    if (input.actorIds.length === 0) return [];
    const wanted = new Set(input.actorIds);
    const actorByProfile = new Map(
      [...this.profiles.rows.values()].map((profile) => [profile.id, profile.actorId]),
    );
    return [...this.rosters.rows.values()].flatMap((row) => {
      const actorId = actorByProfile.get(row.playerProfileId);
      if (row.organizationId !== input.organizationId || !actorId || !wanted.has(actorId)) {
        return [];
      }
      return [{ actorId, competitionId: row.competitionId, role: row.role }];
    });
  }
}
