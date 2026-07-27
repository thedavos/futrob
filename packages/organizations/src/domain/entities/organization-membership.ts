import type { ActorId, OrganizationId } from "@futrob/shared-kernel";
import type { OrgMembershipRole } from "../value-objects/organization-membership-role.ts";

export interface OrganizationMembership {
  readonly organizationId: OrganizationId;
  readonly actorId: ActorId;
  readonly role: OrgMembershipRole;
  readonly createdAt: Date;
}
