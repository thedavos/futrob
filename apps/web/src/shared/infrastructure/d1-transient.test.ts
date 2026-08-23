import { describe, expect, it } from "vite-plus/test";
import { isTransientD1Error, retryTransientD1 } from "./d1-transient.ts";

describe("retryTransientD1", () => {
  it("retries Miniflare D1 internal errors then returns the value", async () => {
    const sleeps: number[] = [];
    let calls = 0;
    const result = await retryTransientD1(
      async () => {
        calls += 1;
        if (calls < 3) {
          throw new Error("D1_ERROR: Failed to parse body as JSON, got: Error: internal error");
        }
        return "ok";
      },
      {
        delayMs: 10,
        sleep: async (ms) => {
          sleeps.push(ms);
        },
      },
    );

    expect(result).toBe("ok");
    expect(calls).toBe(3);
    expect(sleeps).toEqual([10, 20]);
  });

  it("does not retry unrelated failures", async () => {
    let calls = 0;
    await expect(
      retryTransientD1(async () => {
        calls += 1;
        throw new Error("auth.unauthenticated");
      }),
    ).rejects.toThrow("auth.unauthenticated");
    expect(calls).toBe(1);
  });

  it("detects nested D1 causes", () => {
    const nested = new Error("DrizzleQueryError: Failed query");
    nested.cause = new Error("Failed to parse body as JSON, got: Error: internal error");
    expect(isTransientD1Error(nested)).toBe(true);
    expect(isTransientD1Error(new Error("no such table: user"))).toBe(false);
  });
});
