import { describe, expect, it } from "vite-plus/test";
import {
  handleStatisticsProjectionJob,
  type StatisticsProjectionQueueMessage,
} from "./statistics-projection.worker.ts";

describe("handleStatisticsProjectionJob", () => {
  it("is an explicit MVP stub that rejects until implemented", async () => {
    const message: StatisticsProjectionQueueMessage = {};
    await expect(handleStatisticsProjectionJob(message)).rejects.toThrow(
      "statistics-projection.worker: not implemented",
    );
  });
});
