import {
  asActorId,
  asOrganizationId,
  type ActorId,
  type OrganizationId,
} from "@futrob/shared-kernel";
import type { Organization } from "../domain/entities/organization.ts";
import type { OrganizationInvitation } from "../domain/entities/organization-invitation.ts";
import type { OrganizationMembership } from "../domain/entities/organization-membership.ts";
import type { ClockPort } from "../domain/ports/clock.port.ts";
import type { IdGeneratorPort } from "../domain/ports/id-generator.port.ts";
import type { InvitationRepository } from "../domain/ports/invitation.repository.ts";
import type { MembershipRepository } from "../domain/ports/membership.repository.ts";
import type { OrganizationRepository } from "../domain/ports/organization.repository.ts";
import type { TokenPort } from "../domain/ports/token.port.ts";
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
  private orgSeq = 0;
  private inviteSeq = 0;

  organizationId(): OrganizationId {
    this.orgSeq += 1;
    return asOrganizationId(`org-${this.orgSeq}`);
  }

  invitationId(): string {
    this.inviteSeq += 1;
    return `invite-${this.inviteSeq}`;
  }
}

export class FakeTokens implements TokenPort {
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

  async create(organization: Organization): Promise<void> {
    this.byId.set(organization.id, organization);
  }

  async getById(id: OrganizationId): Promise<Organization | null> {
    return this.byId.get(id) ?? null;
  }
}

export class FakeMembershipRepository implements MembershipRepository {
  readonly rows: OrganizationMembership[] = [];

  constructor(private readonly organizations: FakeOrganizationRepository) {}

  async add(membership: OrganizationMembership): Promise<void> {
    this.rows.push(membership);
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
}

export class FakeInvitationRepository implements InvitationRepository {
  readonly byHash = new Map<string, OrganizationInvitation>();

  async create(invitation: OrganizationInvitation): Promise<void> {
    this.byHash.set(invitation.tokenHash, invitation);
  }

  async findByTokenHash(tokenHash: string): Promise<OrganizationInvitation | null> {
    return this.byHash.get(tokenHash) ?? null;
  }

  async update(invitation: OrganizationInvitation): Promise<void> {
    this.byHash.set(invitation.tokenHash, invitation);
  }
}

export function createOrgTestHarness() {
  const clock = new FakeClock();
  const ids = new FakeIds();
  const tokens = new FakeTokens();
  const organizations = new FakeOrganizationRepository();
  const memberships = new FakeMembershipRepository(organizations);
  const invitations = new FakeInvitationRepository();

  return {
    clock,
    ids,
    tokens,
    organizations,
    memberships,
    invitations,
    actor: (value: string) => asActorId(value),
  };
}
