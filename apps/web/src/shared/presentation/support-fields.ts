export type SupportFields = Readonly<{
  requestId?: string;
  retryAfterSeconds?: number;
}>;

export function buildSupportFields(input: {
  readonly requestId?: string;
  readonly retryAfterSeconds?: number;
}): SupportFields {
  if (input.requestId !== undefined && input.retryAfterSeconds !== undefined) {
    return { requestId: input.requestId, retryAfterSeconds: input.retryAfterSeconds };
  }
  if (input.requestId !== undefined) {
    return { requestId: input.requestId };
  }
  if (input.retryAfterSeconds !== undefined) {
    return { retryAfterSeconds: input.retryAfterSeconds };
  }
  return {};
}

export type OnboardingFlowErrorDisplay = Readonly<{
  message: string;
  requestId?: string;
  retryAfterSeconds?: number;
}>;

export function buildOnboardingFlowErrorDisplay(input: {
  readonly message: string;
  readonly requestId?: string;
  readonly retryAfterSeconds?: number;
}): OnboardingFlowErrorDisplay {
  if (input.requestId !== undefined && input.retryAfterSeconds !== undefined) {
    return {
      message: input.message,
      requestId: input.requestId,
      retryAfterSeconds: input.retryAfterSeconds,
    };
  }
  if (input.requestId !== undefined) {
    return { message: input.message, requestId: input.requestId };
  }
  if (input.retryAfterSeconds !== undefined) {
    return { message: input.message, retryAfterSeconds: input.retryAfterSeconds };
  }
  return { message: input.message };
}
