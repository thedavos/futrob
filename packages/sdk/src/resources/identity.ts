import {
  completeInvitationOnboardingRequestSchema,
  completeInvitationOnboardingResponseSchema,
  inspectCompetitionInvitationRequestSchema,
  inspectCompetitionInvitationResponseSchema,
  completeOrganizationOnboardingRequestSchema,
  completeOrganizationOnboardingResponseSchema,
  completePlayerOnboardingRequestSchema,
  completePlayerOnboardingResponseSchema,
  getOnboardingStatusResponseSchema,
  saveOnboardingProgressRequestSchema,
  saveOnboardingProgressResponseSchema,
  type CompleteInvitationOnboardingRequest,
  type CompleteInvitationOnboardingResponse,
  type InspectCompetitionInvitationRequest,
  type InspectCompetitionInvitationResponse,
  type CompleteOrganizationOnboardingRequest,
  type CompleteOrganizationOnboardingResponse,
  type CompletePlayerOnboardingRequest,
  type CompletePlayerOnboardingResponse,
  type GetOnboardingStatusResponse,
  type SaveOnboardingProgressRequest,
  type SaveOnboardingProgressResponse,
} from "@futrob/api-contracts";
import type { HttpClient, RequestOptions } from "../http.ts";

export function createIdentityResource(http: HttpClient) {
  return {
    async getOnboardingStatus(options: RequestOptions = {}): Promise<GetOnboardingStatusResponse> {
      return http.request({
        path: "/identity/onboarding",
        method: "GET",
        options,
        parse: (data) => getOnboardingStatusResponseSchema.parse(data),
      });
    },

    async saveOnboardingProgress(
      input: SaveOnboardingProgressRequest,
      options: RequestOptions = {},
    ): Promise<SaveOnboardingProgressResponse> {
      const body = saveOnboardingProgressRequestSchema.parse(input);
      return http.request({
        path: "/identity/onboarding",
        method: "PATCH",
        body,
        options,
        parse: (data) => saveOnboardingProgressResponseSchema.parse(data),
      });
    },

    async completeOrganizationOnboarding(
      input: CompleteOrganizationOnboardingRequest,
      options: RequestOptions = {},
    ): Promise<CompleteOrganizationOnboardingResponse> {
      const body = completeOrganizationOnboardingRequestSchema.parse(input);
      return http.request({
        path: "/identity/onboarding/organization",
        method: "POST",
        body,
        options,
        parse: (data) => completeOrganizationOnboardingResponseSchema.parse(data),
      });
    },

    async completeInvitationOnboarding(
      input: CompleteInvitationOnboardingRequest,
      options: RequestOptions = {},
    ): Promise<CompleteInvitationOnboardingResponse> {
      const body = completeInvitationOnboardingRequestSchema.parse(input);
      return http.request({
        path: "/identity/onboarding/invitation",
        method: "POST",
        body,
        options,
        parse: (data) => completeInvitationOnboardingResponseSchema.parse(data),
      });
    },

    async inspectCompetitionInvitation(
      input: InspectCompetitionInvitationRequest,
      options: RequestOptions = {},
    ): Promise<InspectCompetitionInvitationResponse> {
      const body = inspectCompetitionInvitationRequestSchema.parse(input);
      return http.request({
        path: "/identity/onboarding/invitation/preview",
        method: "POST",
        body,
        options,
        parse: (data) => inspectCompetitionInvitationResponseSchema.parse(data),
      });
    },

    async completePlayerOnboarding(
      input: CompletePlayerOnboardingRequest,
      options: RequestOptions = {},
    ): Promise<CompletePlayerOnboardingResponse> {
      const body = completePlayerOnboardingRequestSchema.parse(input);
      return http.request({
        path: "/identity/onboarding/player",
        method: "POST",
        body,
        options,
        parse: (data) => completePlayerOnboardingResponseSchema.parse(data),
      });
    },
  };
}

export type IdentityResource = ReturnType<typeof createIdentityResource>;
