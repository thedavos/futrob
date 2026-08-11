import { describe, expect, it, vi } from "vite-plus/test";
import { createBffRequestCorrelation, withBffRequestCorrelation } from "./request-correlation.ts";

describe("BFF request correlation", () => {
  it("replaces an invalid external ID and adds the internal ID to the response", async () => {
    const generated = "7d1898ce-bf7e-4684-8bf4-b70ae625876c";
    const logger = {
      info: vi.fn<(entry: unknown) => void>(),
      error: vi.fn<(entry: unknown) => void>(),
    };
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
    expect(logger.error).not.toHaveBeenCalled();
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

  it("uses one correlation for nested route wrappers and repairs a mismatched error body", async () => {
    const requestId = "866b422f-3134-4548-9954-7316c3b0c921";
    const logger = {
      info: vi.fn<(entry: unknown) => void>(),
      error: vi.fn<(entry: unknown) => void>(),
    };
    const request = new Request("https://futrob.test/api/v1/players/me");

    const response = await withBffRequestCorrelation(
      request,
      () =>
        withBffRequestCorrelation(request, async ({ requestId: nestedRequestId }) => {
          expect(nestedRequestId).toBe(requestId);
          return Response.json(
            {
              code: "auth.unauthenticated",
              messageKey: "errors.auth.unauthenticated",
              requestId: "6a057207-52e1-447a-a232-58d9afd9bd77",
            },
            { status: 401 },
          );
        }),
      { generateRequestId: () => requestId, logger },
    );

    expect(response.headers.get("x-request-id")).toBe(requestId);
    expect(await response.json()).toMatchObject({ requestId });
    expect(logger.info).toHaveBeenCalledTimes(1);
  });

  it("sanitizes an unhandled API failure", async () => {
    const requestId = "e426baf0-8151-4930-bcd0-5690b97c53f7";
    const logger = {
      info: vi.fn<(entry: unknown) => void>(),
      error: vi.fn<(entry: unknown) => void>(),
    };
    const request = new Request("https://futrob.test/api/v1/players/me");

    const response = await withBffRequestCorrelation(
      request,
      async () => {
        throw new Error("private database detail");
      },
      { generateRequestId: () => requestId, logger },
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      code: "api.unexpected_error",
      messageKey: "errors.api.unexpected_error",
      requestId,
    });
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ errorName: "Error", requestId }),
    );
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain("private database detail");
  });
});
