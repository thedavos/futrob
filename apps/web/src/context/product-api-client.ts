import { createFutrobClient, type FutrobClient } from "@futrob/sdk";
import { REQUEST_ID_HEADER, type RequestId } from "@futrob/api-contracts";
import type { ActorId } from "@futrob/shared-kernel";

import { readNodeEnv } from "@/shared/infrastructure/node-env.ts";

const DEFAULT_API_BASE_URL = "http://localhost:8787/api/v1";

export class ProductApiUnreachableError extends Error {
  readonly code = "product_api.unreachable" as const;

  constructor() {
    super("Product API unreachable");
    this.name = "ProductApiUnreachableError";
  }
}

export function resolveProductApiBaseUrl(explicit?: string): string {
  return (
    explicit ??
    readNodeEnv("FUTROB_API_BASE_URL") ??
    readNodeEnv("VITE_FUTROB_API_BASE_URL") ??
    DEFAULT_API_BASE_URL
  ).replace(/\/$/, "");
}

/** Server-only SDK client: Bearer INTERNAL_JOB_SECRET + trusted ActorId. */
export function createProductApiClient(input: {
  readonly actorId: ActorId;
  readonly internalJobSecret: string;
  readonly requestId: RequestId;
  readonly baseUrl?: string;
  readonly fetchImpl?: typeof fetch;
}): FutrobClient {
  const baseUrl = resolveProductApiBaseUrl(input.baseUrl);
  return createFutrobClient({
    baseUrl,
    getAccessToken: () => input.internalJobSecret,
    getExtraHeaders: () => ({
      "X-Futrob-Actor-Id": input.actorId,
      [REQUEST_ID_HEADER]: input.requestId,
    }),
    fetchImpl: withUnreachableMapping(input.fetchImpl),
  });
}

function withUnreachableMapping(fetchImpl: typeof fetch | undefined): typeof fetch {
  const unbound = fetchImpl ?? globalThis.fetch.bind(globalThis);
  const mappedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      return await unbound(input, init);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      throw new ProductApiUnreachableError();
    }
  };
  return mappedFetch satisfies typeof fetch;
}
