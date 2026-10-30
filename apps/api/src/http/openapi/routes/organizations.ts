import { defineRoute, PLAN_GATED_DESCRIPTION } from "@/http/openapi/define-route.ts";
import { pathParams } from "@/http/openapi/path-params.ts";
import {
  CreateInvitationResponse,
  CreateOrganizationInvitationRequest,
  OrganizationProfile,
  ResolvePostAuthDestinationResponse,
} from "@/http/openapi/components.ts";
import {
  listOrganizationMembersQuerySchema,
  listOrganizationMembersResponseSchema,
  acceptInvitationRequestSchema,
  acceptInvitationResponseSchema,
  createOrganizationRequestSchema,
  createOrganizationResponseSchema,
  listMyMembershipsResponseSchema,
  organizationNameAvailabilityRequestSchema,
  organizationNameAvailabilityResponseSchema,
  organizationSlugAvailabilityRequestSchema,
  organizationSlugAvailabilityResponseSchema,
  setOrganizationLogoRequestSchema,
  updateOrganizationProfileRequestSchema,
} from "@futrob/api-contracts";

export const acceptOrganizationInvitationRoute = defineRoute({
  method: "post",
  path: "/organizations/invitations/accept",
  operationId: "acceptOrganizationInvitation",
  tags: ["organizations"],
  summary: "Accept an organization invitation",
  body: acceptInvitationRequestSchema,
  success: {
    status: 200,
    description: "Organization invitation accepted",
    schema: acceptInvitationResponseSchema,
  },
  errors: [400, 401, 402, 404, 409, 429],
  errorDescriptions: { 402: PLAN_GATED_DESCRIPTION },
});

export const checkOrganizationNameAvailabilityRoute = defineRoute({
  method: "post",
  path: "/organizations/name-availability",
  operationId: "checkOrganizationNameAvailability",
  tags: ["organizations"],
  summary: "Check whether a normalized organization name is globally available",
  body: organizationNameAvailabilityRequestSchema,
  success: {
    status: 200,
    description: "Name availability",
    schema: organizationNameAvailabilityResponseSchema,
  },
  errors: [400, 401],
});

export const createOrganizationRoute = defineRoute({
  method: "post",
  path: "/organizations",
  operationId: "createOrganization",
  tags: ["organizations"],
  summary: "Create an organization; the caller becomes its organizer",
  body: createOrganizationRequestSchema,
  success: {
    status: 201,
    description: "Organization created",
    schema: createOrganizationResponseSchema,
  },
  errors: [400, 401, 409],
});

export const listMyOrganizationsRoute = defineRoute({
  method: "get",
  path: "/organizations/mine",
  operationId: "listMyOrganizations",
  tags: ["organizations"],
  summary: "List the organizations the caller belongs to",
  success: { status: 200, description: "Memberships", schema: listMyMembershipsResponseSchema },
  errors: [401],
});

export const checkOrganizationSlugAvailabilityRoute = defineRoute({
  method: "post",
  path: "/organizations/slug-availability",
  operationId: "checkOrganizationSlugAvailability",
  tags: ["organizations"],
  summary: "Check whether a slug is valid and free, with a suggestion when it is not",
  body: organizationSlugAvailabilityRequestSchema,
  success: {
    status: 200,
    description: "Slug availability",
    schema: organizationSlugAvailabilityResponseSchema,
  },
  errors: [400, 401],
});

export const getOrganizationProfileRoute = defineRoute({
  method: "get",
  path: "/organizations/{organizationId}",
  operationId: "getOrganizationProfile",
  tags: ["organizations"],
  summary: "Read the organization profile (requires organizations.read)",
  params: pathParams(["organizationId"]),
  success: { status: 200, description: "Organization profile", schema: OrganizationProfile },
  errors: [401, 403, 404],
});

export const updateOrganizationProfileRoute = defineRoute({
  method: "patch",
  path: "/organizations/{organizationId}",
  operationId: "updateOrganizationProfile",
  tags: ["organizations"],
  summary: "Change name, slug or time zone (requires organizations.update)",
  params: pathParams(["organizationId"]),
  body: updateOrganizationProfileRequestSchema,
  success: {
    status: 200,
    description: "Updated organization profile",
    schema: OrganizationProfile,
  },
  errors: [400, 401, 403, 404, 409],
});

export const setOrganizationLogoRoute = defineRoute({
  method: "put",
  path: "/organizations/{organizationId}/logo",
  operationId: "setOrganizationLogo",
  tags: ["organizations"],
  summary: "Register an uploaded logo or return to the monogram (requires organizations.update)",
  params: pathParams(["organizationId"]),
  body: setOrganizationLogoRequestSchema,
  success: {
    status: 200,
    description: "Organization profile with its new logo",
    schema: OrganizationProfile,
  },
  errors: [400, 401, 403, 404],
});

export const resolvePostAuthDestinationRoute = defineRoute({
  method: "get",
  path: "/organizations/post-auth-destination",
  operationId: "resolvePostAuthDestination",
  tags: ["organizations"],
  summary: "Resolve where an authenticated actor should land after sign-in",
  success: {
    status: 200,
    description: "Onboarding, personal space, an organization, or a picker",
    schema: ResolvePostAuthDestinationResponse,
  },
  errors: [401],
});

export const createOrganizationInvitationRoute = defineRoute({
  method: "post",
  path: "/organizations/{organizationId}/invitations",
  operationId: "createOrganizationInvitation",
  tags: ["organizations"],
  summary: "Create an invitation to join the organization",
  params: pathParams(["organizationId"]),
  body: CreateOrganizationInvitationRequest,
  success: {
    status: 201,
    description: "Organization invitation created, including the one-time token",
    schema: CreateInvitationResponse,
  },
  errors: [400, 401, 402, 403, 404, 409],
  errorDescriptions: { 402: PLAN_GATED_DESCRIPTION },
});

export const listOrganizationMembersRoute = defineRoute({
  method: "get",
  path: "/organizations/{organizationId}/members",
  operationId: "listOrganizationMembers",
  tags: ["organizations"],
  summary:
    "Read the complete organization member directory (requires organizations.memberships.read)",
  description:
    "Returns at most 500 members. Rejects directories above 500 members or 100 competitions. Query parameters are not supported.",
  params: pathParams(["organizationId"]),
  query: listOrganizationMembersQuerySchema,
  success: {
    status: 200,
    description: "Complete member directory",
    schema: listOrganizationMembersResponseSchema,
  },
  errors: [400, 401, 403, 404, 409],
});
