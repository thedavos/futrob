import { describe, expect, it } from "vite-plus/test";
import {
  ProviderHttpFailed,
  ProviderRefreshInProgress,
  ProviderSchemaError,
  ProviderTimeout,
  ProviderUnavailable,
} from "../errors/provider.errors.ts";
import {
  isRetryableProviderError,
  providerHealthOutcome,
  providerRetryDelayMs,
} from "./classify-provider-failure.ts";

describe("classifyProviderFailure", () => {
  it("treats transport, circuit, and refresh contention as retryable", () => {
    expect(
      isRetryableProviderError(
        new ProviderTimeout({
          code: "game_data.ea_clubs_timeout",
          message: "timeout",
          path: "/clubs/info",
          cause: "aborted",
        }),
      ),
    ).toBe(true);
    expect(
      isRetryableProviderError(
        new ProviderUnavailable({
          code: "game_data.provider_unavailable",
          message: "open",
          retryAfterSeconds: 60,
        }),
      ),
    ).toBe(true);
    expect(
      isRetryableProviderError(
        new ProviderRefreshInProgress({
          code: "game_data.provider_refresh_in_progress",
          message: "refresh",
          retryAfterSeconds: 1,
        }),
      ),
    ).toBe(true);
    expect(
      isRetryableProviderError(
        new ProviderSchemaError({
          code: "game_data.ea_clubs_schema_error",
          message: "schema",
          issues: [],
        }),
      ),
    ).toBe(false);
  });

  it("maps failures to health outcomes without treating cache locks as an open circuit", () => {
    expect(
      providerHealthOutcome(
        new ProviderUnavailable({
          code: "game_data.provider_unavailable",
          message: "open",
          retryAfterSeconds: 60,
        }),
      ),
    ).toBe("circuit_open");
    expect(
      providerHealthOutcome(
        new ProviderRefreshInProgress({
          code: "game_data.provider_refresh_in_progress",
          message: "refresh",
          retryAfterSeconds: 1,
        }),
      ),
    ).toBeNull();
    expect(
      providerHealthOutcome(
        new ProviderHttpFailed({
          code: "game_data.ea_clubs_http_error",
          message: "limited",
          status: 429,
          path: "/clubs/info",
        }),
      ),
    ).toBe("rate_limited");
  });

  it("honors Retry-After before falling back to exponential delay", () => {
    expect(
      providerRetryDelayMs(
        new ProviderUnavailable({
          code: "game_data.provider_unavailable",
          message: "open",
          retryAfterSeconds: 60,
        }),
        1,
      ),
    ).toBe(60_000);
    expect(
      providerRetryDelayMs(
        new ProviderHttpFailed({
          code: "game_data.ea_clubs_http_error",
          message: "limited",
          status: 429,
          path: "/clubs/info",
          retryAfterMs: 120_000,
        }),
        1,
      ),
    ).toBe(120_000);
    expect(
      providerRetryDelayMs(
        new ProviderTimeout({
          code: "game_data.ea_clubs_timeout",
          message: "timeout",
          path: "/clubs/info",
          cause: "aborted",
        }),
        3,
      ),
    ).toBe(4_000);
  });
});
