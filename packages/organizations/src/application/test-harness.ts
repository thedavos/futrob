import {
  asActorId,
  type ActorId,
  type ClockPort,
  type IdGeneratorPort,
  type OrganizationId,
  type AuthorizationPort,
  type AuthorizationRequest,
  type EffectiveAccess,
} from "@futrob/shared-kernel";
import type { Organization } from "../domain/entities/organization.ts";
import {
  INVITATION_STATUS,
  REDEEM_POLICY,
  type OrganizationInvitation,
} from "../domain/entities/organization-invitation.ts";
import type { OrganizationMembership } from "../domain/entities/organization-membership.ts";
import type {
  InvitationRepository,
  MultiRedemptionClaim,
} from "../domain/ports/invitation.repository.ts";
import type { InvitationTokenPort } from "../domain/ports/invitation-token.port.ts";
import type { MembershipRepository } from "../domain/ports/membership.repository.ts";
import type { OrganizationRepository } from "../domain/ports/organization.repository.ts";
import type { MembershipSummary } from "../domain/value-objects/post-auth-destination.ts";

export class FakeClock implements ClockPort {
  constructor(private current: Date = new Date("2026-01-15T12:00:00.000Z")) {}

  now(): Date {
    return new Date(this.current.getTime());
  }

  advanceMs(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

export class FakeIds implements IdGeneratorPort {
  private sequence = 0;

  generate(): string {
    this.sequence += 1;
    return `id-${this.sequence}`;
  }
}

export class FakeTokens implements InvitationTokenPort {
  private seq = 0;

  generatePlainToken(): string {
    this.seq += 1;
    return `plain-token-${this.seq}`;
  }

  hashToken(token: string): string {
    return `hash:${token}`;
  }
}

export class FakeOrganizationRepository implements OrganizationRepository {
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

export class FakeMembershipRepository implements MembershipRepository {
  readonly rows: OrganizationMembership[] = [];

  constructor(private readonly organizations: FakeOrganizationRepository) {}

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
    return this.updateRole(membership);
  }

  async countByRole(organizationId: OrganizationId, role: "organizer"): Promise<number> {
    return this.rows.filter((row) => row.organizationId === organizationId && row.role === role)
      .length;
  }
}

export class FakeInvitationRepository implements InvitationRepository {
  readonly byHash = new Map<string, OrganizationInvitation>();
  readonly redemptionsByInvitationId = new Map<string, Set<ActorId>>();
  /** Yields before CAS so tests can overlap two accept calls that both saw pending. */
  beforeClaim: (() => Promise<void>) | null = null;
  /** Yields before the multi CAS so tests can overlap concurrent redemptions. */
  beforeRedeem: (() => Promise<void>) | null = null;

  async create(invitation: OrganizationInvitation): Promise<void> {
    this.byHash.set(invitation.tokenHash, invitation);
  }

  async findByTokenHash(tokenHash: string): Promise<OrganizationInvitation | null> {
    return this.byHash.get(tokenHash) ?? null;
  }

  async update(invitation: OrganizationInvitation): Promise<void> {
    this.byHash.set(invitation.tokenHash, invitation);
  }

  async claimPending(
    tokenHash: string,
    actorId: ActorId,
    now: Date,
  ): Promise<OrganizationInvitation | null> {
    if (this.beforeClaim) {
      await this.beforeClaim();
    }
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

  async claimRedemption(
    tokenHash: string,
    actorId: ActorId,
    now: Date,
  ): Promise<MultiRedemptionClaim | null> {
    if (this.beforeRedeem) {
      await this.beforeRedeem();
    }
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

export function createOrgTestHarness() {
  const clock = new FakeClock();
  const ids = new FakeIds();
  const tokens = new FakeTokens();
  const organizations = new FakeOrganizationRepository();
  const memberships = new FakeMembershipRepository(organizations);
  const invitations = new FakeInvitationRepository();
  const authorization: AuthorizationPort = {
    async decide(request: AuthorizationRequest) {
      const membership = request.scope.organizationId
        ? await memberships.findByOrgAndActor(request.scope.organizationId, request.actorId)
        : null;
      const allowed = membership?.role === "organizer" || membership?.role === "staff";
      return {
        allowed,
        permission: request.permission,
        scope: request.scope,
        reason: allowed ? "allowed" : "no-assignment",
      };
    },
    async getEffectiveAccess(input): Promise<EffectiveAccess> {
      return { actorId: input.actorId, scope: input.scope, roles: [], permissions: [] };
    },
  };

  return {
    clock,
    ids,
    tokens,
    organizations,
    memberships,
    invitations,
    authorization,
    actor: (value: string) => asActorId(value),
  };
}
