import { describe, expect, it } from "vite-plus/test";
import { FutrobApiError } from "@futrob/sdk";
import { productApiBffErrorResponse } from "./product-api-bff-error-response.ts";
import { ProductApiUnreachableError } from "./product-api-client.ts";
import { BffRateLimitUnavailableError } from "@/shared/infrastructure/rate-limit/enforce-bff-rate-limit.ts";

describe("productApiBffErrorResponse", () => {
  it("keeps the BFF request ID when the downstream error disagrees", async () => {
    const requestId = "74f18440-1a23-46a6-ad9b-e734889a3691";
    const error = new FutrobApiError({
      status: 502,
      body: {
        code: "game_data.ea_clubs_http_error",
        messageKey: "errors.game_data.ea_clubs_http_error",
        requestId: "90591463-291a-4025-ab8c-f646ffc7f1af",
      },
    });

    const response = productApiBffErrorResponse(error, requestId);

    expect(response.headers.get("x-request-id")).toBe(requestId);
    expect(await response.json()).toMatchObject({
      code: "game_data.ea_clubs_http_error",
      requestId,
    });
  });

  it("sanitizes unexpected BFF failures when correlation is active", async () => {
    const requestId = "6ac06d3e-105e-44d6-88b5-8955978b636b";

    const response = productApiBffErrorResponse(new Error("secret database detail"), requestId);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      code: "api.unexpected_error",
      messageKey: "errors.api.unexpected_error",
      requestId,
    });
  });

  it("returns a sanitized 503 when rate-limit infrastructure is unavailable", async () => {
    const requestId = "6128b21e-92a7-4dd7-b4df-5b044325203b";

    const response = productApiBffErrorResponse(new BffRateLimitUnavailableError(), requestId);

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      code: "api.rate_limit_unavailable",
      messageKey: "errors.api.rate_limit_unavailable",
      requestId,
    });
  });

  it("returns a sanitized 503 when the product API is unreachable", async () => {
    const requestId = "9c1d0a3e-2f7b-4c8a-9d1e-6b5a4c3d2e1f";
    const response = productApiBffErrorResponse(new ProductApiUnreachableError(), requestId);

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      code: "product_api.unreachable",
      messageKey: "errors.product_api.unreachable",
      requestId,
    });
  });

  it("sanitizes unexpected BFF failures without a request ID", async () => {
    const response = productApiBffErrorResponse(new Error("secret database detail"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      code: "api.unexpected_error",
      messageKey: "errors.api.unexpected_error",
    });
  });
});
