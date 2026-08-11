import { describe, expect, it } from "vite-plus/test";
import {
  createRequestCorrelation,
  currentRequestCorrelation,
  logCorrelatedInfo,
  runWithRequestCorrelation,
  type CorrelationLogEntry,
} from "./request-correlation.ts";

describe("request correlation context", () => {
  it.each(["not-a-uuid", "a".repeat(500), "unsafe\nvalue"])(
    "replaces an untrusted request ID: %j",
    (candidate) => {
      const correlation = createRequestCorrelation(candidate);

      expect(correlation.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(correlation.requestId).not.toBe(candidate);
    },
  );

  it("keeps a generated job correlation ID stable across async work", async () => {
    const correlation = createRequestCorrelation();
    const entries: CorrelationLogEntry[] = [];

    await runWithRequestCorrelation(
      correlation,
      { info: (entry) => entries.push(entry), error: (entry) => entries.push(entry) },
      async () => {
        await Promise.resolve();
        logCorrelatedInfo("job.attempt.completed");
        expect(currentRequestCorrelation()).toEqual(correlation);
      },
    );

    expect(entries).toEqual([{ event: "job.attempt.completed", requestId: correlation.requestId }]);
  });

  it("does not let log fields replace the active request ID", () => {
    const correlation = createRequestCorrelation("68f0cadb-269b-48e9-8f23-52b50bff2595");
    const entries: CorrelationLogEntry[] = [];

    runWithRequestCorrelation(
      correlation,
      { info: (entry) => entries.push(entry), error: (entry) => entries.push(entry) },
      () => logCorrelatedInfo("provider.request.completed", { requestId: "spoofed" }),
    );

    expect(entries[0]?.requestId).toBe(correlation.requestId);
  });
});
