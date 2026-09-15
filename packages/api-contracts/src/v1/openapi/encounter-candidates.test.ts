import { describe, expect, it } from "vite-plus/test";
import { futrobOpenApiV1 } from "./document.ts";

describe("encounter candidates OpenAPI contract", () => {
  it("registers the authenticated read endpoint and retryable unavailable response", () => {
    expect(futrobOpenApiV1.paths["/encounters/{encounterId}/candidates"].get).toMatchObject({
      operationId: "listEncounterCandidates",
      responses: {
        "200": {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ListEncounterCandidatesResponse" },
            },
          },
        },
        "503": { $ref: "#/components/responses/ApiError" },
      },
    });
    expect(futrobOpenApiV1.security).toEqual([{ bearerAuth: [] }]);
  });
});
