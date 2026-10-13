import { createFutrobClient, type FutrobClient } from "@futrob/sdk";

let client: FutrobClient | undefined;

export function scheduleChangeBrowserClient(): FutrobClient["encounters"] {
  client ??= createFutrobClient({
    baseUrl: "/api/v1",
    fetchImpl: (input, init) => fetch(input, { ...init, credentials: "include" }),
  });
  return client.encounters;
}
