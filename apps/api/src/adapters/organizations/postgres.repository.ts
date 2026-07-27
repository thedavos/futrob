import {
  asActorId,
  asOrganizationId,
  type ActorId,
  type OrganizationId,
} from "@futrob/shared-kernel";
import type {
  InvitationRepository,
  MembershipRepository,
  MembershipSummary,
  Organization,
  OrganizationInvitation,
  OrganizationMembership,
  OrganizationRepository,
  OrgMembershipRole,
} from "@futrob/organizations";
import type { Pool } from "pg";
import {
  rehydrateInvitation,
  rehydrateMembership,
  rehydrateOrganization,
} from "./in-memory.repository.ts";

export class PostgresOrganizationRepository implements OrganizationRepository {
  constructor(private readonly pool: Pool) {}

  async create(organization: Organization): Promise<void> {
    await this.pool.query(
      `INSERT INTO organizations (id, name, created_at, created_by_actor_id)
       VALUES ($1, $2, $3, $4)`,
      [
        organization.id,
        organization.name,
        organization.createdAt.toISOString(),
        organization.createdByActorId,
      ],
    );
  }

  async getById(id: OrganizationId): Promise<Organization | null> {
    const result = await this.pool.query(
      `SELECT id, name, created_at, created_by_actor_id
       FROM organizations WHERE id = $1`,
      [id],
    );
    const row = result.rows[0] as
      | {
          id: string;
          name: string;
          created_at: Date;
          created_by_actor_id: string;
        }
      | undefined;
    return row ? rehydrateOrganization(row) : null;
  }
}

export class PostgresMembershipRepository implements MembershipRepository {
  constructor(private readonly pool: Pool) {}

  async add(membership: OrganizationMembership): Promise<void> {
    await this.pool.query(
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
    const result = await this.pool.query(
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
    const result = await this.pool.query(
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
}

export class PostgresInvitationRepository implements InvitationRepository {
  constructor(private readonly pool: Pool) {}

  async create(invitation: OrganizationInvitation): Promise<void> {
    await this.pool.query(
      `INSERT INTO organization_invitations (
         id, organization_id, role, token_hash, email, status,
         invited_by_actor_id, expires_at, accepted_by_actor_id, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        invitation.id,
        invitation.organizationId,
        invitation.role,
        invitation.tokenHash,
        invitation.email ?? null,
        invitation.status,
        invitation.invitedByActorId,
        invitation.expiresAt.toISOString(),
        invitation.acceptedByActorId ?? null,
        invitation.createdAt.toISOString(),
      ],
    );
  }

  async findByTokenHash(tokenHash: string): Promise<OrganizationInvitation | null> {
    const result = await this.pool.query(
      `SELECT id, organization_id, role, token_hash, email, status,
              invited_by_actor_id, expires_at, accepted_by_actor_id, created_at
       FROM organization_invitations WHERE token_hash = $1`,
      [tokenHash],
    );
    const row = result.rows[0] as
      | {
          id: string;
          organization_id: string;
          role: string;
          token_hash: string;
          email: string | null;
          status: string;
          invited_by_actor_id: string;
          expires_at: Date;
          accepted_by_actor_id: string | null;
          created_at: Date;
        }
      | undefined;
    return row ? rehydrateInvitation(row) : null;
  }

  async update(invitation: OrganizationInvitation): Promise<void> {
    await this.pool.query(
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
}
