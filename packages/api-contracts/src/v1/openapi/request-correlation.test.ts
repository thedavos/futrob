import { describe, expect, it } from "vite-plus/test";
import { requestIdSchema } from "../request-correlation.ts";
import { futrobOpenApiV1 } from "./document.ts";
import {
  getOpenApiOperation,
  isInlineOpenApiResponse,
  OPENAPI_HTTP_METHODS,
} from "./openapi-access.ts";

describe("request correlation contract", () => {
  it("accepts only UUID request IDs", () => {
    expect(requestIdSchema.safeParse("2170e2f6-a47e-4338-83c3-27c054630800").success).toBe(true);
    expect(requestIdSchema.safeParse("not-a-request-id").success).toBe(false);
  });

  it("documents the request header and correlated API errors", () => {
    expect(futrobOpenApiV1.components.parameters.RequestId).toMatchObject({
      in: "header",
      name: "X-Request-ID",
      required: false,
      schema: { format: "uuid", type: "string" },
    });
    expect(futrobOpenApiV1.components.schemas.ApiError.properties.requestId).toEqual({
      format: "uuid",
      type: "string",
    });
    expect(futrobOpenApiV1.components.responses.ApiError.headers).toEqual({
      "X-Request-ID": { $ref: "#/components/headers/RequestId" },
    });
  });

  it("documents correlation for every operation and inline response", () => {
    let operationCount = 0;

    for (const pathItem of Object.values(futrobOpenApiV1.paths)) {
      for (const method of OPENAPI_HTTP_METHODS) {
        const operation = getOpenApiOperation(pathItem, method);
        if (!operation) continue;
        operationCount += 1;

        expect(operation.parameters).toContainEqual({
          $ref: "#/components/parameters/RequestId",
        });

        const responses = operation.responses;
        if (!responses) continue;

        for (const response of Object.values(responses)) {
          if (!isInlineOpenApiResponse(response)) continue;
          expect(response.headers).toMatchObject({
            "X-Request-ID": { $ref: "#/components/headers/RequestId" },
          });
        }
      }
    }

    expect(operationCount).toBeGreaterThan(30);
  });
});
