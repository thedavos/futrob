import { describe, expect, it } from "vite-plus/test";
import { asActorId } from "@futrob/shared-kernel";
import { createProductApiClient } from "./product-api-client.ts";

describe("createProductApiClient", () => {
  it("forwards the BFF request ID to apps/api", async () => {
    const requestId = "131a71b1-2f96-4e0a-b28c-0af2175404b1";
    let receivedHeaders = new Headers();
    const fetchImpl: typeof fetch = async (_input, init) => {
      receivedHeaders = new Headers(init?.headers);
      return Response.json({
        completed: false,
        completedAt: null,
        version: 3,
        path: null,
        currentStep: null,
      });
    };

    const client = createProductApiClient({
      actorId: asActorId("actor-request-correlation"),
      internalJobSecret: "internal-secret",
      requestId,
      fetchImpl,
    });

    await client.identity.getOnboardingStatus();

    expect(receivedHeaders.get("x-request-id")).toBe(requestId);
  });
});
