import {
  completeOnboardingRequestSchema,
  completeOnboardingResponseSchema,
  getOnboardingStatusResponseSchema,
  saveOnboardingProgressRequestSchema,
  saveOnboardingProgressResponseSchema,
  type CompleteOnboardingRequest,
  type CompleteOnboardingResponse,
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

    async completeOnboarding(
      input: CompleteOnboardingRequest,
    ): Promise<CompleteOnboardingResponse> {
      const body = completeOnboardingRequestSchema.parse(input);
      return http.request({
        path: "/identity/onboarding",
        method: "POST",
        body,
        parse: (data) => completeOnboardingResponseSchema.parse(data),
      });
    },
  };
}

export type IdentityResource = ReturnType<typeof createIdentityResource>;
