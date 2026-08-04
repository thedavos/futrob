import { describe, expect, it } from "vite-plus/test";
import {
  isOnboardingStepAllowedForPath,
  resolveOnboardingStep,
  resolvePersistedOnboardingStep,
  routeForOnboardingStep,
} from "./onboarding-routing.ts";

describe("onboarding routing", () => {
  it("cold-bootstraps at intention even when the server has an advanced step", () => {
    expect(resolveOnboardingStep("player", "game-account")).toBe("intention");
    expect(resolveOnboardingStep("player", "team")).toBe("intention");
    expect(resolveOnboardingStep("organization", "competition")).toBe("intention");
    expect(resolveOnboardingStep("organization", "review")).toBe("intention");
    expect(resolveOnboardingStep(null, "intention")).toBe("intention");
    expect(resolveOnboardingStep(null, "game")).toBe("intention");
  });

  it("honors persisted steps when explicitly requested", () => {
    expect(resolvePersistedOnboardingStep("player", "game-account")).toBe("game-account");
    expect(resolvePersistedOnboardingStep("player", "team")).toBe("team");
    expect(resolvePersistedOnboardingStep("organization", "competition")).toBe("competition");
    expect(resolvePersistedOnboardingStep("organization", "invitation")).toBe("intention");
    expect(resolvePersistedOnboardingStep("organization", "game")).toBe("organization");
    expect(resolvePersistedOnboardingStep("player", "game")).toBe("game-account");
  });

  it("maps steps to routes", () => {
    expect(routeForOnboardingStep("game-account")).toBe("/onboarding/game-account");
    expect(routeForOnboardingStep("team")).toBe("/onboarding/team");
    expect(routeForOnboardingStep("competition")).toBe("/onboarding/competition");
  });

  it("validates in-session steps against path", () => {
    expect(isOnboardingStepAllowedForPath("player", "game-account")).toBe(true);
    expect(isOnboardingStepAllowedForPath("player", "team")).toBe(true);
    expect(isOnboardingStepAllowedForPath("organization", "invitation")).toBe(false);
    expect(isOnboardingStepAllowedForPath("invitation", "competition")).toBe(false);
    expect(isOnboardingStepAllowedForPath(null, "intention")).toBe(true);
    expect(isOnboardingStepAllowedForPath(null, "organization")).toBe(false);
  });
});
