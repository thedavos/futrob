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
  organizationNameAvailabilityRequestSchema,
  organizationNameAvailabilityResponseSchema,
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
  type OrganizationNameAvailabilityRequest,
  type OrganizationNameAvailabilityResponse,
  type SaveOnboardingProgressRequest,
  type SaveOnboardingProgressResponse,
  type RequestId,
} from "@futrob/api-contracts";
import type { z } from "zod";
import { requestBrowserJson } from "@/shared/infrastructure/http/browser-json-request.ts";

export class IdentityOnboardingClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly requestId?: RequestId,
    readonly retryAfterSeconds?: number,
  ) {
    super(code);
    this.name = "IdentityOnboardingClientError";
  }
}

async function requestIdentityJson<T>(input: {
  readonly path?: string;
  readonly method: "GET" | "POST" | "PATCH";
  readonly body?: unknown;
  readonly schema: z.ZodType<T>;
}): Promise<T> {
  return requestBrowserJson({
    path: input.path ?? "/api/v1/identity/onboarding",
    method: input.method,
    body: input.body,
    schema: input.schema,
    fallbackCode: "identity.onboarding_request_failed",
    createError: (status, error) =>
      new IdentityOnboardingClientError(
        status,
        error.code,
        error.requestId,
        error.retryAfterSeconds,
      ),
  });
}

export const identityBrowserClient = {
  checkOrganizationName(
    input: OrganizationNameAvailabilityRequest,
  ): Promise<OrganizationNameAvailabilityResponse> {
    const body = organizationNameAvailabilityRequestSchema.parse(input);
    return requestIdentityJson({
      path: "/api/v1/organizations/name-availability",
      method: "POST",
      body,
      schema: organizationNameAvailabilityResponseSchema,
    });
  },

  getOnboardingStatus(): Promise<GetOnboardingStatusResponse> {
    return requestIdentityJson({
      method: "GET",
      schema: getOnboardingStatusResponseSchema,
    });
  },

  saveOnboardingProgress(
    input: SaveOnboardingProgressRequest,
  ): Promise<SaveOnboardingProgressResponse> {
    const body = saveOnboardingProgressRequestSchema.parse(input);
    return requestIdentityJson({
      method: "PATCH",
      body,
      schema: saveOnboardingProgressResponseSchema,
    });
  },

  completeOrganizationOnboarding(
    input: CompleteOrganizationOnboardingRequest,
  ): Promise<CompleteOrganizationOnboardingResponse> {
    const body = completeOrganizationOnboardingRequestSchema.parse(input);
    return requestIdentityJson({
      path: "/api/v1/identity/onboarding/organization",
      method: "POST",
      body,
      schema: completeOrganizationOnboardingResponseSchema,
    });
  },

  completeInvitationOnboarding(
    input: CompleteInvitationOnboardingRequest,
  ): Promise<CompleteInvitationOnboardingResponse> {
    const body = completeInvitationOnboardingRequestSchema.parse(input);
    return requestIdentityJson({
      path: "/api/v1/identity/onboarding/invitation",
      method: "POST",
      body,
      schema: completeInvitationOnboardingResponseSchema,
    });
  },

  inspectCompetitionInvitation(
    input: InspectCompetitionInvitationRequest,
  ): Promise<InspectCompetitionInvitationResponse> {
    const body = inspectCompetitionInvitationRequestSchema.parse(input);
    return requestIdentityJson({
      path: "/api/v1/identity/onboarding/invitation/preview",
      method: "POST",
      body,
      schema: inspectCompetitionInvitationResponseSchema,
    });
  },

  completePlayerOnboarding(
    input: CompletePlayerOnboardingRequest,
  ): Promise<CompletePlayerOnboardingResponse> {
    const body = completePlayerOnboardingRequestSchema.parse(input);
    return requestIdentityJson({
      path: "/api/v1/identity/onboarding/player",
      method: "POST",
      body,
      schema: completePlayerOnboardingResponseSchema,
    });
  },
};
