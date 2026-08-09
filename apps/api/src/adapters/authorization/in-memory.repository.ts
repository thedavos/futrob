import type {
  AccessGrant,
  AccessGrantRepository,
  AuthorizationAuditEntry,
  AuthorizationAuditRepository,
  PlatformRoleAssignment,
  PlatformRoleRepository,
} from "@futrob/organizations";
import type {
  ActorId,
  AuthorizationScopeType,
  OrganizationId,
  Permission,
  AuthorizationMutationLockPort,
} from "@futrob/shared-kernel";

export class InMemoryAccessGrantRepository implements AccessGrantRepository {
  readonly rows = new Map<string, AccessGrant>();

  async findById(organizationId: OrganizationId | null, id: string): Promise<AccessGrant | null> {
    const row = this.rows.get(id);
    return row?.organizationId === organizationId ? row : null;
  }

  async findByKey(input: {
    readonly organizationId: OrganizationId | null;
    readonly actorId: ActorId;
    readonly permission: Permission;
    readonly scopeType: AuthorizationScopeType;
    readonly scopeId: string;
  }): Promise<AccessGrant | null> {
    return (
      [...this.rows.values()].find(
        (row) =>
          row.organizationId === input.organizationId &&
          row.actorId === input.actorId &&
          row.permission === input.permission &&
          row.scopeType === input.scopeType &&
          row.scopeId === input.scopeId,
      ) ?? null
    );
  }

  async listForActorAndScopes(
    actorId: ActorId,
    organizationId: OrganizationId | null,
    scopes: readonly { readonly scopeType: AuthorizationScopeType; readonly scopeId: string }[],
  ): Promise<readonly AccessGrant[]> {
    const keys = new Set(scopes.map((scope) => `${scope.scopeType}:${scope.scopeId}`));
    return [...this.rows.values()].filter(
      (row) =>
        row.actorId === actorId &&
        (row.organizationId === organizationId ||
          (row.organizationId === null && row.scopeType === "platform")) &&
        keys.has(`${row.scopeType}:${row.scopeId}`),
    );
  }

  async listForScope(
    organizationId: OrganizationId | null,
    scopeType: AuthorizationScopeType,
    scopeId: string,
    actorId?: ActorId,
  ): Promise<readonly AccessGrant[]> {
    return [...this.rows.values()].filter(
      (row) =>
        row.organizationId === organizationId &&
        row.scopeType === scopeType &&
        row.scopeId === scopeId &&
        (!actorId || row.actorId === actorId),
    );
  }

  async upsert(grant: AccessGrant): Promise<AccessGrant> {
    const existing = await this.findByKey(grant);
    const saved = existing ? { ...grant, id: existing.id, createdAt: existing.createdAt } : grant;
    this.rows.set(saved.id, saved);
    return saved;
  }

  async delete(organizationId: OrganizationId | null, id: string): Promise<boolean> {
    const row = this.rows.get(id);
    return row?.organizationId === organizationId ? this.rows.delete(id) : false;
  }
}

export class InMemoryAuthorizationMutationLock implements AuthorizationMutationLockPort {
  private readonly tails = new Map<string, Promise<void>>();

  async runWithActors<T>(
    organizationId: OrganizationId | null,
    actorIds: readonly ActorId[],
    operation: () => Promise<T>,
  ): Promise<T> {
    const releases: Array<() => void> = [];
    const keys = [...new Set(actorIds)]
      .sort()
      .map((actorId) => `${organizationId ?? "platform"}:${actorId}`);
    try {
      for (const key of keys) releases.push(await this.acquire(key));
      return await operation();
    } finally {
      for (const release of releases.reverse()) release();
    }
  }

  private async acquire(key: string): Promise<() => void> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    let release!: () => void;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => hold);
    this.tails.set(key, tail);
    await previous;
    return () => {
      release();
      if (this.tails.get(key) === tail) this.tails.delete(key);
    };
  }
}

export class InMemoryPlatformRoleRepository implements PlatformRoleRepository {
  readonly rows = new Map<ActorId, PlatformRoleAssignment>();

  async findSuperuser(actorId: ActorId): Promise<PlatformRoleAssignment | null> {
    return this.rows.get(actorId) ?? null;
  }

  async countSuperusers(): Promise<number> {
    return this.rows.size;
  }

  async assignInitialSuperuserIfEmpty(
    assignment: PlatformRoleAssignment,
  ): Promise<PlatformRoleAssignment | null> {
    if (this.rows.size > 0) return null;
    this.rows.set(assignment.actorId, assignment);
    return assignment;
  }

  async assignSuperuser(assignment: PlatformRoleAssignment): Promise<PlatformRoleAssignment> {
    const existing = this.rows.get(assignment.actorId);
    if (existing) return existing;
    this.rows.set(assignment.actorId, assignment);
    return assignment;
  }

  async revokeSuperuser(actorId: ActorId): Promise<boolean> {
    return this.rows.delete(actorId);
  }

  async revokeSuperuserProtectingLast(
    actorId: ActorId,
  ): Promise<"revoked" | "not-found" | "last-superuser"> {
    if (!this.rows.has(actorId)) return "not-found";
    if (this.rows.size <= 1) return "last-superuser";
    this.rows.delete(actorId);
    return "revoked";
  }
}

export class InMemoryAuthorizationAuditRepository implements AuthorizationAuditRepository {
  readonly rows: AuthorizationAuditEntry[] = [];

  async append(entry: AuthorizationAuditEntry): Promise<void> {
    this.rows.push(entry);
  }

  async listByOrganization(
    organizationId: OrganizationId,
    limit: number,
  ): Promise<readonly AuthorizationAuditEntry[]> {
    return this.rows
      .filter((row) => row.organizationId === organizationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}

export function createInMemoryAuthorizationStore() {
  return {
    grants: new InMemoryAccessGrantRepository(),
    platformRoles: new InMemoryPlatformRoleRepository(),
    audit: new InMemoryAuthorizationAuditRepository(),
    mutationLock: new InMemoryAuthorizationMutationLock(),
  };
}
