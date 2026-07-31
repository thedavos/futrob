import { describe, expect, it } from "vite-plus/test";
import { resolveOnboardingStep, routeForOnboardingStep } from "./onboarding-routing.ts";

describe("onboarding routing", () => {
  it("keeps a persisted step that belongs to its path", () => {
    expect(resolveOnboardingStep("player", "game-account")).toBe("game-account");
    expect(routeForOnboardingStep("game-account")).toBe("/onboarding/game-account");
    expect(resolveOnboardingStep("organization", "competition")).toBe("competition");
    expect(routeForOnboardingStep("competition")).toBe("/onboarding/competition");
  });

  it("starts legacy progress without a path at intention", () => {
    expect(resolveOnboardingStep(null, "intention")).toBe("intention");
    expect(resolveOnboardingStep(null, "game")).toBe("intention");
  });

  it("falls back when the persisted step does not belong to its path", () => {
    expect(resolveOnboardingStep("organization", "invitation")).toBe("intention");
    expect(resolveOnboardingStep("invitation", "competition")).toBe("intention");
    expect(resolveOnboardingStep("invitation", "game")).toBe("intention");
  });

  it("normalizes the legacy game step by path", () => {
    expect(resolveOnboardingStep("organization", "game")).toBe("organization");
    expect(resolveOnboardingStep("player", "game")).toBe("game-account");
  });
});
