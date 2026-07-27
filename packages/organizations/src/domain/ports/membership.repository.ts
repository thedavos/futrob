import type { ActorId, OrganizationId } from "@futrob/shared-kernel";
import type { OrganizationMembership } from "../entities/organization-membership.ts";
import type { MembershipSummary } from "../value-objects/post-auth-destination.ts";

export interface MembershipRepository {
  add(membership: OrganizationMembership): Promise<void>;
  findByActor(actorId: ActorId): Promise<MembershipSummary[]>;
  findByOrgAndActor(
    organizationId: OrganizationId,
    actorId: ActorId,
  ): Promise<OrganizationMembership | null>;
}
