import type { OrganizationId } from "@futrob/shared-kernel";
import type { Organization } from "../entities/organization.ts";

export interface OrganizationRepository {
  create(organization: Organization): Promise<void>;
  getById(id: OrganizationId): Promise<Organization | null>;
}
