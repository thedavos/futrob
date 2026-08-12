import { describe, expect, it } from "vite-plus/test";

import { runAction } from "./run-action.ts";

describe("runAction", () => {
  it("invokes the action", async () => {
    let called = false;
    runAction(async () => {
      called = true;
    });
    await Promise.resolve();
    expect(called).toBe(true);
  });

  it("swallows rejected actions", async () => {
    runAction(async () => {
      throw new Error("handled by caller");
    });
    await Promise.resolve();
  });
});
