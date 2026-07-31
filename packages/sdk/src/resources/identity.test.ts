import { describe, expect, it } from "vite-plus/test";
import { createFutrobClient } from "../client.ts";

describe("createFutrobClient identity", () => {
  it("saves onboarding progress with PATCH and parses the resume point", async () => {
    let method: string | undefined;
    let body: unknown;
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: (async (_input, init) => {
        method = init?.method;
        if (typeof init?.body !== "string") {
          throw new TypeError("Expected a JSON request body");
        }
        body = JSON.parse(init.body);
        return Response.json({
          completed: false,
          completedAt: null,
          version: null,
          path: "player",
          currentStep: "game-account",
        });
      }) as typeof fetch,
    });

    const result = await client.identity.saveOnboardingProgress({
      path: "player",
      currentStep: "game-account",
    });

    expect(method).toBe("PATCH");
    expect(body).toEqual({ path: "player", currentStep: "game-account" });
    expect(result.currentStep).toBe("game-account");
  });
});
