import {
  acceptInvitationRequestSchema,
  acceptInvitationResponseSchema,
  createInvitationRequestSchema,
  createInvitationResponseSchema,
  createOrganizationRequestSchema,
  createOrganizationResponseSchema,
  listMyMembershipsResponseSchema,
  resolvePostAuthDestinationResponseSchema,
  type AcceptInvitationRequest,
  type AcceptInvitationResponse,
  type CreateInvitationRequest,
  type CreateInvitationResponse,
  type CreateOrganizationRequest,
  type CreateOrganizationResponse,
  type ListMyMembershipsResponse,
  type ResolvePostAuthDestinationResponse,
} from "@futrob/api-contracts";
import type { HttpClient } from "../http.ts";

export function createOrganizationsResource(http: HttpClient) {
  return {
    async listMine(): Promise<ListMyMembershipsResponse> {
      return http.request({
        path: "/organizations/mine",
        method: "GET",
        parse: (data) => listMyMembershipsResponseSchema.parse(data),
      });
    },

    async resolvePostAuthDestination(): Promise<ResolvePostAuthDestinationResponse> {
      return http.request({
        path: "/organizations/post-auth-destination",
        method: "GET",
        parse: (data) => resolvePostAuthDestinationResponseSchema.parse(data),
      });
    },

    async create(input: CreateOrganizationRequest): Promise<CreateOrganizationResponse> {
      const body = createOrganizationRequestSchema.parse(input);
      return http.request({
        path: "/organizations",
        method: "POST",
        body,
        parse: (data) => createOrganizationResponseSchema.parse(data),
      });
    },

    async createInvitation(
      organizationId: string,
      input: CreateInvitationRequest,
    ): Promise<CreateInvitationResponse> {
      const body = createInvitationRequestSchema.parse(input);
      return http.request({
        path: `/organizations/${encodeURIComponent(organizationId)}/invitations`,
        method: "POST",
        body,
        parse: (data) => createInvitationResponseSchema.parse(data),
      });
    },

    async acceptInvitation(input: AcceptInvitationRequest): Promise<AcceptInvitationResponse> {
      const body = acceptInvitationRequestSchema.parse(input);
      return http.request({
        path: "/organizations/invitations/accept",
        method: "POST",
        body,
        parse: (data) => acceptInvitationResponseSchema.parse(data),
      });
    },
  };
}

export type OrganizationsResource = ReturnType<typeof createOrganizationsResource>;
