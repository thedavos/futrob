import { describe, expect, it, vi } from "vite-plus/test";
import { createBffRequestCorrelation, withBffRequestCorrelation } from "./request-correlation.ts";

describe("BFF request correlation", () => {
  it("replaces an invalid external ID and adds the internal ID to the response", async () => {
    const generated = "7d1898ce-bf7e-4684-8bf4-b70ae625876c";
    const logger = { info: vi.fn<(entry: unknown) => void>() };
    const request = new Request("https://futrob.test/api/v1/identity/onboarding/player", {
      headers: { "X-Request-ID": "unsafe external value" },
    });

    const response = await withBffRequestCorrelation(
      request,
      async (correlation) => Response.json(correlation),
      { generateRequestId: () => generated, logger },
    );

    expect(await response.json()).toEqual({ requestId: generated });
    expect(response.headers.get("x-request-id")).toBe(generated);
    expect(logger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "bff.request.completed",
        path: "/api/v1/identity/onboarding/player",
        requestId: generated,
        status: 200,
      }),
    );
  });

  it("preserves a valid UUID from the trusted wire contract", () => {
    const requestId = "9b020aa7-9c5e-4cca-b8ea-daeb047c6dca";
    const request = new Request("https://futrob.test/api/v1/game-data/clubs/search", {
      headers: { "X-Request-ID": requestId },
    });

    expect(createBffRequestCorrelation(request)).toEqual({ requestId });
  });

  it("replaces an overlong request ID", () => {
    const generated = "325fc3e4-c655-48af-b425-c5f16409ec59";
    const request = new Request("https://futrob.test/api/v1/game-data/clubs/search", {
      headers: { "X-Request-ID": "a".repeat(500) },
    });

    expect(createBffRequestCorrelation(request, () => generated)).toEqual({
      requestId: generated,
    });
  });
});
