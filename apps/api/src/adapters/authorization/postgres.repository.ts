import type {
  AccessGrant,
  AccessGrantRepository,
  AuthorizationAuditEntry,
  AuthorizationAuditRepository,
  GrantEffect,
  PlatformRoleAssignment,
  PlatformRoleRepository,
} from "@futrob/organizations";
import {
  asActorId,
  asOrganizationId,
  type ActorId,
  type AuthorizationScopeType,
  type OrganizationId,
  type Permission,
  type AuthorizationMutationLockPort,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

export class PostgresAccessGrantRepository implements AccessGrantRepository {
  constructor(private readonly pool: Pool) {}

  async findById(organizationId: OrganizationId | null, id: string): Promise<AccessGrant | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, organization_id, actor_id, permission, effect, scope_type, scope_id,
              granted_by_actor_id, reason, created_at, updated_at
       FROM authorization_grants
       WHERE organization_id IS NOT DISTINCT FROM $1 AND id = $2`,
      [organizationId, id],
    );
    return result.rows[0] ? rehydrateGrant(result.rows[0]) : null;
  }

  async findByKey(input: {
    readonly organizationId: OrganizationId | null;
    readonly actorId: ActorId;
    readonly permission: Permission;
    readonly scopeType: AuthorizationScopeType;
    readonly scopeId: string;
  }): Promise<AccessGrant | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, organization_id, actor_id, permission, effect, scope_type, scope_id,
              granted_by_actor_id, reason, created_at, updated_at
       FROM authorization_grants
       WHERE organization_id IS NOT DISTINCT FROM $1
         AND actor_id = $2 AND permission = $3 AND scope_type = $4 AND scope_id = $5`,
      [input.organizationId, input.actorId, input.permission, input.scopeType, input.scopeId],
    );
    return result.rows[0] ? rehydrateGrant(result.rows[0]) : null;
  }

  async listForActorAndScopes(
    actorId: ActorId,
    organizationId: OrganizationId | null,
    scopes: readonly { readonly scopeType: AuthorizationScopeType; readonly scopeId: string }[],
  ): Promise<readonly AccessGrant[]> {
    if (scopes.length === 0) return [];
    const scopeTypes = scopes.map((scope) => scope.scopeType);
    const scopeIds = scopes.map((scope) => scope.scopeId);
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, organization_id, actor_id, permission, effect, scope_type, scope_id,
              granted_by_actor_id, reason, created_at, updated_at
       FROM authorization_grants
       WHERE actor_id = $1
         AND (
           organization_id IS NOT DISTINCT FROM $2
           OR (organization_id IS NULL AND scope_type = 'platform')
         )
         AND (scope_type, scope_id) IN (
           SELECT * FROM UNNEST($3::text[], $4::text[])
         )`,
      [actorId, organizationId, scopeTypes, scopeIds],
    );
    return result.rows.map(rehydrateGrant);
  }

  async listForScope(
    organizationId: OrganizationId | null,
    scopeType: AuthorizationScopeType,
    scopeId: string,
    actorId?: ActorId,
  ): Promise<readonly AccessGrant[]> {
    const values: unknown[] = [organizationId, scopeType, scopeId];
    const actorFilter = actorId ? " AND actor_id = $4" : "";
    if (actorId) values.push(actorId);
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, organization_id, actor_id, permission, effect, scope_type, scope_id,
              granted_by_actor_id, reason, created_at, updated_at
       FROM authorization_grants
       WHERE organization_id IS NOT DISTINCT FROM $1
         AND scope_type = $2 AND scope_id = $3${actorFilter}
       ORDER BY actor_id, permission`,
      values,
    );
    return result.rows.map(rehydrateGrant);
  }

  async upsert(grant: AccessGrant): Promise<AccessGrant> {
    const result = await getPgExecutor(this.pool).query(
      `INSERT INTO authorization_grants (
         id, organization_id, actor_id, permission, effect, scope_type, scope_id,
         granted_by_actor_id, reason, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (organization_id, actor_id, permission, scope_type, scope_id) DO UPDATE
       SET effect = EXCLUDED.effect,
           granted_by_actor_id = EXCLUDED.granted_by_actor_id,
           reason = EXCLUDED.reason,
           updated_at = EXCLUDED.updated_at
       RETURNING id, organization_id, actor_id, permission, effect, scope_type, scope_id,
                 granted_by_actor_id, reason, created_at, updated_at`,
      [
        grant.id,
        grant.organizationId,
        grant.actorId,
        grant.permission,
        grant.effect,
        grant.scopeType,
        grant.scopeId,
        grant.grantedByActorId,
        grant.reason,
        grant.createdAt.toISOString(),
        grant.updatedAt.toISOString(),
      ],
    );
    return rehydrateGrant(result.rows[0]);
  }

  async delete(organizationId: OrganizationId | null, id: string): Promise<boolean> {
    const result = await getPgExecutor(this.pool).query(
      `DELETE FROM authorization_grants
       WHERE organization_id IS NOT DISTINCT FROM $1 AND id = $2 RETURNING id`,
      [organizationId, id],
    );
    return result.rowCount === 1;
  }
}

export class PostgresAuthorizationMutationLock implements AuthorizationMutationLockPort {
  constructor(private readonly pool: Pool) {}

  async runWithActors<T>(
    organizationId: OrganizationId | null,
    actorIds: readonly ActorId[],
    operation: () => Promise<T>,
  ): Promise<T> {
    for (const actorId of [...new Set(actorIds)].sort()) {
      await getPgExecutor(this.pool).query(
        `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
        [`authorization:${organizationId ?? "platform"}:${actorId}`],
      );
    }
    return operation();
  }
}

export class PostgresPlatformRoleRepository implements PlatformRoleRepository {
  constructor(private readonly pool: Pool) {}

  async findSuperuser(actorId: ActorId): Promise<PlatformRoleAssignment | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT actor_id, role, assigned_by_actor_id, created_at
       FROM platform_role_assignments WHERE actor_id = $1 AND role = 'superuser'`,
      [actorId],
    );
    return result.rows[0] ? rehydratePlatformRole(result.rows[0]) : null;
  }

  async countSuperusers(): Promise<number> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT COUNT(*)::int AS count FROM platform_role_assignments WHERE role = 'superuser'`,
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async assignInitialSuperuserIfEmpty(
    assignment: PlatformRoleAssignment,
  ): Promise<PlatformRoleAssignment | null> {
    const executor = getPgExecutor(this.pool);
    await executor.query(
      `SELECT pg_advisory_xact_lock(hashtextextended('platform-superusers', 0))`,
    );
    if ((await this.countSuperusers()) > 0) return null;
    return this.assignSuperuser(assignment);
  }

  async assignSuperuser(assignment: PlatformRoleAssignment): Promise<PlatformRoleAssignment> {
    const result = await getPgExecutor(this.pool).query(
      `INSERT INTO platform_role_assignments (actor_id, role, assigned_by_actor_id, created_at)
       VALUES ($1, 'superuser', $2, $3)
       ON CONFLICT (actor_id) DO UPDATE SET role = EXCLUDED.role
       RETURNING actor_id, role, assigned_by_actor_id, created_at`,
      [assignment.actorId, assignment.assignedByActorId, assignment.createdAt.toISOString()],
    );
    return rehydratePlatformRole(result.rows[0]);
  }

  async revokeSuperuser(actorId: ActorId): Promise<boolean> {
    const result = await getPgExecutor(this.pool).query(
      `DELETE FROM platform_role_assignments WHERE actor_id = $1 RETURNING actor_id`,
      [actorId],
    );
    return result.rowCount === 1;
  }

  async revokeSuperuserProtectingLast(
    actorId: ActorId,
  ): Promise<"revoked" | "not-found" | "last-superuser"> {
    const executor = getPgExecutor(this.pool);
    await executor.query(
      `SELECT pg_advisory_xact_lock(hashtextextended('platform-superusers', 0))`,
    );
    const current = await this.findSuperuser(actorId);
    if (!current) return "not-found";
    if ((await this.countSuperusers()) <= 1) return "last-superuser";
    const deleted = await this.revokeSuperuser(actorId);
    return deleted ? "revoked" : "not-found";
  }
}

export class PostgresAuthorizationAuditRepository implements AuthorizationAuditRepository {
  constructor(private readonly pool: Pool) {}

  async append(entry: AuthorizationAuditEntry): Promise<void> {
    await getPgExecutor(this.pool).query(
      `INSERT INTO authorization_audit_log (
         id, actor_id, action, target_actor_id, organization_id, scope_type, scope_id,
         permission, before_value, after_value, reason, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12)`,
      [
        entry.id,
        entry.actorId,
        entry.action,
        entry.targetActorId,
        entry.organizationId,
        entry.scopeType,
        entry.scopeId,
        entry.permission,
        entry.before === null ? null : JSON.stringify(entry.before),
        entry.after === null ? null : JSON.stringify(entry.after),
        entry.reason,
        entry.createdAt.toISOString(),
      ],
    );
  }

  async listByOrganization(
    organizationId: OrganizationId,
    limit: number,
  ): Promise<readonly AuthorizationAuditEntry[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, actor_id, action, target_actor_id, organization_id, scope_type, scope_id,
              permission, before_value, after_value, reason, created_at
       FROM authorization_audit_log
       WHERE organization_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [organizationId, limit],
    );
    return result.rows.map(rehydrateAuditEntry);
  }
}

export interface AccessGrantRow {
  id: string;
  organization_id: string | null;
  actor_id: string;
  permission: string;
  effect: string;
  scope_type: string;
  scope_id: string;
  granted_by_actor_id: string;
  reason: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface PlatformRoleRow {
  actor_id: string;
  assigned_by_actor_id: string;
  created_at: Date | string;
}

export interface AuthorizationAuditRow {
  id: string;
  actor_id: string;
  action: string;
  target_actor_id: string;
  organization_id: string | null;
  scope_type: string;
  scope_id: string;
  permission: string | null;
  before_value: unknown;
  after_value: unknown;
  reason: string | null;
  created_at: Date | string;
}

function rehydrateGrant(row: AccessGrantRow): AccessGrant {
  return {
    id: requiredText(row.id),
    organizationId: row.organization_id
      ? asOrganizationId(requiredText(row.organization_id))
      : null,
    actorId: asActorId(requiredText(row.actor_id)),
    permission: requiredText(row.permission) as Permission,
    effect: requiredText(row.effect) as GrantEffect,
    scopeType: requiredText(row.scope_type) as AuthorizationScopeType,
    scopeId: requiredText(row.scope_id),
    grantedByActorId: asActorId(requiredText(row.granted_by_actor_id)),
    reason: nullableText(row.reason),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function rehydratePlatformRole(row: PlatformRoleRow): PlatformRoleAssignment {
  return {
    actorId: asActorId(requiredText(row.actor_id)),
    role: "superuser",
    assignedByActorId: asActorId(requiredText(row.assigned_by_actor_id)),
    createdAt: new Date(row.created_at),
  };
}

function rehydrateAuditEntry(row: AuthorizationAuditRow): AuthorizationAuditEntry {
  return {
    id: requiredText(row.id),
    actorId: asActorId(requiredText(row.actor_id)),
    action: requiredText(row.action),
    targetActorId: asActorId(requiredText(row.target_actor_id)),
    organizationId: row.organization_id
      ? asOrganizationId(requiredText(row.organization_id))
      : null,
    scopeType: requiredText(row.scope_type) as AuthorizationScopeType,
    scopeId: requiredText(row.scope_id),
    permission: row.permission ? (requiredText(row.permission) as Permission) : null,
    before: row.before_value ?? null,
    after: row.after_value ?? null,
    reason: nullableText(row.reason),
    createdAt: new Date(row.created_at),
  };
}

function requiredText(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return `${value}`;
  throw new Error("Expected a scalar text value from Postgres");
}

function nullableText(value: unknown): string | null {
  return value === null || value === undefined ? null : requiredText(value);
}
