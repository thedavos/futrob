import { createFutrobClient, type FutrobClient } from "@futrob/sdk";

let client: FutrobClient | undefined;

/** Same-origin SDK client for the web BFF; errors arrive as `FutrobApiError` with status and code. */
export function officialSelectionBrowserClient(): FutrobClient["results"] {
  client ??= createFutrobClient({
    baseUrl: "/api/v1",
    fetchImpl: (input, init) => fetch(input, { ...init, credentials: "include" }),
  });
  return client.results;
}
