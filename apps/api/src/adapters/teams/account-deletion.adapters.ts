import { DELETED_ACCOUNT_DISPLAY_NAME, type AccountDeletionBlocker } from "@futrob/identity";
import { asCompetitionId, asTeamId, type ActorId } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { ACTIVE_COMPETITION_STATUSES_SQL } from "@/adapters/persistence/active-competition-statuses.sql.ts";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

const PROFILES_SQL = `SELECT id FROM player_profiles WHERE actor_id = $1`;

/** Teams the actor captains in competitions that are still running. */
export async function listActiveCaptainBlockers(
  pool: Pool,
  actorId: ActorId,
): Promise<AccountDeletionBlocker[]> {
  const result = await getPgExecutor(pool).query<{
    competition_id: string;
    competition_name: string;
    team_id: string;
    team_name: string;
  }>(
    `SELECT competition.id AS competition_id, competition.name AS competition_name,
            team.id AS team_id, team.name AS team_name
     FROM competition_roster_memberships roster
     JOIN competitions competition ON competition.id = roster.competition_id
     JOIN teams team ON team.id = roster.team_id
     WHERE roster.player_profile_id IN (${PROFILES_SQL}) AND roster.role = 'captain'
       AND competition.status IN ${ACTIVE_COMPETITION_STATUSES_SQL}
     ORDER BY competition.name, team.name, roster.id`,
    [actorId],
  );
  return result.rows.map((row) => ({
    kind: "active-captain",
    competitionId: asCompetitionId(row.competition_id),
    competitionName: row.competition_name,
    teamId: asTeamId(row.team_id),
    teamName: row.team_name,
  }));
}

/**
 * Reaction to `identity.actor-deleted`. The player profile stays as an anonymous tombstone
 * so finished rosters and official statistics keep their keys; game accounts, the EA club,
 * rosters of unfinished competitions, the active team and pending invitations go.
 */
export async function removeDeletedActorFromTeams(
  pool: Pool,
  actorId: ActorId,
  at: Date,
): Promise<void> {
  const db = getPgExecutor(pool);
  await db.query(`DELETE FROM active_team_preferences WHERE actor_id = $1`, [actorId]);
  await db.query(
    `DELETE FROM competition_roster_memberships roster
     USING competitions competition
     WHERE roster.player_profile_id IN (${PROFILES_SQL})
       AND competition.id = roster.competition_id
       AND competition.status NOT IN ('finished', 'archived')`,
    [actorId],
  );
  await db.query(`DELETE FROM player_game_accounts WHERE player_profile_id IN (${PROFILES_SQL})`, [
    actorId,
  ]);
  await db.query(
    `DELETE FROM player_external_club_associations WHERE player_profile_id IN (${PROFILES_SQL})`,
    [actorId],
  );
  await db.query(
    `UPDATE roster_invitations SET status = 'revoked', responded_at = $2
     WHERE status = 'pending' AND (invitee_actor_id = $1 OR invited_by_actor_id = $1)`,
    [actorId, at],
  );
  // Invitations keep a snapshot of who sent them and to whom; those names go too.
  await db.query(
    `UPDATE roster_invitations
     SET invited_by_display_name = $2, invited_by_gamertag = NULL
     WHERE invited_by_actor_id = $1`,
    [actorId, DELETED_ACCOUNT_DISPLAY_NAME],
  );
  await db.query(
    `UPDATE roster_invitations SET invitee_identifier = NULL WHERE invitee_actor_id = $1`,
    [actorId],
  );
}
