import { describe, expect, it } from "vite-plus/test";

import { runAction } from "./run-action.ts";

describe("runAction", () => {
  it("swallows rejected actions", async () => {
    let rejected = false;
    runAction(async () => {
      rejected = true;
      throw new Error("handled by caller");
    });
    await Promise.resolve();
    expect(rejected).toBe(true);
  });
});
