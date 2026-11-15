import type { AccountDeletionBlocker } from "@futrob/identity";
import { asOrganizationId, type ActorId } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { ACTIVE_COMPETITION_STATUSES_SQL } from "@/adapters/persistence/active-competition-statuses.sql.ts";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

/** Organizations the actor organizes alone while they run active competitions. */
export async function listSoleOrganizerBlockers(
  pool: Pool,
  actorId: ActorId,
): Promise<AccountDeletionBlocker[]> {
  const result = await getPgExecutor(pool).query<{ id: string; name: string }>(
    `SELECT organization.id, organization.name
     FROM organization_memberships membership
     JOIN organizations organization ON organization.id = membership.organization_id
     WHERE membership.actor_id = $1 AND membership.role = 'organizer'
       AND NOT EXISTS (
         SELECT 1 FROM organization_memberships other
         WHERE other.organization_id = membership.organization_id
           AND other.role = 'organizer' AND other.actor_id <> membership.actor_id
       )
       AND EXISTS (
         SELECT 1 FROM competitions competition
         WHERE competition.organization_id = membership.organization_id
           AND competition.status IN ${ACTIVE_COMPETITION_STATUSES_SQL}
       )
     ORDER BY organization.name, organization.id`,
    [actorId],
  );
  return result.rows.map((row) => ({
    kind: "sole-organizer",
    organizationId: asOrganizationId(row.id),
    organizationName: row.name,
  }));
}

/**
 * Reaction to `identity.actor-deleted`: the actor leaves every organization and loses the
 * permissions granted to them. Grants they gave others and audit rows stay.
 */
export async function removeDeletedActorFromOrganizations(
  pool: Pool,
  actorId: ActorId,
): Promise<void> {
  const db = getPgExecutor(pool);
  await db.query(`DELETE FROM organization_memberships WHERE actor_id = $1`, [actorId]);
  await db.query(`DELETE FROM authorization_grants WHERE actor_id = $1`, [actorId]);
  await db.query(`DELETE FROM platform_role_assignments WHERE actor_id = $1`, [actorId]);
}
