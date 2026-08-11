import { createFutrobClient, type FutrobClient } from "@futrob/sdk";
import { REQUEST_ID_HEADER, type RequestId } from "@futrob/api-contracts";
import type { ActorId } from "@futrob/shared-kernel";

const DEFAULT_API_BASE_URL = "http://localhost:8787/api/v1";

export function resolveProductApiBaseUrl(): string {
  return (
    (typeof process !== "undefined" ? process.env.FUTROB_API_BASE_URL : undefined) ??
    (typeof process !== "undefined" ? process.env.VITE_FUTROB_API_BASE_URL : undefined) ??
    DEFAULT_API_BASE_URL
  ).replace(/\/$/, "");
}

/** Server-only SDK client: Bearer INTERNAL_JOB_SECRET + trusted ActorId. */
export function createProductApiClient(input: {
  readonly actorId: ActorId;
  readonly internalJobSecret: string;
  readonly requestId: RequestId;
  readonly fetchImpl?: typeof fetch;
}): FutrobClient {
  return createFutrobClient({
    baseUrl: resolveProductApiBaseUrl(),
    getAccessToken: () => input.internalJobSecret,
    getExtraHeaders: () => ({
      "X-Futrob-Actor-Id": input.actorId,
      [REQUEST_ID_HEADER]: input.requestId,
    }),
    fetchImpl: input.fetchImpl,
  });
}
