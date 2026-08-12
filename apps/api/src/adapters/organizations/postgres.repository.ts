import { asOrganizationId, type ActorId, type OrganizationId } from "@futrob/shared-kernel";
import type {
  InvitationRepository,
  MembershipRepository,
  MembershipSummary,
  MultiRedemptionClaim,
  Organization,
  OrganizationInvitation,
  OrganizationMembership,
  OrganizationRepository,
  OrgMembershipRole,
} from "@futrob/organizations";
import { INVITATION_STATUS, REDEEM_POLICY } from "@futrob/organizations";
import type { Pool } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";
import {
  INVITATION_COLUMNS,
  rehydrateInvitation,
  rehydrateMembership,
  rehydrateOrganization,
  type InvitationRow,
} from "./in-memory.repository.ts";

export class PostgresOrganizationRepository implements OrganizationRepository {
  constructor(private readonly pool: Pool) {}

  async create(organization: Organization): Promise<Organization | null> {
    const result = await getPgExecutor(this.pool).query(
      `INSERT INTO organizations (
         id, name, normalized_name, created_at, created_by_actor_id, creation_key
       ) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING
       RETURNING id, name, normalized_name, created_at, created_by_actor_id, creation_key`,
      [
        organization.id,
        organization.name,
        organization.normalizedName,
        organization.createdAt.toISOString(),
        organization.createdByActorId,
        organization.creationKey ?? null,
      ],
    );
    if (result.rows[0]) return rehydrateOrganization(result.rows[0]);
    return organization.creationKey ? await this.getByCreationKey(organization.creationKey) : null;
  }

  async getById(id: OrganizationId): Promise<Organization | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, name, normalized_name, created_at, created_by_actor_id, creation_key
       FROM organizations WHERE id = $1`,
      [id],
    );
    const row = result.rows[0] as
      | {
          id: string;
          name: string;
          normalized_name: string;
          created_at: Date;
          created_by_actor_id: string;
          creation_key: string | null;
        }
      | undefined;
    return row ? rehydrateOrganization(row) : null;
  }

  async getByCreationKey(creationKey: string): Promise<Organization | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, name, normalized_name, created_at, created_by_actor_id, creation_key
       FROM organizations WHERE creation_key = $1`,
      [creationKey],
    );
    return result.rows[0] ? rehydrateOrganization(result.rows[0]) : null;
  }

  async getByNormalizedName(normalizedName: string): Promise<Organization | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, name, normalized_name, created_at, created_by_actor_id, creation_key
       FROM organizations WHERE normalized_name = $1`,
      [normalizedName],
    );
    return result.rows[0] ? rehydrateOrganization(result.rows[0]) : null;
  }
}

export class PostgresMembershipRepository implements MembershipRepository {
  constructor(private readonly pool: Pool) {}

  async add(membership: OrganizationMembership): Promise<void> {
    await getPgExecutor(this.pool).query(
      `INSERT INTO organization_memberships (organization_id, actor_id, role, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (organization_id, actor_id) DO NOTHING`,
      [
        membership.organizationId,
        membership.actorId,
        membership.role,
        membership.createdAt.toISOString(),
      ],
    );
  }

  async findByActor(actorId: ActorId): Promise<MembershipSummary[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT m.organization_id, o.name AS organization_name, m.role
       FROM organization_memberships m
       INNER JOIN organizations o ON o.id = m.organization_id
       WHERE m.actor_id = $1
       ORDER BY o.name ASC`,
      [actorId],
    );

    return (
      result.rows as Array<{
        organization_id: string;
        organization_name: string;
        role: OrgMembershipRole;
      }>
    ).map((row) => ({
      organizationId: asOrganizationId(row.organization_id),
      organizationName: row.organization_name,
      role: row.role,
    }));
  }

  async findByOrgAndActor(
    organizationId: OrganizationId,
    actorId: ActorId,
  ): Promise<OrganizationMembership | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT organization_id, actor_id, role, created_at
       FROM organization_memberships
       WHERE organization_id = $1 AND actor_id = $2`,
      [organizationId, actorId],
    );
    const row = result.rows[0] as
      | {
          organization_id: string;
          actor_id: string;
          role: string;
          created_at: Date;
        }
      | undefined;
    return row ? rehydrateMembership(row) : null;
  }

  async updateRole(membership: OrganizationMembership): Promise<OrganizationMembership> {
    const result = await getPgExecutor(this.pool).query(
      `UPDATE organization_memberships SET role = $3
       WHERE organization_id = $1 AND actor_id = $2
       RETURNING organization_id, actor_id, role, created_at`,
      [membership.organizationId, membership.actorId, membership.role],
    );
    return rehydrateMembership(result.rows[0]);
  }

  async updateRoleProtectingLastOrganizer(
    membership: OrganizationMembership,
  ): Promise<OrganizationMembership | null> {
    const executor = getPgExecutor(this.pool);
    await executor.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [
      membership.organizationId,
    ]);
    const result = await executor.query(
      `UPDATE organization_memberships
       SET role = $3
       WHERE organization_id = $1
         AND actor_id = $2
         AND (
           role <> 'organizer'
           OR $3 = 'organizer'
           OR (
             SELECT COUNT(*) FROM organization_memberships
             WHERE organization_id = $1 AND role = 'organizer'
           ) > 1
         )
       RETURNING organization_id, actor_id, role, created_at`,
      [membership.organizationId, membership.actorId, membership.role],
    );
    return result.rows[0] ? rehydrateMembership(result.rows[0]) : null;
  }

  async countByRole(organizationId: OrganizationId, role: "organizer"): Promise<number> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT COUNT(*)::int AS count FROM organization_memberships
       WHERE organization_id = $1 AND role = $2`,
      [organizationId, role],
    );
    return Number(result.rows[0]?.count ?? 0);
  }
}

export class PostgresInvitationRepository implements InvitationRepository {
  constructor(private readonly pool: Pool) {}

  async create(invitation: OrganizationInvitation): Promise<void> {
    await getPgExecutor(this.pool).query(
      `INSERT INTO organization_invitations (
         id, organization_id, competition_id, role, token_hash, email, status,
         invited_by_actor_id, expires_at, accepted_by_actor_id, created_at,
         redeem_policy, max_redemptions, redeemed_count
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        invitation.id,
        invitation.organizationId,
        invitation.competitionId ?? null,
        invitation.role,
        invitation.tokenHash,
        invitation.email ?? null,
        invitation.status,
        invitation.invitedByActorId,
        invitation.expiresAt.toISOString(),
        invitation.acceptedByActorId ?? null,
        invitation.createdAt.toISOString(),
        invitation.redeemPolicy,
        invitation.maxRedemptions,
        invitation.redeemedCount,
      ],
    );
  }

  async findByTokenHash(tokenHash: string): Promise<OrganizationInvitation | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT ${INVITATION_COLUMNS}
       FROM organization_invitations WHERE token_hash = $1`,
      [tokenHash],
    );
    const row = result.rows[0] as InvitationRow | undefined;
    return row ? rehydrateInvitation(row) : null;
  }

  async hasRedemption(invitationId: string, actorId: ActorId): Promise<boolean> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT 1
       FROM organization_invitation_redemptions
       WHERE invitation_id = $1 AND actor_id = $2
       LIMIT 1`,
      [invitationId, actorId],
    );
    return result.rowCount === 1;
  }

  async update(invitation: OrganizationInvitation): Promise<void> {
    await getPgExecutor(this.pool).query(
      `UPDATE organization_invitations
       SET status = $2,
           accepted_by_actor_id = $3,
           email = $4
       WHERE id = $1`,
      [
        invitation.id,
        invitation.status,
        invitation.acceptedByActorId ?? null,
        invitation.email ?? null,
      ],
    );
  }

  async claimPending(
    tokenHash: string,
    actorId: ActorId,
    now: Date,
  ): Promise<OrganizationInvitation | null> {
    const result = await getPgExecutor(this.pool).query(
      `UPDATE organization_invitations
       SET status = $4,
           accepted_by_actor_id = $2
       WHERE token_hash = $1
         AND status = $5
         AND expires_at > $3
       RETURNING ${INVITATION_COLUMNS}`,
      [
        tokenHash,
        actorId,
        now.toISOString(),
        INVITATION_STATUS.accepted,
        INVITATION_STATUS.pending,
      ],
    );
    const row = result.rows[0] as InvitationRow | undefined;
    return row ? rehydrateInvitation(row) : null;
  }

  async claimRedemption(
    tokenHash: string,
    actorId: ActorId,
    now: Date,
  ): Promise<MultiRedemptionClaim | null> {
    const result = await getPgExecutor(this.pool).query(
      `WITH invite AS (
         SELECT id, organization_id, competition_id, role, token_hash, email, status,
                invited_by_actor_id, expires_at, accepted_by_actor_id, created_at,
                redeem_policy, max_redemptions, redeemed_count
         FROM organization_invitations
         WHERE token_hash = $1
           AND redeem_policy = $4
           AND status = $5
           AND expires_at > $3
         FOR UPDATE
       ),
       ins AS (
         INSERT INTO organization_invitation_redemptions (invitation_id, actor_id, created_at)
         SELECT id, $2, $3 FROM invite WHERE redeemed_count < max_redemptions
         ON CONFLICT (invitation_id, actor_id) DO NOTHING
         RETURNING invitation_id
       ),
       bumped AS (
         UPDATE organization_invitations o
         SET redeemed_count = redeemed_count + 1
         FROM ins
         WHERE o.id = ins.invitation_id
         RETURNING o.id
       )
       SELECT
         invite.id, invite.organization_id, invite.competition_id, invite.role,
         invite.token_hash, invite.email, invite.status, invite.invited_by_actor_id,
         invite.expires_at, invite.accepted_by_actor_id, invite.created_at,
         invite.redeem_policy, invite.max_redemptions,
         invite.redeemed_count + (CASE WHEN bumped.id IS NOT NULL THEN 1 ELSE 0 END)
           AS redeemed_count,
         (bumped.id IS NOT NULL) AS newly_claimed
       FROM invite
       LEFT JOIN bumped ON bumped.id = invite.id`,
      [tokenHash, actorId, now.toISOString(), REDEEM_POLICY.multi, INVITATION_STATUS.pending],
    );
    const row = result.rows[0] as (InvitationRow & { newly_claimed: boolean }) | undefined;
    if (!row) return null;
    if (!row.newly_claimed) {
      const alreadyRedeemed = await this.hasRedemption(row.id, actorId);
      if (!alreadyRedeemed) return null;
      return {
        invitation: rehydrateInvitation(row),
        outcome: "already-redeemed",
      };
    }
    return {
      invitation: rehydrateInvitation(row),
      outcome: "claimed",
    };
  }
}
