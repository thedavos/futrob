import type {
  GameDataProviderKeyQuery,
  ProviderHealthResponse,
  RequestId,
} from "@futrob/api-contracts";
import { err, ok, TaggedError, type Result } from "@futrob/shared-kernel";

export class ProviderHealthClientError extends TaggedError("ProviderHealthClientError")<{
  code: string;
  message: string;
  requestId?: RequestId;
  status: number;
}> {}

export type ProviderHealthStoryScenario = "ready" | "empty" | "loading" | "error" | "denied";

const ready: ProviderHealthResponse = {
  providerKey: "ea-clubs",
  status: "degraded",
  circuitState: "half_open",
  observedAt: "2026-10-28T12:00:00.000Z",
  windowStartedAt: "2026-10-28T11:00:00.000Z",
  sampleSize: 10,
  lastSuccessfulAt: "2026-10-28T11:59:00.000Z",
  lastFailureAt: "2026-10-28T11:58:00.000Z",
  averageLatencyMs: 250,
  successCount: 8,
  failureCount: 2,
  cache: { hits: 3, misses: 1, stale: 0 },
};

const empty: ProviderHealthResponse = {
  ...ready,
  status: "unknown",
  circuitState: "closed",
  sampleSize: 0,
  successCount: 0,
  failureCount: 0,
  averageLatencyMs: null,
  lastSuccessfulAt: null,
  lastFailureAt: null,
  cache: { hits: 0, misses: 0, stale: 0 },
};

let scenario: ProviderHealthStoryScenario = "ready";

export function setProviderHealthStoryScenario(next: ProviderHealthStoryScenario): void {
  scenario = next;
}

function hang(signal: AbortSignal | undefined): Promise<never> {
  return new Promise((_resolve, reject) => {
    const abort = () => reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener("abort", abort, { once: true });
  });
}

export const providerHealthBrowserClient = {
  async get(
    _providerKey: GameDataProviderKeyQuery,
    options: { readonly signal?: AbortSignal } = {},
  ): Promise<Result<ProviderHealthResponse, ProviderHealthClientError>> {
    switch (scenario) {
      case "loading":
        return hang(options.signal);
      case "denied":
        return err(
          new ProviderHealthClientError({
            code: "authorization.forbidden",
            message: "authorization.forbidden",
            status: 403,
          }),
        );
      case "error":
        return err(
          new ProviderHealthClientError({
            code: "api.internal_error",
            message: "api.internal_error",
            status: 500,
          }),
        );
      case "empty":
        return ok(empty);
      case "ready":
        return ok(ready);
      default: {
        const exhaustive: never = scenario;
        return exhaustive;
      }
    }
  },
};
