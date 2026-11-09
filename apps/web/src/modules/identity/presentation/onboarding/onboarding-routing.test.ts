import { describe, expect, it } from "vite-plus/test";
import { isOnboardingPathname, routeForOnboardingStep } from "./onboarding-routing.ts";

describe("onboarding routing", () => {
  it("maps steps to routes", () => {
    expect(routeForOnboardingStep("game-account")).toBe("/onboarding/game-account");
    expect(routeForOnboardingStep("club")).toBe("/onboarding/club");
    expect(routeForOnboardingStep("review")).toBe("/onboarding/review");
  });

  it("recognizes onboarding pathnames only", () => {
    expect(isOnboardingPathname("/onboarding")).toBe(true);
    expect(isOnboardingPathname("/onboarding/")).toBe(true);
    expect(isOnboardingPathname("/onboarding/intention")).toBe(true);
    expect(isOnboardingPathname("/player")).toBe(false);
    expect(isOnboardingPathname("/orgs/abc")).toBe(false);
  });
});
