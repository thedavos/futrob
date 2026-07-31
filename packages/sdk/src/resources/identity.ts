import {
  completeInvitationOnboardingRequestSchema,
  completeInvitationOnboardingResponseSchema,
  completeOrganizationOnboardingRequestSchema,
  completeOrganizationOnboardingResponseSchema,
  completePlayerOnboardingRequestSchema,
  completePlayerOnboardingResponseSchema,
  getOnboardingStatusResponseSchema,
  saveOnboardingProgressRequestSchema,
  saveOnboardingProgressResponseSchema,
  type CompleteInvitationOnboardingRequest,
  type CompleteInvitationOnboardingResponse,
  type CompleteOrganizationOnboardingRequest,
  type CompleteOrganizationOnboardingResponse,
  type CompletePlayerOnboardingRequest,
  type CompletePlayerOnboardingResponse,
  type GetOnboardingStatusResponse,
  type SaveOnboardingProgressRequest,
  type SaveOnboardingProgressResponse,
} from "@futrob/api-contracts";
import type { HttpClient } from "../http.ts";

export function createIdentityResource(http: HttpClient) {
  return {
    async getOnboardingStatus(): Promise<GetOnboardingStatusResponse> {
      return http.request({
        path: "/identity/onboarding",
        method: "GET",
        parse: (data) => getOnboardingStatusResponseSchema.parse(data),
      });
    },

    async saveOnboardingProgress(
      input: SaveOnboardingProgressRequest,
    ): Promise<SaveOnboardingProgressResponse> {
      const body = saveOnboardingProgressRequestSchema.parse(input);
      return http.request({
        path: "/identity/onboarding",
        method: "PATCH",
        body,
        parse: (data) => saveOnboardingProgressResponseSchema.parse(data),
      });
    },

    async completeOrganizationOnboarding(
      input: CompleteOrganizationOnboardingRequest,
    ): Promise<CompleteOrganizationOnboardingResponse> {
      const body = completeOrganizationOnboardingRequestSchema.parse(input);
      return http.request({
        path: "/identity/onboarding/organization",
        method: "POST",
        body,
        parse: (data) => completeOrganizationOnboardingResponseSchema.parse(data),
      });
    },

    async completeInvitationOnboarding(
      input: CompleteInvitationOnboardingRequest,
    ): Promise<CompleteInvitationOnboardingResponse> {
      const body = completeInvitationOnboardingRequestSchema.parse(input);
      return http.request({
        path: "/identity/onboarding/invitation",
        method: "POST",
        body,
        parse: (data) => completeInvitationOnboardingResponseSchema.parse(data),
      });
    },

    async completePlayerOnboarding(
      input: CompletePlayerOnboardingRequest,
    ): Promise<CompletePlayerOnboardingResponse> {
      const body = completePlayerOnboardingRequestSchema.parse(input);
      return http.request({
        path: "/identity/onboarding/player",
        method: "POST",
        body,
        parse: (data) => completePlayerOnboardingResponseSchema.parse(data),
      });
    },
  };
}

export type IdentityResource = ReturnType<typeof createIdentityResource>;
