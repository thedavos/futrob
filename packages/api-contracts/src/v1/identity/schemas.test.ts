import { describe, expect, it } from "vite-plus/test";

import {
  onboardingStatusSchema,
  onboardingStepSchema,
  saveOnboardingProgressRequestSchema,
} from "./schemas.ts";

describe("identity onboarding step contract", () => {
  it("uses club as the canonical player step", () => {
    expect(onboardingStepSchema.parse("club")).toBe("club");
    expect(onboardingStepSchema.safeParse("team").success).toBe(false);
  });

  it("normalizes the legacy private progress input without emitting it", () => {
    expect(
      saveOnboardingProgressRequestSchema.parse({ path: "player", currentStep: "team" }),
    ).toEqual({ path: "player", currentStep: "club" });
    expect(
      onboardingStatusSchema.safeParse({
        completed: false,
        completedAt: null,
        version: null,
        path: "player",
        currentStep: "team",
      }).success,
    ).toBe(false);
  });
});
