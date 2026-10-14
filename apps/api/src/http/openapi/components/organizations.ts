import {
  organizationLogoSchema,
  membershipSummarySchema,
  organizationProfileSchema,
  createInvitationResponseSchema,
  createOrganizationInvitationRequestSchema,
  resolvePostAuthDestinationResponseSchema,
} from "@futrob/api-contracts";
import { namedSchema } from "@/http/openapi/named-schema.ts";

export const OrganizationLogo = namedSchema("OrganizationLogo", organizationLogoSchema);
export const OrganizationMembershipSummary = namedSchema(
  "OrganizationMembershipSummary",
  membershipSummarySchema,
);
export const OrganizationProfile = namedSchema("OrganizationProfile", organizationProfileSchema);
export const CreateInvitationResponse = namedSchema(
  "CreateInvitationResponse",
  createInvitationResponseSchema,
);
export const CreateOrganizationInvitationRequest = namedSchema(
  "CreateOrganizationInvitationRequest",
  createOrganizationInvitationRequestSchema,
);
export const ResolvePostAuthDestinationResponse = namedSchema(
  "ResolvePostAuthDestinationResponse",
  resolvePostAuthDestinationResponseSchema,
);
