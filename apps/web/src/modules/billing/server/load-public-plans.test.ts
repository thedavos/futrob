import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { loadPublicPlans, PUBLIC_PLANS_TIMEOUT_MS } from "./load-public-plans.ts";

/** A catalog request that never answers, but rejects as fetch does once its signal aborts. */
function stalledFetch(): { readonly fetchImpl: typeof fetch; readonly signals: AbortSignal[] } {
  const signals: AbortSignal[] = [];
  const fetchImpl: typeof fetch = (_input, init) =>
    new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (!signal) return;
      signals.push(signal);
      signal.addEventListener("abort", () => reject(signal.reason));
    });
  return { fetchImpl, signals };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("loadPublicPlans", () => {
  it("gives up on a stalled catalog and falls back to null", async () => {
    const { fetchImpl, signals } = stalledFetch();
    let settled = false;
    const plans = loadPublicPlans({ baseUrl: "http://api.test/api/v1", fetchImpl }).finally(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(PUBLIC_PLANS_TIMEOUT_MS - 1);
    expect(signals).toHaveLength(1);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(plans).resolves.toBeNull();
    expect(signals[0]?.aborted).toBe(true);
  });
});
