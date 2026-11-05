import "../../src/http/openapi/zod-openapi-setup.ts";
import { AsyncLocalStorage } from "node:async_hooks";
import { createFutrobClient, FutrobApiError, type FutrobClient } from "@futrob/sdk";
import type { ClockPort } from "@futrob/shared-kernel";
import pg, { type Pool } from "pg";
import { createApp } from "../../src/app.ts";
import type { CorrelationLogger } from "../../src/context/request-correlation.ts";
import { createModules, type AppModules } from "../../src/di/create-modules.ts";
import type { DemoAccount } from "./accounts.ts";
import type { DemoEaWorld } from "./fake-ea.ts";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Clock the composition reads for "now". The seed moves it back to the moment each
 * story happened (a proposal 30 hours ago, a request that already expired), then
 * returns it to the real time.
 */
export class DemoClock implements ClockPort {
  // Per async flow, so stories seeded in parallel each keep their own "now".
  private readonly offset = new AsyncLocalStorage<number>();

  now(): Date {
    return new Date(Date.now() + (this.offset.getStore() ?? 0));
  }

  /** Runs `work` with the clock fixed at `at`. */
  at<T>(at: Date, work: () => Promise<T>): Promise<T> {
    return this.offset.run(at.getTime() - Date.now(), work);
  }
}

const quietLogger: CorrelationLogger = {
  info: () => undefined,
  error: (entry) => console.error("[api]", JSON.stringify(entry)),
};

export interface SeedContext {
  readonly pool: Pool;
  readonly modules: AppModules;
  readonly clock: DemoClock;
  readonly ea: DemoEaWorld;
  /** Seed start, the "now" every relative date is computed from. */
  readonly now: Date;
  readonly systemActorId: string;
  as(account: Pick<DemoAccount, "actorId">): FutrobClient;
  hoursAgo(hours: number): Date;
  daysFromNow(days: number, hourUtc?: number): Date;
  log(message: string): void;
  warn(message: string): void;
  readonly warnings: string[];
}

export function createSeedContext(input: {
  readonly pool: Pool;
  readonly ea: DemoEaWorld;
  readonly internalJobSecret: string;
  readonly systemActorId: string;
}): SeedContext {
  const clock = new DemoClock();
  const modules = createModules({
    fetcher: input.ea.fetcher(),
    eaClubsBaseUrl: "https://demo-ea.futrob.test/api/fc",
    pool: input.pool,
    clock,
    resultsSystemActorId: input.systemActorId,
    schedulingSystemActorId: input.systemActorId,
  });
  const app = createApp({
    modules,
    checkDbHealth: async () => "ok",
    internalJobSecret: input.internalJobSecret,
    correlationLogger: quietLogger,
  });
  const fetchImpl: typeof fetch = (request, init) =>
    Promise.resolve(app.fetch(new Request(request, init)));
  const now = new Date();
  const warnings: string[] = [];

  return {
    pool: input.pool,
    modules,
    clock,
    ea: input.ea,
    now,
    systemActorId: input.systemActorId,
    warnings,
    as(account) {
      const { actorId } = account;
      return createFutrobClient({
        baseUrl: "http://seed.futrob.test/api/v1",
        fetchImpl,
        getAccessToken: () => input.internalJobSecret,
        getExtraHeaders: () => ({ "X-Futrob-Actor-Id": actorId }),
      });
    },
    hoursAgo(hours) {
      return new Date(now.getTime() - hours * HOUR_MS);
    },
    daysFromNow(days, hourUtc) {
      const date = new Date(now.getTime() + days * DAY_MS);
      if (hourUtc !== undefined) date.setUTCHours(hourUtc, 0, 0, 0);
      return date;
    },
    log(message) {
      const elapsed = Math.round((Date.now() - now.getTime()) / 1000);
      console.log(`${message} (+${elapsed} s)`);
    },
    warn(message) {
      warnings.push(message);
      console.warn(`  ⚠ ${message}`);
    },
  };
}

/** Runs a step and records a warning instead of aborting the whole seed. */
export async function attempt<T>(
  context: SeedContext,
  label: string,
  work: () => Promise<T>,
): Promise<T | undefined> {
  try {
    return await work();
  } catch (error) {
    context.warn(`${label}: ${error instanceof Error ? describeError(error) : String(error)}`);
    return undefined;
  }
}

export function describeError(error: Error): string {
  if (error instanceof FutrobApiError) return `${error.status} · ${error.code} · ${error.message}`;
  if (error instanceof pg.DatabaseError) return `${error.code ?? "postgres"} · ${error.message}`;
  return error.message;
}
