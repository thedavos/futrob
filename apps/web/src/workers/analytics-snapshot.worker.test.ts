import { describe, expect, it } from "vite-plus/test";
import {
  handleAnalyticsSnapshotJob,
  type AnalyticsSnapshotQueueMessage,
} from "./analytics-snapshot.worker.ts";

describe("handleAnalyticsSnapshotJob", () => {
  it("is an explicit MVP stub that rejects until implemented", async () => {
    const message: AnalyticsSnapshotQueueMessage = {};
    await expect(handleAnalyticsSnapshotJob(message)).rejects.toThrow(
      "analytics-snapshot.worker: not implemented",
    );
  });
});
