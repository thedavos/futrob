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

  it("uses an explicit product API base URL", async () => {
    let requestedUrl = "";
    const fetchImpl: typeof fetch = async (input) => {
      requestedUrl = String(input);
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
      requestId: "131a71b1-2f96-4e0a-b28c-0af2175404b1",
      baseUrl: "http://127.0.0.1:8787/api/v1",
      fetchImpl,
    });

    await client.identity.getOnboardingStatus();

    expect(requestedUrl).toBe("http://127.0.0.1:8787/api/v1/identity/onboarding");
  });

  it("maps transport failures to ProductApiUnreachableError", async () => {
    const client = createProductApiClient({
      actorId: asActorId("actor-request-correlation"),
      internalJobSecret: "internal-secret",
      requestId: "131a71b1-2f96-4e0a-b28c-0af2175404b1",
      fetchImpl: async () => {
        throw new TypeError("Network connection lost");
      },
    });

    await expect(client.identity.getOnboardingStatus()).rejects.toMatchObject({
      name: "ProductApiUnreachableError",
      code: "product_api.unreachable",
    });
  });

  it("does not map AbortError to ProductApiUnreachableError", async () => {
    const abort = new Error("Aborted");
    abort.name = "AbortError";
    const client = createProductApiClient({
      actorId: asActorId("actor-request-correlation"),
      internalJobSecret: "internal-secret",
      requestId: "131a71b1-2f96-4e0a-b28c-0af2175404b1",
      fetchImpl: async () => {
        throw abort;
      },
    });

    await expect(client.identity.getOnboardingStatus()).rejects.toBe(abort);
  });
});
