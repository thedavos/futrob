import type { OrganizationId } from "@futrob/shared-kernel";

export interface IdGeneratorPort {
  organizationId(): OrganizationId;
  invitationId(): string;
}
