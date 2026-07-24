import { createFutrobClient, type FutrobClient } from "@futrob/sdk";

const DEFAULT_API_BASE_URL = "http://localhost:8787/api/v1";

let client: FutrobClient | undefined;

/** Browser SDK client pointed at `apps/api` (see `VITE_FUTROB_API_BASE_URL`). */
export function getFutrobBrowserClient(): FutrobClient {
  client ??= createFutrobClient({
    baseUrl: import.meta.env.VITE_FUTROB_API_BASE_URL ?? DEFAULT_API_BASE_URL,
  });
  return client;
}

export function resolveFutrobApiBaseUrl(): string {
  return import.meta.env.VITE_FUTROB_API_BASE_URL ?? DEFAULT_API_BASE_URL;
}
