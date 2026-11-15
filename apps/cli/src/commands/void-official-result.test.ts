import { Effect } from "effect";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { run } from "./void-official-result.ts";

afterEach(() => vi.unstubAllGlobals());
it("requires a result identifier", async () => {
  const outcome = await Effect.runPromiseExit(run([]));
  expect(outcome._tag).toBe("Failure");
});
it("calls the SDK endpoint with the trusted CLI actor and reason", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url, init) => {
      expect(String(url)).toBe("https://api.test/api/v1/official-results/result-1/void");
      expect(new Headers(init.headers).get("X-Futrob-Actor-Id")).toBe("operator");
      expect(JSON.parse(init.body)).toEqual({ reason: "Correction" });
      return Response.json({
        id: "result-1",
        status: "voided",
        revision: 1,
        approvalBasis: null,
        proposalId: null,
        approvedAt: "2026-10-01T00:00:00.000Z",
      });
    }),
  );
  expect(
    await Effect.runPromise(
      run([
        "result-1",
        "--actor",
        "operator",
        "--reason",
        "Correction",
        "--base-url",
        "https://api.test/api/v1",
      ]),
    ),
  ).toBe(0);
});
