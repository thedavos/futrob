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
}

export class InMemoryInvitationRepository implements InvitationRepository {
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

export function rehydrateInvitation(row: {
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
}): OrganizationInvitation {
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
  };
}
