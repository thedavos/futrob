import {
  type ClaimPendingOptions,
  type RosterInvitationRepository,
  ROSTER_INVITATION_STATUS,
  type RosterInvitation,
} from "@futrob/teams";
import { redeemPolicySchema, rosterMembershipRoleSchema } from "@futrob/api-contracts";
import type { ActorId } from "@futrob/shared-kernel";
import { asActorId, asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { z } from "zod";
import {
  pgNullableTextSchema,
  pgTextSchema,
  pgTimestampSchema,
} from "@/adapters/persistence/pg-scalar.ts";
import {
  getPgExecutor,
  isInPgTransaction,
  type PgExecutor,
} from "@/adapters/persistence/pg-transaction.ts";

const rosterInvitationStatusSchema = z.enum([
  "pending",
  "accepted",
  "declined",
  "revoked",
  "expired",
]);

const pgNullableTimestampSchema = z
  .union([z.null(), z.undefined(), pgTimestampSchema])
  .transform((value) => (value === null || value === undefined ? null : value));

export const rosterInvitationRowSchema = z.object({
  id: pgTextSchema,
  organization_id: pgTextSchema,
  competition_id: pgTextSchema,
  team_id: pgTextSchema,
  role: rosterMembershipRoleSchema,
  token_hash: pgTextSchema,
  status: rosterInvitationStatusSchema,
  invited_by_actor_id: pgTextSchema,
  invited_by_display_name: pgNullableTextSchema,
  invited_by_gamertag: pgNullableTextSchema,
  invitee_actor_id: pgNullableTextSchema,
  invitee_identifier: pgNullableTextSchema,
  message: pgNullableTextSchema,
  expires_at: pgTimestampSchema,
  accepted_by_actor_id: pgNullableTextSchema,
  responded_at: pgNullableTimestampSchema,
  created_at: pgTimestampSchema,
  redeem_policy: redeemPolicySchema,
});

export type RosterInvitationRow = z.infer<typeof rosterInvitationRowSchema>;

const ROSTER_INVITATION_COLUMNS = `id, organization_id, competition_id, team_id, role, token_hash, status,
       invited_by_actor_id, invited_by_display_name, invited_by_gamertag,
       invitee_actor_id, invitee_identifier, message,
       expires_at, accepted_by_actor_id, responded_at, created_at, redeem_policy`;

const redemptionAtRowSchema = z.object({
  redeemed_at: pgTimestampSchema,
});

const memberCountRowSchema = z.object({
  member_count: z.coerce.number(),
});

const redemptionCountRowSchema = z.object({
  redemption_count: z.coerce.number(),
});

export function rehydrateRosterInvitation(row: RosterInvitationRow): RosterInvitation {
  return {
    id: row.id,
    organizationId: asOrganizationId(row.organization_id),
    competitionId: asCompetitionId(row.competition_id),
    teamId: asTeamId(row.team_id),
    role: row.role,
    tokenHash: row.token_hash,
    status: row.status,
    invitedByActorId: asActorId(row.invited_by_actor_id),
    invitedByDisplayName: row.invited_by_display_name,
    invitedByGamertag: row.invited_by_gamertag,
    inviteeActorId: row.invitee_actor_id ? asActorId(row.invitee_actor_id) : null,
    inviteeIdentifier: row.invitee_identifier,
    message: row.message,
    expiresAt: row.expires_at,
    acceptedByActorId: row.accepted_by_actor_id ? asActorId(row.accepted_by_actor_id) : null,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
    redeemPolicy: row.redeem_policy,
  };
}

export class PostgresRosterInvitationRepository implements RosterInvitationRepository {
  constructor(private readonly pool: Pool) {}

  async create(invitation: RosterInvitation): Promise<void> {
    await getPgExecutor(this.pool).query(
      `INSERT INTO roster_invitations (
         id, organization_id, competition_id, team_id, role, token_hash, status,
         invited_by_actor_id, invited_by_display_name, invited_by_gamertag,
         invitee_actor_id, invitee_identifier, message,
         expires_at, accepted_by_actor_id, responded_at, created_at, redeem_policy
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        invitation.id,
        invitation.organizationId,
        invitation.competitionId,
        invitation.teamId,
        invitation.role,
        invitation.tokenHash,
        invitation.status,
        invitation.invitedByActorId,
        invitation.invitedByDisplayName,
        invitation.invitedByGamertag,
        invitation.inviteeActorId,
        invitation.inviteeIdentifier,
        invitation.message,
        invitation.expiresAt.toISOString(),
        invitation.acceptedByActorId,
        invitation.respondedAt?.toISOString() ?? null,
        invitation.createdAt.toISOString(),
        invitation.redeemPolicy,
      ],
    );
  }

  async findByTokenHash(tokenHash: string): Promise<RosterInvitation | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT ${ROSTER_INVITATION_COLUMNS}
       FROM roster_invitations WHERE token_hash = $1`,
      [tokenHash],
    );
    const row = result.rows[0];
    return row ? rehydrateRosterInvitation(rosterInvitationRowSchema.parse(row)) : null;
  }

  async findById(invitationId: string): Promise<RosterInvitation | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT ${ROSTER_INVITATION_COLUMNS}
       FROM roster_invitations WHERE id = $1`,
      [invitationId],
    );
    const row = result.rows[0];
    return row ? rehydrateRosterInvitation(rosterInvitationRowSchema.parse(row)) : null;
  }

  async listByInvitee(inviteeActorId: ActorId): Promise<RosterInvitation[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT ${ROSTER_INVITATION_COLUMNS}
       FROM roster_invitations
       WHERE invitee_actor_id = $1
       ORDER BY created_at DESC`,
      [inviteeActorId],
    );
    return result.rows.map((row) =>
      rehydrateRosterInvitation(rosterInvitationRowSchema.parse(row)),
    );
  }

  async findRedemption(invitationId: string, actorId: ActorId): Promise<Date | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT redeemed_at
       FROM roster_invitation_redemptions
       WHERE invitation_id = $1 AND actor_id = $2`,
      [invitationId, actorId],
    );
    const row = result.rows[0];
    return row ? redemptionAtRowSchema.parse(row).redeemed_at : null;
  }

  async deleteRedemption(invitationId: string, actorId: ActorId): Promise<void> {
    await getPgExecutor(this.pool).query(
      `DELETE FROM roster_invitation_redemptions
       WHERE invitation_id = $1 AND actor_id = $2`,
      [invitationId, actorId],
    );
  }

  async claimPending(
    tokenHash: string,
    actorId: ActorId,
    now: Date,
    options: ClaimPendingOptions,
  ): Promise<RosterInvitation | null> {
    if (isInPgTransaction()) {
      return this.claimPendingWithExecutor(
        getPgExecutor(this.pool),
        tokenHash,
        actorId,
        now,
        options,
      );
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const claimed = await this.claimPendingWithExecutor(client, tokenHash, actorId, now, options);
      if (!claimed) {
        await client.query("ROLLBACK");
        return null;
      }
      await client.query("COMMIT");
      return claimed;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async declinePending(
    invitationId: string,
    inviteeActorId: ActorId,
    now: Date,
  ): Promise<RosterInvitation | null> {
    const result = await getPgExecutor(this.pool).query(
      `UPDATE roster_invitations
       SET status = $4,
           responded_at = $3
       WHERE id = $1
         AND invitee_actor_id = $2
         AND status = $5
         AND expires_at > $3
       RETURNING ${ROSTER_INVITATION_COLUMNS}`,
      [
        invitationId,
        inviteeActorId,
        now.toISOString(),
        ROSTER_INVITATION_STATUS.declined,
        ROSTER_INVITATION_STATUS.pending,
      ],
    );
    const row = result.rows[0];
    return row ? rehydrateRosterInvitation(rosterInvitationRowSchema.parse(row)) : null;
  }

  async acceptPendingById(
    invitationId: string,
    actorId: ActorId,
    now: Date,
  ): Promise<RosterInvitation | null> {
    const result = await getPgExecutor(this.pool).query(
      `UPDATE roster_invitations
       SET status = $4,
           accepted_by_actor_id = $2,
           responded_at = $3
       WHERE id = $1
         AND status = $5
         AND expires_at > $3
       RETURNING ${ROSTER_INVITATION_COLUMNS}`,
      [
        invitationId,
        actorId,
        now.toISOString(),
        ROSTER_INVITATION_STATUS.accepted,
        ROSTER_INVITATION_STATUS.pending,
      ],
    );
    const row = result.rows[0];
    return row ? rehydrateRosterInvitation(rosterInvitationRowSchema.parse(row)) : null;
  }

  private async claimPendingWithExecutor(
    executor: PgExecutor,
    tokenHash: string,
    actorId: ActorId,
    now: Date,
    options: ClaimPendingOptions,
  ): Promise<RosterInvitation | null> {
    const locked = await executor.query(
      `SELECT ${ROSTER_INVITATION_COLUMNS}
       FROM roster_invitations
       WHERE token_hash = $1
       FOR UPDATE`,
      [tokenHash],
    );
    const row = locked.rows[0];
    if (!row) return null;

    const invitation = rehydrateRosterInvitation(rosterInvitationRowSchema.parse(row));
    if (invitation.status !== ROSTER_INVITATION_STATUS.pending) return null;
    if (invitation.expiresAt.getTime() <= now.getTime()) return null;

    if (invitation.redeemPolicy === "multi") {
      const existing = await executor.query(
        `SELECT redeemed_at
         FROM roster_invitation_redemptions
         WHERE invitation_id = $1 AND actor_id = $2`,
        [invitation.id, actorId],
      );
      if (existing.rows[0]) return invitation;

      const countResult = await executor.query(
        `SELECT COUNT(*)::int AS member_count
         FROM competition_roster_memberships
         WHERE organization_id = $1 AND competition_id = $2 AND team_id = $3`,
        [invitation.organizationId, invitation.competitionId, invitation.teamId],
      );
      const memberCount = memberCountRowSchema.parse(countResult.rows[0]).member_count;
      const redemptionCountResult = await executor.query(
        `SELECT COUNT(*)::int AS redemption_count
         FROM roster_invitation_redemptions
         WHERE invitation_id = $1`,
        [invitation.id],
      );
      const redemptionCount = redemptionCountRowSchema.parse(
        redemptionCountResult.rows[0],
      ).redemption_count;
      const freeSlots = options.maxRosterSize - memberCount;
      if (freeSlots <= 0 || redemptionCount >= freeSlots || !options.hasFreeSlot) return null;

      await executor.query(
        `INSERT INTO roster_invitation_redemptions (invitation_id, actor_id, redeemed_at)
         VALUES ($1, $2, $3)`,
        [invitation.id, actorId, now.toISOString()],
      );
      return invitation;
    }

    const accepted = await executor.query(
      `UPDATE roster_invitations
       SET status = $4,
           accepted_by_actor_id = $2,
           responded_at = $3
       WHERE token_hash = $1
         AND status = $5
         AND expires_at > $3
       RETURNING ${ROSTER_INVITATION_COLUMNS}`,
      [
        tokenHash,
        actorId,
        now.toISOString(),
        ROSTER_INVITATION_STATUS.accepted,
        ROSTER_INVITATION_STATUS.pending,
      ],
    );
    return accepted.rows[0]
      ? rehydrateRosterInvitation(rosterInvitationRowSchema.parse(accepted.rows[0]))
      : null;
  }
}
