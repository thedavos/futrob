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
import type { ActorId, OrganizationId } from "@futrob/shared-kernel";
import { asActorId, asCompetitionId, asOrganizationId } from "@futrob/shared-kernel";

export class InMemoryOrganizationRepository implements OrganizationRepository {
  readonly byId = new Map<string, Organization>();

  async create(organization: Organization): Promise<Organization | null> {
    const existing = organization.creationKey
      ? await this.getByCreationKey(organization.creationKey)
      : null;
    if (existing) return existing;
    if (await this.getByNormalizedName(organization.normalizedName)) return null;
    this.byId.set(organization.id, organization);
    return organization;
  }

  async getById(id: OrganizationId): Promise<Organization | null> {
    return this.byId.get(id) ?? null;
  }

  async getByCreationKey(creationKey: string): Promise<Organization | null> {
    return [...this.byId.values()].find((row) => row.creationKey === creationKey) ?? null;
  }

  async getByNormalizedName(normalizedName: string): Promise<Organization | null> {
    return [...this.byId.values()].find((row) => row.normalizedName === normalizedName) ?? null;
  }
}

export class InMemoryMembershipRepository implements MembershipRepository {
  readonly rows: OrganizationMembership[] = [];

  constructor(private readonly organizations: InMemoryOrganizationRepository) {}

  async add(membership: OrganizationMembership): Promise<void> {
    if (
      !this.rows.some(
        (row) =>
          row.organizationId === membership.organizationId && row.actorId === membership.actorId,
      )
    ) {
      this.rows.push(membership);
    }
  }

  async findByActor(actorId: ActorId): Promise<MembershipSummary[]> {
    return this.rows
      .filter((row) => row.actorId === actorId)
      .map((row) => {
        const org = this.organizations.byId.get(row.organizationId);
        return {
          organizationId: row.organizationId,
          organizationName: org?.name ?? "unknown",
          role: row.role,
        };
      });
  }

  async findByOrgAndActor(
    organizationId: OrganizationId,
    actorId: ActorId,
  ): Promise<OrganizationMembership | null> {
    return (
      this.rows.find((row) => row.organizationId === organizationId && row.actorId === actorId) ??
      null
    );
  }

  async updateRole(membership: OrganizationMembership): Promise<OrganizationMembership> {
    const index = this.rows.findIndex(
      (row) =>
        row.organizationId === membership.organizationId && row.actorId === membership.actorId,
    );
    if (index >= 0) this.rows[index] = membership;
    return membership;
  }

  async updateRoleProtectingLastOrganizer(
    membership: OrganizationMembership,
  ): Promise<OrganizationMembership | null> {
    const current = this.rows.find(
      (row) =>
        row.organizationId === membership.organizationId && row.actorId === membership.actorId,
    );
    if (
      current?.role === "organizer" &&
      membership.role !== "organizer" &&
      this.rows.filter(
        (row) => row.organizationId === membership.organizationId && row.role === "organizer",
      ).length <= 1
    ) {
      return null;
    }
    const index = this.rows.findIndex(
      (row) =>
        row.organizationId === membership.organizationId && row.actorId === membership.actorId,
    );
    if (index >= 0) this.rows[index] = membership;
    return membership;
  }

  async countByRole(organizationId: OrganizationId, role: "organizer"): Promise<number> {
    return this.rows.filter((row) => row.organizationId === organizationId && row.role === role)
      .length;
  }
}

export class InMemoryInvitationRepository implements InvitationRepository {
  readonly byHash = new Map<string, OrganizationInvitation>();
  readonly redemptionsByInvitationId = new Map<string, Set<ActorId>>();

  async create(invitation: OrganizationInvitation): Promise<void> {
    this.byHash.set(invitation.tokenHash, invitation);
  }

  async findByTokenHash(tokenHash: string): Promise<OrganizationInvitation | null> {
    return this.byHash.get(tokenHash) ?? null;
  }

  async hasRedemption(invitationId: string, actorId: ActorId): Promise<boolean> {
    return this.redemptionsByInvitationId.get(invitationId)?.has(actorId) ?? false;
  }

  async update(invitation: OrganizationInvitation): Promise<void> {
    this.byHash.set(invitation.tokenHash, invitation);
  }

  async claimPending(
    tokenHash: string,
    actorId: ActorId,
    now: Date,
  ): Promise<OrganizationInvitation | null> {
    const current = this.byHash.get(tokenHash);
    if (!current) return null;
    if (current.status !== INVITATION_STATUS.pending) return null;
    if (current.expiresAt.getTime() <= now.getTime()) return null;
    const accepted: OrganizationInvitation = {
      ...current,
      status: INVITATION_STATUS.accepted,
      acceptedByActorId: actorId,
    };
    this.byHash.set(tokenHash, accepted);
    return accepted;
  }

  /**
   * Mirrors `PostgresInvitationRepository.claimRedemption`'s CAS semantics:
   * per-actor idempotency via the redemption set, cupo guarded by
   * `maxRedemptions`, never exceeded even under interleaved concurrent calls
   * (JS run-to-completion between awaits gives us the same guarantee the
   * Postgres row lock + guarded UPDATE gives in production).
   */
  async claimRedemption(
    tokenHash: string,
    actorId: ActorId,
    now: Date,
  ): Promise<MultiRedemptionClaim | null> {
    const current = this.byHash.get(tokenHash);
    if (!current) return null;
    if (current.redeemPolicy !== REDEEM_POLICY.multi) return null;
    if (current.status !== INVITATION_STATUS.pending) return null;
    if (current.expiresAt.getTime() <= now.getTime()) return null;

    const redeemers = this.redemptionsByInvitationId.get(current.id) ?? new Set<ActorId>();
    if (redeemers.has(actorId)) {
      return { invitation: current, outcome: "already-redeemed" };
    }
    if (current.maxRedemptions === null || current.redeemedCount >= current.maxRedemptions) {
      return null;
    }

    redeemers.add(actorId);
    this.redemptionsByInvitationId.set(current.id, redeemers);
    const updated: OrganizationInvitation = {
      ...current,
      redeemedCount: current.redeemedCount + 1,
    };
    this.byHash.set(tokenHash, updated);
    return { invitation: updated, outcome: "claimed" };
  }
}

/** Shared in-memory store used when DATABASE_URL is unset (local/dev/tests). */
export function createInMemoryOrganizationStore() {
  const organizations = new InMemoryOrganizationRepository();
  const memberships = new InMemoryMembershipRepository(organizations);
  const invitations = new InMemoryInvitationRepository();
  return { organizations, memberships, invitations };
}

export function rehydrateOrganization(row: {
  id: string;
  name: string;
  normalized_name?: string;
  created_at: Date | string;
  created_by_actor_id: string;
  creation_key?: string | null;
}): Organization {
  return {
    id: asOrganizationId(row.id),
    name: row.name,
    normalizedName: row.normalized_name ?? row.name.trim().toLocaleLowerCase("es"),
    createdAt: new Date(row.created_at),
    createdByActorId: asActorId(row.created_by_actor_id),
    creationKey: row.creation_key ?? undefined,
  };
}

export function rehydrateMembership(row: {
  organization_id: string;
  actor_id: string;
  role: string;
  created_at: Date | string;
}): OrganizationMembership {
  return {
    organizationId: asOrganizationId(row.organization_id),
    actorId: asActorId(row.actor_id),
    role: row.role as OrgMembershipRole,
    createdAt: new Date(row.created_at),
  };
}

/** Column list shared by every `organization_invitations` SELECT/RETURNING clause. */
export const INVITATION_COLUMNS = `id, organization_id, competition_id, role, token_hash, email, status,
              invited_by_actor_id, expires_at, accepted_by_actor_id, created_at,
              redeem_policy, max_redemptions, redeemed_count`;

export interface InvitationRow {
  id: string;
  organization_id: string;
  competition_id?: string | null;
  role: string;
  token_hash: string;
  email: string | null;
  status: string;
  invited_by_actor_id: string;
  expires_at: Date | string;
  accepted_by_actor_id: string | null;
  created_at: Date | string;
  redeem_policy: string;
  max_redemptions: number | null;
  redeemed_count: number;
}

export function rehydrateInvitation(row: InvitationRow): OrganizationInvitation {
  return {
    id: row.id,
    organizationId: asOrganizationId(row.organization_id),
    competitionId: row.competition_id ? asCompetitionId(row.competition_id) : null,
    role: row.role as OrganizationInvitation["role"],
    tokenHash: row.token_hash,
    email: row.email,
    status: row.status as OrganizationInvitation["status"],
    invitedByActorId: asActorId(row.invited_by_actor_id),
    expiresAt: new Date(row.expires_at),
    acceptedByActorId: row.accepted_by_actor_id ? asActorId(row.accepted_by_actor_id) : null,
    createdAt: new Date(row.created_at),
    redeemPolicy: row.redeem_policy as OrganizationInvitation["redeemPolicy"],
    maxRedemptions: row.max_redemptions,
    redeemedCount: row.redeemed_count,
  };
}
