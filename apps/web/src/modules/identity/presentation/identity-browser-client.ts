import {
  completeInvitationOnboardingRequestSchema,
  completeInvitationOnboardingResponseSchema,
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
  type CompleteOrganizationOnboardingRequest,
  type CompleteOrganizationOnboardingResponse,
  type CompletePlayerOnboardingRequest,
  type CompletePlayerOnboardingResponse,
  type GetOnboardingStatusResponse,
  type OrganizationNameAvailabilityRequest,
  type OrganizationNameAvailabilityResponse,
  type SaveOnboardingProgressRequest,
  type SaveOnboardingProgressResponse,
} from "@futrob/api-contracts";
import type { RequestId } from "@futrob/api-contracts";
import { readBrowserApiError } from "@/shared/infrastructure/http/browser-api-error.ts";

async function requestJson<T>(input: {
  readonly path?: string;
  readonly method: "GET" | "POST" | "PATCH";
  readonly body?: unknown;
  readonly parse: (data: unknown) => T;
}): Promise<T> {
  const response = await fetch(input.path ?? "/api/v1/identity/onboarding", {
    method: input.method,
    credentials: "include",
    headers:
      input.body === undefined
        ? { Accept: "application/json" }
        : { Accept: "application/json", "Content-Type": "application/json" },
    body: input.body === undefined ? undefined : JSON.stringify(input.body),
  });
  const raw: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = readBrowserApiError(response, raw, "identity.onboarding_request_failed");
    throw new IdentityOnboardingClientError(
      response.status,
      error.code,
      error.requestId,
      error.retryAfterSeconds,
    );
  }
  return input.parse(raw);
}

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

export const identityBrowserClient = {
  checkOrganizationName(
    input: OrganizationNameAvailabilityRequest,
  ): Promise<OrganizationNameAvailabilityResponse> {
    const body = organizationNameAvailabilityRequestSchema.parse(input);
    return requestJson({
      path: "/api/v1/organizations/name-availability",
      method: "POST",
      body,
      parse: (data) => organizationNameAvailabilityResponseSchema.parse(data),
    });
  },

  getOnboardingStatus(): Promise<GetOnboardingStatusResponse> {
    return requestJson({
      method: "GET",
      parse: (data) => getOnboardingStatusResponseSchema.parse(data),
    });
  },

  saveOnboardingProgress(
    input: SaveOnboardingProgressRequest,
  ): Promise<SaveOnboardingProgressResponse> {
    const body = saveOnboardingProgressRequestSchema.parse(input);
    return requestJson({
      method: "PATCH",
      body,
      parse: (data) => saveOnboardingProgressResponseSchema.parse(data),
    });
  },

  completeOrganizationOnboarding(
    input: CompleteOrganizationOnboardingRequest,
  ): Promise<CompleteOrganizationOnboardingResponse> {
    const body = completeOrganizationOnboardingRequestSchema.parse(input);
    return requestJson({
      path: "/api/v1/identity/onboarding/organization",
      method: "POST",
      body,
      parse: (data) => completeOrganizationOnboardingResponseSchema.parse(data),
    });
  },

  completeInvitationOnboarding(
    input: CompleteInvitationOnboardingRequest,
  ): Promise<CompleteInvitationOnboardingResponse> {
    const body = completeInvitationOnboardingRequestSchema.parse(input);
    return requestJson({
      path: "/api/v1/identity/onboarding/invitation",
      method: "POST",
      body,
      parse: (data) => completeInvitationOnboardingResponseSchema.parse(data),
    });
  },

  completePlayerOnboarding(
    input: CompletePlayerOnboardingRequest,
  ): Promise<CompletePlayerOnboardingResponse> {
    const body = completePlayerOnboardingRequestSchema.parse(input);
    return requestJson({
      path: "/api/v1/identity/onboarding/player",
      method: "POST",
      body,
      parse: (data) => completePlayerOnboardingResponseSchema.parse(data),
    });
  },
};
