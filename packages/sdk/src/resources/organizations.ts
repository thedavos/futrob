import {
  acceptInvitationRequestSchema,
  acceptInvitationResponseSchema,
  createCompetitionInvitationRequestSchema,
  createOrganizationInvitationRequestSchema,
  createInvitationResponseSchema,
  createOrganizationRequestSchema,
  createOrganizationResponseSchema,
  listMyMembershipsResponseSchema,
  organizationNameAvailabilityRequestSchema,
  organizationNameAvailabilityResponseSchema,
  organizationProfileSchema,
  organizationSlugAvailabilityRequestSchema,
  organizationSlugAvailabilityResponseSchema,
  resolvePostAuthDestinationResponseSchema,
  setOrganizationLogoRequestSchema,
  updateOrganizationProfileRequestSchema,
  type AcceptInvitationRequest,
  type AcceptInvitationResponse,
  type CreateCompetitionInvitationRequest,
  type CreateOrganizationInvitationRequest,
  type CreateInvitationResponse,
  type CreateOrganizationRequest,
  type CreateOrganizationResponse,
  type ListMyMembershipsResponse,
  type OrganizationNameAvailabilityRequest,
  type OrganizationNameAvailabilityResponse,
  type OrganizationProfileDto,
  type OrganizationSlugAvailabilityRequest,
  type OrganizationSlugAvailabilityResponse,
  type ResolvePostAuthDestinationResponse,
  type SetOrganizationLogoRequest,
  type UpdateOrganizationProfileRequest,
} from "@futrob/api-contracts";
import type { HttpClient, RequestOptions } from "../http.ts";
import { apiPath } from "../internal/path.ts";

export function createOrganizationsResource(http: HttpClient) {
  return {
    async listMine(options: RequestOptions = {}): Promise<ListMyMembershipsResponse> {
      return http.request({
        path: "/organizations/mine",
        method: "GET",
        options,
        parse: (data) => listMyMembershipsResponseSchema.parse(data),
      });
    },

    async resolvePostAuthDestination(
      options: RequestOptions = {},
    ): Promise<ResolvePostAuthDestinationResponse> {
      return http.request({
        path: "/organizations/post-auth-destination",
        method: "GET",
        options,
        parse: (data) => resolvePostAuthDestinationResponseSchema.parse(data),
      });
    },

    async create(
      input: CreateOrganizationRequest,
      options: RequestOptions = {},
    ): Promise<CreateOrganizationResponse> {
      const body = createOrganizationRequestSchema.parse(input);
      return http.request({
        path: "/organizations",
        method: "POST",
        body,
        options,
        parse: (data) => createOrganizationResponseSchema.parse(data),
      });
    },

    async checkNameAvailability(
      input: OrganizationNameAvailabilityRequest,
      options: RequestOptions = {},
    ): Promise<OrganizationNameAvailabilityResponse> {
      const body = organizationNameAvailabilityRequestSchema.parse(input);
      return http.request({
        path: "/organizations/name-availability",
        method: "POST",
        body,
        options,
        parse: (data) => organizationNameAvailabilityResponseSchema.parse(data),
      });
    },

    async checkSlugAvailability(
      input: OrganizationSlugAvailabilityRequest,
      options: RequestOptions = {},
    ): Promise<OrganizationSlugAvailabilityResponse> {
      const body = organizationSlugAvailabilityRequestSchema.parse(input);
      return http.request({
        path: "/organizations/slug-availability",
        method: "POST",
        body,
        options,
        parse: (data) => organizationSlugAvailabilityResponseSchema.parse(data),
      });
    },

    async get(
      organizationId: string,
      options: RequestOptions = {},
    ): Promise<OrganizationProfileDto> {
      return http.request({
        path: apiPath("organizations", organizationId),
        method: "GET",
        options,
        parse: (data) => organizationProfileSchema.parse(data),
      });
    },

    async updateProfile(
      organizationId: string,
      input: UpdateOrganizationProfileRequest,
      options: RequestOptions = {},
    ): Promise<OrganizationProfileDto> {
      const body = updateOrganizationProfileRequestSchema.parse(input);
      return http.request({
        path: apiPath("organizations", organizationId),
        method: "PATCH",
        body,
        options,
        parse: (data) => organizationProfileSchema.parse(data),
      });
    },

    async setLogo(
      organizationId: string,
      input: SetOrganizationLogoRequest,
      options: RequestOptions = {},
    ): Promise<OrganizationProfileDto> {
      const body = setOrganizationLogoRequestSchema.parse(input);
      return http.request({
        path: apiPath("organizations", organizationId, "logo"),
        method: "PUT",
        body,
        options,
        parse: (data) => organizationProfileSchema.parse(data),
      });
    },

    async createInvitation(
      organizationId: string,
      input: CreateOrganizationInvitationRequest,
      options: RequestOptions = {},
    ): Promise<CreateInvitationResponse> {
      const body = createOrganizationInvitationRequestSchema.parse(input);
      return http.request({
        path: apiPath("organizations", organizationId, "invitations"),
        method: "POST",
        body,
        options,
        parse: (data) => createInvitationResponseSchema.parse(data),
      });
    },

    async createCompetitionInvitation(
      organizationId: string,
      competitionId: string,
      input: CreateCompetitionInvitationRequest,
      options: RequestOptions = {},
    ): Promise<CreateInvitationResponse> {
      const body = createCompetitionInvitationRequestSchema.parse(input);
      return http.request({
        path: apiPath(
          "organizations",
          organizationId,
          "competitions",
          competitionId,
          "invitations",
        ),
        method: "POST",
        body,
        options,
        parse: (data) => createInvitationResponseSchema.parse(data),
      });
    },

    async acceptInvitation(
      input: AcceptInvitationRequest,
      options: RequestOptions = {},
    ): Promise<AcceptInvitationResponse> {
      const body = acceptInvitationRequestSchema.parse(input);
      return http.request({
        path: "/organizations/invitations/accept",
        method: "POST",
        body,
        options,
        parse: (data) => acceptInvitationResponseSchema.parse(data),
      });
    },
  };
}

export type OrganizationsResource = ReturnType<typeof createOrganizationsResource>;
