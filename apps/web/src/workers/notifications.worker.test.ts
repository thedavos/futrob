import { describe, expect, it } from "vite-plus/test";
import { handleNotificationJob, type NotificationQueueMessage } from "./notifications.worker.ts";

describe("handleNotificationJob", () => {
  it("is an explicit MVP stub that rejects until implemented", async () => {
    const message: NotificationQueueMessage = {};
    await expect(handleNotificationJob(message)).rejects.toThrow(
      "notifications.worker: not implemented",
    );
  });
});
