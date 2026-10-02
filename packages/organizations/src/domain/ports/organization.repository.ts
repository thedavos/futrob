import type { OrganizationId } from "@futrob/shared-kernel";
import type { Organization } from "../entities/organization.ts";

export interface OrganizationRepository {
  create(organization: Organization): Promise<Organization | null>;
  getByIds(ids: readonly OrganizationId[]): Promise<readonly Organization[]>;
  getById(id: OrganizationId): Promise<Organization | null>;
  getByCreationKey(creationKey: string): Promise<Organization | null>;
  getByNormalizedName(normalizedName: string): Promise<Organization | null>;
  getBySlug(slug: string): Promise<Organization | null>;
  /** Persists name, slug, time zone and logo. Returns `null` when another organization already owns the name or slug. */
  update(organization: Organization): Promise<Organization | null>;
}
