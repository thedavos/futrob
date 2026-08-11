import { describe, expect, it } from "vite-plus/test";
import { GetProviderHealthUseCase } from "./get-provider-health.use-case.ts";

describe("GetProviderHealthUseCase", () => {
  it("returns only the sanitized provider snapshot", async () => {
    const useCase = new GetProviderHealthUseCase({
      getSnapshot: async () => ({
        providerKey: "ea-clubs",
        status: "degraded",
        circuitState: "closed",
        observedAt: new Date("2026-08-11T20:00:00.000Z"),
        windowStartedAt: new Date("2026-08-10T20:00:00.000Z"),
        sampleSize: 10,
        lastSuccessfulAt: new Date("2026-08-11T19:59:00.000Z"),
        lastFailureAt: new Date("2026-08-11T19:59:30.000Z"),
        averageLatencyMs: 420,
        successCount: 8,
        failureCount: 2,
        cache: { hits: 6, misses: 2, stale: 1 },
      }),
      record: async () => undefined,
    });

    await expect(useCase.execute("ea-clubs")).resolves.toMatchObject({
      providerKey: "ea-clubs",
      status: "degraded",
      cache: { hits: 6, misses: 2, stale: 1 },
    });
  });
});
