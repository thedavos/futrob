import { describe, expect, it } from "vite-plus/test";

import {
  ONBOARDING_STEPS_BY_PATH,
  isOnboardingStepAllowed,
  nextOnboardingStep,
  onboardingPathSchema,
  onboardingStepSchema,
  previousOnboardingStep,
  saveOnboardingProgressRequestSchema,
  type OnboardingStepDto,
} from "./schemas.ts";

describe("identity onboarding step contract", () => {
  it("rejects the retired game and team steps", () => {
    expect(onboardingStepSchema.safeParse("game").success).toBe(false);
    expect(onboardingStepSchema.safeParse("team").success).toBe(false);
    expect(
      saveOnboardingProgressRequestSchema.safeParse({ path: "player", currentStep: "team" })
        .success,
    ).toBe(false);
  });

  it("accepts progress only for steps of the chosen path", () => {
    expect(
      saveOnboardingProgressRequestSchema.safeParse({ path: null, currentStep: "intention" })
        .success,
    ).toBe(true);
    expect(
      saveOnboardingProgressRequestSchema.safeParse({ path: null, currentStep: "review" }).success,
    ).toBe(false);
    expect(
      saveOnboardingProgressRequestSchema.safeParse({ path: "invitation", currentStep: "club" })
        .success,
    ).toBe(false);
  });

  it("walks every path forward and back in declared order", () => {
    for (const path of onboardingPathSchema.options) {
      const steps: readonly OnboardingStepDto[] = ONBOARDING_STEPS_BY_PATH[path];
      for (const [index, step] of steps.entries()) {
        expect(isOnboardingStepAllowed(path, step)).toBe(true);
        expect(nextOnboardingStep(path, step)).toBe(steps[index + 1] ?? null);
        expect(previousOnboardingStep(path, step)).toBe(steps[index - 1] ?? null);
      }
    }
    expect(nextOnboardingStep("player", "competition")).toBeNull();
  });
});
