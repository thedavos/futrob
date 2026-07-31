import type { OrganizationId } from "@futrob/shared-kernel";
import type { Organization } from "../entities/organization.ts";

export interface OrganizationRepository {
  create(organization: Organization): Promise<Organization | null>;
  getById(id: OrganizationId): Promise<Organization | null>;
  getByCreationKey(creationKey: string): Promise<Organization | null>;
  getByNormalizedName(normalizedName: string): Promise<Organization | null>;
}
