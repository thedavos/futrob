import { createApp } from "@/app.ts";
import type { CorrelationLogEntry } from "@/context/request-correlation.ts";
import { createModules } from "@/di/create-modules.ts";

export const INTERNAL_JOB_SECRET = "test-internal-secret";

export function createFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    return handler(url, init);
  }) as typeof fetch;
}

export function buildApp(fetcher: typeof fetch, correlationLogEntries: CorrelationLogEntry[] = []) {
  const modules = createModules({
    fetcher,
    eaClubsBaseUrl: "https://proclubs.ea.com/api/fc",
    pool: undefined,
  });
  return createApp({
    modules,
    checkDbHealth: () => Promise.resolve("skipped"),
    internalJobSecret: INTERNAL_JOB_SECRET,
    correlationLogger: {
      info: (entry) => correlationLogEntries.push(entry),
      error: (entry) => correlationLogEntries.push(entry),
    },
  });
}

export function serviceHeaders(actorId = "actor-test-1"): Record<string, string> {
  return {
    Authorization: `Bearer ${INTERNAL_JOB_SECRET}`,
    "X-Futrob-Actor-Id": actorId,
    "Content-Type": "application/json",
  };
}

export const stubFetch = createFetch(() => Response.json([]));

export const onboardingCompetition = {
  name: "Copa Inicial",
  gameEdition: "FC 26",
  platform: "playstation",
  region: "south-america",
  timeZone: "America/Lima",
  format: "league",
};
