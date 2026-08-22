import type { Effect } from "effect";
import { createFutrobClient, type FutrobClient } from "@futrob/sdk";
import { callApi } from "./call-api.ts";
import type { CliError } from "./errors.ts";

const DEFAULT_BASE_URL = "http://localhost:8787/api/v1";

export type ClientConfig = {
  readonly baseUrl: string;
  readonly actorId?: string;
};

export function resolveApiBaseUrl(explicit?: string): string {
  return explicit ?? process.env.FUTROB_API_BASE_URL ?? DEFAULT_BASE_URL;
}

/**
 * Service auth: apps/api trusts `Authorization: Bearer INTERNAL_JOB_SECRET`
 * plus `X-Futrob-Actor-Id` (see apps/api service-auth middleware).
 */
export function createCliFutrobClient(config: ClientConfig): FutrobClient {
  const bearerToken = process.env.FUTROB_ACCESS_TOKEN ?? process.env.FUTROB_INTERNAL_JOB_SECRET;
  return createFutrobClient({
    baseUrl: config.baseUrl,
    getAccessToken: () => bearerToken,
    getExtraHeaders: () => (config.actorId ? { "X-Futrob-Actor-Id": config.actorId } : undefined),
  });
}

/** Builds the CLI client and runs one SDK call inside Effect with typed errors. */
export function apiCall<A>(
  config: ClientConfig,
  task: (client: FutrobClient) => Promise<A>,
): Effect.Effect<A, CliError> {
  const client = createCliFutrobClient(config);
  return callApi(config.baseUrl, () => task(client));
}
