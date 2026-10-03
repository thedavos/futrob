import type { OrganizationId } from "@futrob/shared-kernel";
import type {
  Organization,
  OrganizationChanges,
  OrganizationRepository,
} from "@futrob/organizations";
import type { Pool } from "pg";
import { z } from "zod";
import { pgTextSchema, pgTimestampSchema } from "@/adapters/persistence/pg-scalar.ts";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";
import { rehydrateOrganization } from "./in-memory.repository.ts";

const ORGANIZATION_COLUMNS = `id, name, normalized_name, slug, time_zone, logo_kind, logo_value,
  created_at, created_by_actor_id, creation_key`;

/** Column/value pairs for the fields present in `changes`; absent fields are left untouched. */
export function organizationAssignments(
  changes: OrganizationChanges,
): readonly (readonly [column: string, value: string | null])[] {
  const pairs: (readonly [string, string | null])[] = [];
  if (changes.name !== undefined) pairs.push(["name", changes.name]);
  if (changes.normalizedName !== undefined) pairs.push(["normalized_name", changes.normalizedName]);
  if (changes.slug !== undefined) pairs.push(["slug", changes.slug]);
  if (changes.timeZone !== undefined) pairs.push(["time_zone", changes.timeZone]);
  if (changes.logo !== undefined) {
    pairs.push(["logo_kind", changes.logo.kind]);
    pairs.push(["logo_value", changes.logo.kind === "upload" ? changes.logo.key : null]);
  }
  return pairs;
}

const organizationRowSchema = z.object({
  id: pgTextSchema,
  name: pgTextSchema,
  normalized_name: pgTextSchema,
  slug: pgTextSchema,
  time_zone: pgTextSchema,
  logo_kind: z.enum(["monogram", "upload"]),
  logo_value: pgTextSchema.nullable(),
  created_at: pgTimestampSchema,
  created_by_actor_id: pgTextSchema,
  creation_key: pgTextSchema.nullable(),
});

const postgresErrorCodeSchema = z.object({ code: z.string() });

function isUniqueViolation(error: Error): boolean {
  const parsed = postgresErrorCodeSchema.safeParse(error);
  return parsed.success && parsed.data.code === "23505";
}

export class PostgresOrganizationRepository implements OrganizationRepository {
  constructor(private readonly pool: Pool) {}

  async create(organization: Organization): Promise<Organization | null> {
    const result = await getPgExecutor(this.pool).query(
      `INSERT INTO organizations (
         id, name, normalized_name, slug, time_zone, logo_kind, logo_value,
         created_at, created_by_actor_id, creation_key
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT DO NOTHING
       RETURNING ${ORGANIZATION_COLUMNS}`,
      [
        organization.id,
        organization.name,
        organization.normalizedName,
        organization.slug,
        organization.timeZone,
        organization.logo.kind,
        organization.logo.kind === "upload" ? organization.logo.key : null,
        organization.createdAt.toISOString(),
        organization.createdByActorId,
        organization.creationKey ?? null,
      ],
    );
    if (result.rows[0]) return rehydrateOrganization(organizationRowSchema.parse(result.rows[0]));
    return organization.creationKey ? await this.getByCreationKey(organization.creationKey) : null;
  }

  async getByIds(ids: readonly OrganizationId[]): Promise<readonly Organization[]> {
    if (ids.length === 0) return [];
    const result = await getPgExecutor(this.pool).query(
      `SELECT ${ORGANIZATION_COLUMNS}
       FROM organizations WHERE id = ANY($1::text[])`,
      [[...new Set(ids)]],
    );
    return z.array(organizationRowSchema).parse(result.rows).map(rehydrateOrganization);
  }

  async getById(id: OrganizationId): Promise<Organization | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT ${ORGANIZATION_COLUMNS}
       FROM organizations WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? rehydrateOrganization(organizationRowSchema.parse(row)) : null;
  }

  async getByCreationKey(creationKey: string): Promise<Organization | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT ${ORGANIZATION_COLUMNS}
       FROM organizations WHERE creation_key = $1`,
      [creationKey],
    );
    const row = result.rows[0];
    return row ? rehydrateOrganization(organizationRowSchema.parse(row)) : null;
  }

  async getBySlug(slug: string): Promise<Organization | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT ${ORGANIZATION_COLUMNS}
       FROM organizations WHERE slug = $1`,
      [slug],
    );
    const row = result.rows[0];
    return row ? rehydrateOrganization(organizationRowSchema.parse(row)) : null;
  }

  async update(id: OrganizationId, changes: OrganizationChanges): Promise<Organization | null> {
    const assignments = organizationAssignments(changes);
    if (assignments.length === 0) return this.getById(id);
    const sets = assignments.map(([column], index) => `${column} = $${index + 2}`).join(", ");
    try {
      // Only the given columns are written, so concurrent writers of other columns do not collide.
      const result = await getPgExecutor(this.pool).query(
        `UPDATE organizations SET ${sets} WHERE id = $1 RETURNING ${ORGANIZATION_COLUMNS}`,
        [id, ...assignments.map(([, value]) => value)],
      );
      const row = result.rows[0];
      return row ? rehydrateOrganization(organizationRowSchema.parse(row)) : null;
    } catch (error) {
      // 23505: another organization owns the normalized name or the slug.
      if (error instanceof Error && isUniqueViolation(error)) return null;
      throw error;
    }
  }

  async getByNormalizedName(normalizedName: string): Promise<Organization | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT ${ORGANIZATION_COLUMNS}
       FROM organizations WHERE normalized_name = $1`,
      [normalizedName],
    );
    const row = result.rows[0];
    return row ? rehydrateOrganization(organizationRowSchema.parse(row)) : null;
  }
}
