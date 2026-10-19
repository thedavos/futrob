import type { Result, ActorId, OrganizationId } from "@futrob/shared-kernel";
import type { MemberCompetitionAccess } from "../entities/organization-member-record.ts";
import type { OrganizationMembership } from "../entities/organization-membership.ts";
import type { OrganizationMemberDirectoryCatalogLimitReached } from "../errors/organization-member.errors.ts";

export interface OrganizationMemberAccessSummarizer {
  summarize(input: {
    readonly organizationId: OrganizationId;
    readonly callerId: ActorId;
    readonly members: readonly OrganizationMembership[];
  }): Promise<
    Result<
      ReadonlyMap<ActorId, MemberCompetitionAccess>,
      OrganizationMemberDirectoryCatalogLimitReached
    >
  >;
}
