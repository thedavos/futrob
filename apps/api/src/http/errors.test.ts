import { describe, expect, it } from "vite-plus/test";
import {
  ProviderHttpFailed,
  ProviderNetworkError,
  ProviderSchemaError,
  ProviderUnavailable,
} from "@futrob/game-data";
import { failureToHttp } from "./errors.ts";

describe("game-data HTTP failures", () => {
  it("maps an open circuit to a retryable sanitized response", async () => {
    const response = failureToHttp(
      new ProviderUnavailable({
        code: "game_data.provider_unavailable",
        message: "unavailable",
        retryAfterSeconds: 37,
      }),
    );

    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("37");
    expect(await response.json()).toMatchObject({
      code: "game_data.provider_unavailable",
      retryAfterSeconds: 37,
    });
  });

  it("never includes an upstream response body", async () => {
    const response = failureToHttp(
      new ProviderHttpFailed({
        code: "game_data.ea_clubs_http_error",
        message: "failed",
        status: 503,
        path: "/clubs/info",
      }),
    );
    const body = await response.text();

    expect(body).not.toContain("upstream");
    expect(body).not.toContain("secret");
    expect(JSON.parse(body)).toMatchObject({ code: "game_data.ea_clubs_http_error" });
  });

  it("preserves safe Retry-After metadata without leaking provider causes or schema issues", async () => {
    const rateLimited = failureToHttp(
      new ProviderHttpFailed({
        code: "game_data.ea_clubs_http_error",
        message: "failed",
        status: 429,
        path: "/clubs/info",
        retryAfterMs: 120_000,
      }),
    );
    const network = failureToHttp(
      new ProviderNetworkError({
        code: "game_data.ea_clubs_network_error",
        message: "failed",
        path: "/clubs/info",
        cause: "https://secret.example.test?token=private",
      }),
    );
    const schema = failureToHttp(
      new ProviderSchemaError({
        code: "game_data.ea_clubs_schema_error",
        message: "failed",
        issues: [{ input: "secret-provider-value" }],
      }),
    );

    expect(rateLimited.headers.get("Retry-After")).toBe("120");
    expect(await rateLimited.json()).toMatchObject({ retryAfterSeconds: 120 });
    expect(await network.text()).not.toContain("secret.example");
    expect(await schema.text()).not.toContain("secret-provider-value");
  });
});
