import type { ClaimPendingOptions, RosterInvitationRepository } from "@futrob/teams";
import { ROSTER_INVITATION_STATUS, type RosterInvitation } from "@futrob/teams";
import type { ActorId } from "@futrob/shared-kernel";
import { asActorId, asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import {
  getPgExecutor,
  isInPgTransaction,
  type PgExecutor,
} from "@/adapters/persistence/pg-transaction.ts";

export function rehydrateRosterInvitation(row: {
  id: string;
  organization_id: string;
  competition_id: string;
  team_id: string;
  role: string;
  token_hash: string;
  status: string;
  invited_by_actor_id: string;
  expires_at: Date | string;
  accepted_by_actor_id: string | null;
  created_at: Date | string;
  redeem_policy: string;
}): RosterInvitation {
  return {
    id: row.id,
    organizationId: asOrganizationId(row.organization_id),
    competitionId: asCompetitionId(row.competition_id),
    teamId: asTeamId(row.team_id),
    role: row.role as RosterInvitation["role"],
    tokenHash: row.token_hash,
    status: row.status as RosterInvitation["status"],
    invitedByActorId: asActorId(row.invited_by_actor_id),
    expiresAt: new Date(row.expires_at),
    acceptedByActorId: row.accepted_by_actor_id ? asActorId(row.accepted_by_actor_id) : null,
    createdAt: new Date(row.created_at),
    redeemPolicy: row.redeem_policy as RosterInvitation["redeemPolicy"],
  };
}

type RedemptionKey = `${string}:${string}`;

export class InMemoryRosterInvitationRepository implements RosterInvitationRepository {
  readonly byHash = new Map<string, RosterInvitation>();
  readonly redemptions = new Map<RedemptionKey, Date>();
  rosterMemberCount: ((invitation: RosterInvitation) => number) | null = null;

  async create(invitation: RosterInvitation): Promise<void> {
    this.byHash.set(invitation.tokenHash, invitation);
  }

  async findByTokenHash(tokenHash: string): Promise<RosterInvitation | null> {
    return this.byHash.get(tokenHash) ?? null;
  }

  async findRedemption(invitationId: string, actorId: ActorId): Promise<Date | null> {
    return this.redemptions.get(`${invitationId}:${actorId}`) ?? null;
  }

  async deleteRedemption(invitationId: string, actorId: ActorId): Promise<void> {
    this.redemptions.delete(`${invitationId}:${actorId}`);
  }

  async claimPending(
    tokenHash: string,
    actorId: ActorId,
    now: Date,
    options: ClaimPendingOptions,
  ): Promise<RosterInvitation | null> {
    const current = this.byHash.get(tokenHash);
    if (!current) return null;
    if (current.status !== ROSTER_INVITATION_STATUS.pending) return null;
    if (current.expiresAt.getTime() <= now.getTime()) return null;

    if (current.redeemPolicy === "multi") {
      const redemptionKey = `${current.id}:${actorId}` as RedemptionKey;
      if (this.redemptions.has(redemptionKey)) {
        return current;
      }

      const memberCount = this.rosterMemberCount?.(current) ?? 0;
      const redemptionCount = [...this.redemptions.keys()].filter((key) =>
        key.startsWith(`${current.id}:`),
      ).length;
      const freeSlots = options.maxRosterSize - memberCount;
      if (freeSlots <= 0 || redemptionCount >= freeSlots || !options.hasFreeSlot) {
        return null;
      }

      this.redemptions.set(redemptionKey, now);
      return current;
    }

    const accepted: RosterInvitation = {
      ...current,
      status: ROSTER_INVITATION_STATUS.accepted,
      acceptedByActorId: actorId,
    };
    this.byHash.set(tokenHash, accepted);
    return accepted;
  }
}

export class PostgresRosterInvitationRepository implements RosterInvitationRepository {
  constructor(private readonly pool: Pool) {}

  async create(invitation: RosterInvitation): Promise<void> {
    await getPgExecutor(this.pool).query(
      `INSERT INTO roster_invitations (
         id, organization_id, competition_id, team_id, role, token_hash, status,
         invited_by_actor_id, expires_at, accepted_by_actor_id, created_at, redeem_policy
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        invitation.id,
        invitation.organizationId,
        invitation.competitionId,
        invitation.teamId,
        invitation.role,
        invitation.tokenHash,
        invitation.status,
        invitation.invitedByActorId,
        invitation.expiresAt.toISOString(),
        invitation.acceptedByActorId,
        invitation.createdAt.toISOString(),
        invitation.redeemPolicy,
      ],
    );
  }

  async findByTokenHash(tokenHash: string): Promise<RosterInvitation | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, organization_id, competition_id, team_id, role, token_hash, status,
              invited_by_actor_id, expires_at, accepted_by_actor_id, created_at, redeem_policy
       FROM roster_invitations WHERE token_hash = $1`,
      [tokenHash],
    );
    const row = result.rows[0] as
      | {
          id: string;
          organization_id: string;
          competition_id: string;
          team_id: string;
          role: string;
          token_hash: string;
          status: string;
          invited_by_actor_id: string;
          expires_at: Date;
          accepted_by_actor_id: string | null;
          created_at: Date;
          redeem_policy: string;
        }
      | undefined;
    return row ? rehydrateRosterInvitation(row) : null;
  }

  async findRedemption(invitationId: string, actorId: ActorId): Promise<Date | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT redeemed_at
       FROM roster_invitation_redemptions
       WHERE invitation_id = $1 AND actor_id = $2`,
      [invitationId, actorId],
    );
    const row = result.rows[0] as { redeemed_at: Date } | undefined;
    return row ? new Date(row.redeemed_at) : null;
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

  private async claimPendingWithExecutor(
    executor: PgExecutor,
    tokenHash: string,
    actorId: ActorId,
    now: Date,
    options: ClaimPendingOptions,
  ): Promise<RosterInvitation | null> {
    const locked = await executor.query(
      `SELECT id, organization_id, competition_id, team_id, role, token_hash, status,
              invited_by_actor_id, expires_at, accepted_by_actor_id, created_at, redeem_policy
       FROM roster_invitations
       WHERE token_hash = $1
       FOR UPDATE`,
      [tokenHash],
    );
    const row = locked.rows[0] as Parameters<typeof rehydrateRosterInvitation>[0] | undefined;
    if (!row) return null;

    const invitation = rehydrateRosterInvitation(row);
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
      const memberCount = (countResult.rows[0] as { member_count: number }).member_count;
      const redemptionCountResult = await executor.query(
        `SELECT COUNT(*)::int AS redemption_count
         FROM roster_invitation_redemptions
         WHERE invitation_id = $1`,
        [invitation.id],
      );
      const redemptionCount = (redemptionCountResult.rows[0] as { redemption_count: number })
        .redemption_count;
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
           accepted_by_actor_id = $2
       WHERE token_hash = $1
         AND status = $5
         AND expires_at > $3
       RETURNING id, organization_id, competition_id, team_id, role, token_hash, status,
                 invited_by_actor_id, expires_at, accepted_by_actor_id, created_at, redeem_policy`,
      [
        tokenHash,
        actorId,
        now.toISOString(),
        ROSTER_INVITATION_STATUS.accepted,
        ROSTER_INVITATION_STATUS.pending,
      ],
    );
    return accepted.rows[0]
      ? rehydrateRosterInvitation(
          accepted.rows[0] as Parameters<typeof rehydrateRosterInvitation>[0],
        )
      : null;
  }
}
