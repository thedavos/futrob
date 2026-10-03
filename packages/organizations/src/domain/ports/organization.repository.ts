import type { OrganizationId } from "@futrob/shared-kernel";
import type { Organization, OrganizationChanges } from "../entities/organization.ts";

export interface OrganizationRepository {
  create(organization: Organization): Promise<Organization | null>;
  getByIds(ids: readonly OrganizationId[]): Promise<readonly Organization[]>;
  getById(id: OrganizationId): Promise<Organization | null>;
  getByCreationKey(creationKey: string): Promise<Organization | null>;
  getByNormalizedName(normalizedName: string): Promise<Organization | null>;
  getBySlug(slug: string): Promise<Organization | null>;
  /**
   * Writes only the given fields and returns the stored organization. Returns `null` when the
   * organization does not exist or another one already owns the name or slug.
   */
  update(id: OrganizationId, changes: OrganizationChanges): Promise<Organization | null>;
}
