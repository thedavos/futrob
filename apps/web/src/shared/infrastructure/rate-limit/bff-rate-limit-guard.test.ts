import { describe, expect, it, vi } from "vite-plus/test";
import { asActorId } from "@futrob/shared-kernel";
import { BFF_RATE_LIMIT_POLICY } from "./bff-rate-limiter.ts";
import { runRateLimitedBffRequest } from "./bff-rate-limit-guard.ts";

const requestId = "f7ed4ae3-9bf7-47ba-981d-a7c59fd3d33d";

describe("runRateLimitedBffRequest", () => {
  it("authenticates before checking the limit", async () => {
    const events: string[] = [];

    await runRateLimitedBffRequest({
      request: new Request("https://futrob.test/api/v1/game-data/clubs/search"),
      policy: BFF_RATE_LIMIT_POLICY.eaClubSearch,
      authenticate: async () => {
        events.push("authenticate");
        return { actorId: asActorId("actor-1"), requestId };
      },
      enforce: async () => {
        events.push("rate-limit");
        return undefined;
      },
      next: async () => {
        events.push("upstream");
        return new Response(null, { status: 204 });
      },
    });

    expect(events).toEqual(["authenticate", "rate-limit", "upstream"]);
  });

  it("does not check the limit or call upstream when authentication fails", async () => {
    const enforce = vi.fn<() => Promise<undefined>>();
    const upstream = vi.fn<() => Promise<Response>>();

    await expect(
      runRateLimitedBffRequest({
        request: new Request("https://futrob.test/api/v1/game-data/clubs/search"),
        policy: BFF_RATE_LIMIT_POLICY.eaClubSearch,
        authenticate: async () => {
          throw new Error("unauthenticated");
        },
        enforce,
        next: upstream,
      }),
    ).rejects.toThrow("unauthenticated");
    expect(enforce).not.toHaveBeenCalled();
    expect(upstream).not.toHaveBeenCalled();
  });

  it("returns 429 without calling upstream when the limit is exceeded", async () => {
    const upstream = vi.fn<() => Promise<Response>>();
    const limited = Response.json({ code: "api.rate_limited" }, { status: 429 });

    const response = await runRateLimitedBffRequest({
      request: new Request("https://futrob.test/api/v1/game-data/clubs/search"),
      policy: BFF_RATE_LIMIT_POLICY.eaClubSearch,
      authenticate: async () => ({ actorId: asActorId("actor-1"), requestId }),
      enforce: async () => limited,
      next: upstream,
    });

    expect(response).toBe(limited);
    expect(upstream).not.toHaveBeenCalled();
  });
});
