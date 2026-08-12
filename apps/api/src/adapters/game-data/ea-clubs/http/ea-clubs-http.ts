import { err, ok, type Result } from "@futrob/shared-kernel";
import { randomUUID } from "node:crypto";
import {
  ProviderHttpFailed,
  ProviderNetworkError,
  ProviderTimeout,
  ProviderUnavailable,
  type ProviderTransportError,
} from "@futrob/game-data";
import { logCorrelatedError, logCorrelatedInfo } from "@/context/request-correlation.ts";
import {
  InMemoryProviderCircuitBreaker,
  type ProviderCircuitBreaker,
} from "@/adapters/game-data/resilience/provider-circuit-breaker.ts";

/**
 * EA's edge (Akamai) rejects bare API clients with 403 Access Denied.
 * Browser-like UA + Sec-Fetch-* is enough for the public search endpoints.
 */
export const EA_CLUBS_REQUEST_HEADERS = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:151.0) Gecko/20100101 Firefox/151.0",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
} as const;

export interface EaClubsHttpClientOptions {
  readonly fetcher: typeof fetch;
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly retry?: {
    readonly maxAttempts: number;
    readonly baseDelayMs: number;
    readonly maxDelayMs: number;
    readonly sleep: (delayMs: number) => Promise<void>;
    readonly random: () => number;
  };
  readonly circuit?: ProviderCircuitBreaker;
  readonly clock?: { now(): Date };
}

export class EaClubsHttpClient {
  private readonly fetcher: typeof fetch;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly retry: NonNullable<EaClubsHttpClientOptions["retry"]>;
  private readonly circuit: ProviderCircuitBreaker;
  private readonly clock: { now(): Date };

  constructor(options: EaClubsHttpClientOptions) {
    const unbound = options.fetcher;
    this.fetcher = ((input, init) => unbound(input, init)) as typeof fetch;
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs;
    this.retry =
      options.retry ??
      ({
        maxAttempts: 3,
        baseDelayMs: 250,
        maxDelayMs: 2_000,
        sleep: (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)),
        random: Math.random,
      } satisfies NonNullable<EaClubsHttpClientOptions["retry"]>);
    this.circuit = options.circuit ?? new InMemoryProviderCircuitBreaker();
    this.clock = options.clock ?? { now: () => new Date() };
  }

  async getJson(
    path: string,
    query: Record<string, string | number | undefined>,
  ): Promise<Result<unknown, ProviderTransportError>> {
    const url = new URL(`${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    const circuitKey = `ea-clubs:${path}`;
    const now = this.clock.now();
    const permission = await this.circuit.beforeRequest({
      key: circuitKey,
      now,
      probeLeaseToken: randomUUID(),
      probeLeaseExpiresAt: new Date(now.getTime() + 10_000),
    });
    if (!permission.allowed) {
      return err(
        new ProviderUnavailable({
          code: "game_data.provider_unavailable",
          message: "EA Clubs is temporarily unavailable",
          retryAfterSeconds: Math.max(1, Math.ceil(permission.retryAfterMs / 1_000)),
        }),
      );
    }

    let lastError: ProviderTransportError | undefined;
    for (let attempt = 1; attempt <= this.retry.maxAttempts; attempt += 1) {
      const result = await this.requestOnce(url, path, attempt);
      if (result.isOk()) {
        await this.circuit.recordSuccess({ key: circuitKey, now: this.clock.now() });
        return result;
      }
      lastError = result.error;
      if (!isTransient(result.error) || attempt === this.retry.maxAttempts) break;
      const retryAfterMs = ProviderHttpFailed.is(result.error)
        ? result.error.retryAfterMs
        : undefined;
      const exponential = Math.min(
        this.retry.maxDelayMs,
        this.retry.baseDelayMs * 2 ** (attempt - 1),
      );
      await this.retry.sleep(retryAfterMs ?? Math.floor(exponential * this.retry.random()));
    }
    if (!lastError) throw new TypeError("Provider request completed without a result");
    if (isTransient(lastError)) {
      await this.circuit.recordTransientFailure({
        key: circuitKey,
        now: this.clock.now(),
        failureThreshold: 3,
        cooldownMs: 60_000,
      });
    }
    return err(lastError);
  }

  private async requestOnce(
    url: URL,
    path: string,
    attempt: number,
  ): Promise<Result<unknown, ProviderTransportError>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    const startedAt = performance.now();

    try {
      const response = await this.fetcher(url.toString(), {
        method: "GET",
        headers: { ...EA_CLUBS_REQUEST_HEADERS },
        signal: controller.signal,
      });

      logCorrelatedInfo("provider.request.completed", {
        provider: "ea-clubs",
        operation: path,
        status: response.status,
        durationMs: Math.round(performance.now() - startedAt),
        attempt,
      });

      if (!response.ok) {
        return err(
          new ProviderHttpFailed({
            code: "game_data.ea_clubs_http_error",
            message: "EA Clubs request failed",
            status: response.status,
            path,
            retryAfterMs: parseRetryAfter(response.headers.get("retry-after"), this.clock.now()),
          }),
        );
      }

      const raw: unknown = await response.json().catch(() => null);
      return ok(raw);
    } catch (cause) {
      const aborted = cause instanceof Error && cause.name === "AbortError";
      const causeText = cause instanceof Error ? cause.message : String(cause);
      logCorrelatedError("provider.request.failed", {
        provider: "ea-clubs",
        operation: path,
        errorName: aborted ? "TimeoutError" : cause instanceof Error ? cause.name : "UnknownError",
        durationMs: Math.round(performance.now() - startedAt),
        attempt,
      });
      return err(
        aborted
          ? new ProviderTimeout({
              code: "game_data.ea_clubs_timeout",
              message: "EA Clubs request timed out",
              path,
              cause: causeText,
            })
          : new ProviderNetworkError({
              code: "game_data.ea_clubs_network_error",
              message: "EA Clubs network error",
              path,
              cause: causeText,
            }),
      );
    } finally {
      clearTimeout(timer);
    }
  }
}

function isTransient(error: ProviderTransportError): boolean {
  return (
    ProviderTimeout.is(error) ||
    ProviderNetworkError.is(error) ||
    (ProviderHttpFailed.is(error) &&
      (error.status === 408 || error.status === 429 || error.status >= 500))
  );
}

function parseRetryAfter(value: string | null, now: Date): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - now.getTime()) : undefined;
}
