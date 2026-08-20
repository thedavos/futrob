import { describe, expect, it } from "vite-plus/test";
import { apiErrorSchema } from "../errors.ts";
import { futrobOpenApiV1 } from "./document.ts";
import {
  getOpenApiOperation,
  getOpenApiResponse,
  type OpenApiHttpMethod,
} from "./openapi-access.ts";

describe("rate-limit contract", () => {
  it("keeps retryAfterSeconds at the top level of an API error", () => {
    expect(
      apiErrorSchema.parse({
        code: "api.rate_limited",
        messageKey: "errors.api.rate_limited",
        requestId: "2170e2f6-a47e-4338-83c3-27c054630800",
        retryAfterSeconds: 42,
      }),
    ).toMatchObject({ retryAfterSeconds: 42 });
  });

  it.each([
    ["/game-data/clubs/search", "get"],
    ["/identity/onboarding/invitation", "post"],
    ["/organizations/invitations/accept", "post"],
    ["/competitions/invitations/accept", "post"],
    ["/roster-invitations/accept", "post"],
  ] as const satisfies ReadonlyArray<
    readonly [keyof typeof futrobOpenApiV1.paths, OpenApiHttpMethod]
  >)("documents 429 for %s", (path, method) => {
    const pathItem = futrobOpenApiV1.paths[path];
    const operation = getOpenApiOperation(pathItem, method);
    expect(getOpenApiResponse(operation, "429")).toEqual({
      $ref: "#/components/responses/RateLimited",
    });
  });

  it("documents Retry-After on the rate-limited response", () => {
    expect(futrobOpenApiV1.components.responses.RateLimited.headers).toMatchObject({
      "Retry-After": { $ref: "#/components/headers/RetryAfter" },
      "X-Request-ID": { $ref: "#/components/headers/RequestId" },
    });
  });
});
