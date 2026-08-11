import { describe, expect, it } from "vite-plus/test";
import { ProviderHttpFailed, ProviderUnavailable } from "@futrob/game-data";
import { providerJobRetryDelayMs } from "./game-data.module.ts";

describe("providerJobRetryDelayMs", () => {
  it("keeps jobs dormant for provider and Retry-After cooldowns", () => {
    expect(
      providerJobRetryDelayMs(
        new ProviderUnavailable({
          code: "game_data.provider_unavailable",
          message: "open",
          retryAfterSeconds: 60,
        }),
        1,
      ),
    ).toBe(60_000);
    expect(
      providerJobRetryDelayMs(
        new ProviderHttpFailed({
          code: "game_data.ea_clubs_http_error",
          message: "rate limited",
          status: 429,
          path: "/clubs/matches",
          retryAfterMs: 120_000,
        }),
        1,
      ),
    ).toBe(120_000);
  });
});
