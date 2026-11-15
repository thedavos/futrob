import {
  cancelAccountDeletionResponseSchema,
  getAccountDeletionResponseSchema,
  requestAccountDeletionRequestSchema,
  requestAccountDeletionResponseSchema,
  type CancelAccountDeletionResponse,
  type GetAccountDeletionResponse,
  type RequestAccountDeletionRequest,
  type RequestAccountDeletionResponse,
  completeInvitationOnboardingRequestSchema,
  completeInvitationOnboardingResponseSchema,
  inspectCompetitionInvitationRequestSchema,
  inspectCompetitionInvitationResponseSchema,
  completeOrganizationOnboardingRequestSchema,
  completeOrganizationOnboardingResponseSchema,
  completePlayerOnboardingRequestSchema,
  completePlayerOnboardingResponseSchema,
  getActorPreferencesResponseSchema,
  getOnboardingStatusResponseSchema,
  saveActorPreferencesRequestSchema,
  saveActorPreferencesResponseSchema,
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
  type GetActorPreferencesResponse,
  type GetOnboardingStatusResponse,
  type SaveActorPreferencesRequest,
  type SaveActorPreferencesResponse,
  type SaveOnboardingProgressRequest,
  type SaveOnboardingProgressResponse,
} from "@futrob/api-contracts";
import type { HttpClient, RequestOptions } from "../http.ts";

export function createIdentityResource(http: HttpClient) {
  return {
    async getAccountDeletion(options: RequestOptions = {}): Promise<GetAccountDeletionResponse> {
      return http.request({
        path: "/identity/account/deletion",
        method: "GET",
        options,
        parse: (data) => getAccountDeletionResponseSchema.parse(data),
      });
    },

    /** Schedules deletion and signs the account out of every session, this one included. */
    async requestAccountDeletion(
      input: RequestAccountDeletionRequest,
      options: RequestOptions = {},
    ): Promise<RequestAccountDeletionResponse> {
      const body = requestAccountDeletionRequestSchema.parse(input);
      return http.request({
        path: "/identity/account/deletion",
        method: "POST",
        body,
        options,
        parse: (data) => requestAccountDeletionResponseSchema.parse(data),
      });
    },

    async cancelAccountDeletion(
      options: RequestOptions = {},
    ): Promise<CancelAccountDeletionResponse> {
      return http.request({
        path: "/identity/account/deletion",
        method: "DELETE",
        options,
        parse: (data) => cancelAccountDeletionResponseSchema.parse(data),
      });
    },

    async getActorPreferences(options: RequestOptions = {}): Promise<GetActorPreferencesResponse> {
      return http.request({
        path: "/identity/preferences",
        method: "GET",
        options,
        parse: (data) => getActorPreferencesResponseSchema.parse(data),
      });
    },

    async saveActorPreferences(
      input: SaveActorPreferencesRequest,
      options: RequestOptions = {},
    ): Promise<SaveActorPreferencesResponse> {
      const body = saveActorPreferencesRequestSchema.parse(input);
      return http.request({
        path: "/identity/preferences",
        method: "PUT",
        body,
        options,
        parse: (data) => saveActorPreferencesResponseSchema.parse(data),
      });
    },

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
