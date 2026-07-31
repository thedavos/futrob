import { describe, expect, it } from "vite-plus/test";
import { resolveOnboardingStep, routeForOnboardingStep } from "./onboarding-routing.ts";

describe("onboarding routing", () => {
  it("keeps a persisted step that belongs to its path", () => {
    expect(resolveOnboardingStep("player", "game-account")).toBe("game-account");
    expect(routeForOnboardingStep("game-account")).toBe("/onboarding/game-account");
  });

  it("starts legacy progress without a path at intention", () => {
    expect(resolveOnboardingStep(null, "intention")).toBe("intention");
    expect(resolveOnboardingStep(null, "game")).toBe("intention");
  });

  it("falls back when the persisted step does not belong to its path", () => {
    expect(resolveOnboardingStep("organization", "game-account")).toBe("intention");
    expect(resolveOnboardingStep("invitation", "game")).toBe("intention");
  });
});
