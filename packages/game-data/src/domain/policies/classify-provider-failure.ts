import type { ProviderHealthOutcome } from "../entities/provider-health.ts";
import {
  ExternalClubNotFound,
  ProviderHttpFailed,
  ProviderNetworkError,
  ProviderNotImplemented,
  ProviderRefreshInProgress,
  ProviderSchemaError,
  ProviderTimeout,
  ProviderUnavailable,
  UnsupportedGameDataOperation,
  type ProviderError,
} from "../errors/provider.errors.ts";

export function isRetryableProviderError(error: ProviderError): boolean {
  if (
    ProviderTimeout.is(error) ||
    ProviderNetworkError.is(error) ||
    ProviderUnavailable.is(error) ||
    ProviderRefreshInProgress.is(error)
  ) {
    return true;
  }
  return (
    ProviderHttpFailed.is(error) &&
    (error.status === 408 || error.status === 429 || error.status >= 500)
  );
}

/**
 * The provider could not give an answer, whatever was asked: transport failures, outages,
 * rate limits, refresh contention or a payload we cannot read. Callers that only enrich an
 * optional, declarative fact (e.g. a club association) may continue without it. A missing
 * club, an unsupported operation or a 4xx rejection describe the request itself and are not
 * outages.
 */
export function isProviderOutage(error: ProviderError): boolean {
  return isRetryableProviderError(error) || ProviderSchemaError.is(error);
}

export function providerHealthOutcome(error: ProviderError): ProviderHealthOutcome | null {
  if (ProviderTimeout.is(error)) return "timeout";
  if (ProviderNetworkError.is(error)) return "network";
  if (ProviderUnavailable.is(error)) return "circuit_open";
  if (ProviderSchemaError.is(error)) return "schema";
  if (ProviderHttpFailed.is(error)) {
    if (error.status === 429) return "rate_limited";
    return error.status >= 500 ? "upstream_5xx" : "upstream_4xx";
  }
  if (
    ProviderRefreshInProgress.is(error) ||
    ExternalClubNotFound.is(error) ||
    UnsupportedGameDataOperation.is(error) ||
    ProviderNotImplemented.is(error)
  ) {
    return null;
  }
  const _exhaustive: never = error;
  return _exhaustive;
}

export function providerRetryDelayMs(error: ProviderError, attempt: number): number {
  if (ProviderUnavailable.is(error) || ProviderRefreshInProgress.is(error)) {
    return error.retryAfterSeconds * 1_000;
  }
  if (ProviderHttpFailed.is(error) && error.retryAfterMs !== undefined) {
    return error.retryAfterMs;
  }
  return providerSyncRetryDelayMs(attempt);
}

export function providerSyncRetryDelayMs(attempt: number): number {
  return Math.min(30_000, 1_000 * 2 ** (attempt - 1));
}
