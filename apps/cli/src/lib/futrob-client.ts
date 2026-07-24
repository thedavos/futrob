import { createFutrobClient, type FutrobClient } from "@futrob/sdk";

const DEFAULT_BASE_URL = "http://localhost:3000/api/v1";

export function resolveApiBaseUrl(explicit?: string): string {
  return explicit ?? process.env.FUTROB_API_BASE_URL ?? DEFAULT_BASE_URL;
}

export function createCliFutrobClient(options: { readonly baseUrl?: string } = {}): FutrobClient {
  const baseUrl = resolveApiBaseUrl(options.baseUrl);
  return createFutrobClient({
    baseUrl,
    getAccessToken: () => process.env.FUTROB_ACCESS_TOKEN,
  });
}
