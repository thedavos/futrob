import {
  completeOnboardingRequestSchema,
  completeOnboardingResponseSchema,
  getOnboardingStatusResponseSchema,
  type CompleteOnboardingRequest,
  type CompleteOnboardingResponse,
  type GetOnboardingStatusResponse,
} from "@futrob/api-contracts";

async function requestJson<T>(input: {
  readonly method: "GET" | "POST";
  readonly body?: unknown;
  readonly parse: (data: unknown) => T;
}): Promise<T> {
  const response = await fetch("/api/v1/identity/onboarding", {
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
    throw new Error("identity.onboarding_request_failed");
  }
  return input.parse(raw);
}

export const identityBrowserClient = {
  getOnboardingStatus(): Promise<GetOnboardingStatusResponse> {
    return requestJson({
      method: "GET",
      parse: (data) => getOnboardingStatusResponseSchema.parse(data),
    });
  },

  completeOnboarding(input: CompleteOnboardingRequest): Promise<CompleteOnboardingResponse> {
    const body = completeOnboardingRequestSchema.parse(input);
    return requestJson({
      method: "POST",
      body,
      parse: (data) => completeOnboardingResponseSchema.parse(data),
    });
  },
};
