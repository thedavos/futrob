import type { OrganizationId, TeamId } from "@futrob/shared-kernel";

export interface TeamExternalClubVerificationPort {
  isVerified(organizationId: OrganizationId, teamId: TeamId): Promise<boolean>;
}
