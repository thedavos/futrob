import type { OrganizationId } from "@futrob/shared-kernel";
import type { OrgMembershipRole } from "./organization-membership-role.ts";

export interface MembershipSummary {
  readonly organizationId: OrganizationId;
  readonly organizationName: string;
  readonly role: OrgMembershipRole;
}

export type PostAuthDestination =
  | { readonly kind: "onboarding" }
  | { readonly kind: "organization"; readonly organizationId: OrganizationId }
  | {
      readonly kind: "organizationPicker";
      readonly memberships: MembershipSummary[];
    };
