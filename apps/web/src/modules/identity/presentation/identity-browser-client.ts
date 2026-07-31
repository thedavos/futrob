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
    const code =
      raw && typeof raw === "object" && "code" in raw && typeof raw.code === "string"
        ? raw.code
        : "identity.onboarding_request_failed";
    throw new IdentityOnboardingClientError(response.status, code);
  }
  return input.parse(raw);
}

export class IdentityOnboardingClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
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
