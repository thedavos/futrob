import { describe, expect, it } from "vite-plus/test";
import { ProviderHttpFailed, ProviderUnavailable } from "@futrob/game-data";
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
});
