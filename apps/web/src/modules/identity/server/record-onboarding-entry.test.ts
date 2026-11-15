import { describe, expect, it, vi } from "vite-plus/test";
import type { OnboardingStatusDto } from "@futrob/api-contracts";
import { recordOnboardingEntry } from "./record-onboarding-entry.ts";

const status = (patch: Partial<OnboardingStatusDto>): OnboardingStatusDto => ({
  completed: false,
  completedAt: null,
  version: null,
  path: null,
  currentStep: "intention",
  ...patch,
});

describe("recordOnboardingEntry", () => {
  it("records intention for an actor who has not chosen a path", async () => {
    const save = vi.fn(async () => status({}));
    await recordOnboardingEntry(status({}), save);
    expect(save).toHaveBeenCalledWith({ path: null, currentStep: "intention" });
  });

  it("writes nothing once a path was chosen or onboarding finished", async () => {
    const save = vi.fn(async () => status({}));
    await recordOnboardingEntry(status({ path: "player", currentStep: "club" }), save);
    await recordOnboardingEntry(
      status({
        completed: true,
        completedAt: "2026-11-01T00:00:00.000Z",
        version: 3,
        currentStep: null,
      }),
      save,
    );
    expect(save).not.toHaveBeenCalled();
  });

  it("never fails onboarding when the write fails", async () => {
    await expect(
      recordOnboardingEntry(status({}), async () => {
        throw new Error("api down");
      }),
    ).resolves.toBeUndefined();
  });
});
