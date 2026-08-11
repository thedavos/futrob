import { describe, expect, it } from "vite-plus/test";
import { requestIdSchema } from "../request-correlation.ts";
import { futrobOpenApiV1 } from "./document.ts";

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

  it.each([
    ["search clubs", futrobOpenApiV1.paths["/game-data/clubs/search"].get],
    ["organization finish", futrobOpenApiV1.paths["/identity/onboarding/organization"].post],
    ["invitation finish", futrobOpenApiV1.paths["/identity/onboarding/invitation"].post],
    ["player finish", futrobOpenApiV1.paths["/identity/onboarding/player"].post],
  ] as const)("documents correlation for %s", (_name, operation) => {
    expect(operation.parameters).toContainEqual({ $ref: "#/components/parameters/RequestId" });
    expect(operation.responses["200"].headers).toEqual({
      "X-Request-ID": { $ref: "#/components/headers/RequestId" },
    });
  });
});
