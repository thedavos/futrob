import { describe, expect, it } from "vite-plus/test";
import { isOnboardingStepAllowed } from "./onboarding-status.ts";

describe("isOnboardingStepAllowed", () => {
  it("only allows intention before a path is chosen", () => {
    expect(isOnboardingStepAllowed(null, "intention")).toBe(true);
    for (const step of [
      "organization",
      "competition",
      "invitation",
      "game-account",
      "club",
      "review",
    ] as const) {
      expect(isOnboardingStepAllowed(null, step)).toBe(false);
    }
  });

  it.each([
    ["organization", ["intention", "organization", "competition", "game-account", "review"]],
    ["invitation", ["intention", "invitation", "game-account", "review"]],
    ["player", ["intention", "game-account", "club", "review"]],
  ] as const)("allows exactly the declared steps for the %s path", (path, allowedSteps) => {
    const allSteps = [
      "intention",
      "organization",
      "competition",
      "invitation",
      "game-account",
      "club",
      "review",
    ] as const;
    for (const step of allSteps) {
      expect(isOnboardingStepAllowed(path, step)).toBe(
        allowedSteps.some((allowed) => allowed === step),
      );
    }
  });

  it("keeps the invitation path free of organization-only steps", () => {
    expect(isOnboardingStepAllowed("invitation", "organization")).toBe(false);
    expect(isOnboardingStepAllowed("invitation", "competition")).toBe(false);
    expect(isOnboardingStepAllowed("invitation", "club")).toBe(false);
  });

  it("keeps the player path free of organization steps", () => {
    expect(isOnboardingStepAllowed("player", "organization")).toBe(false);
    expect(isOnboardingStepAllowed("player", "competition")).toBe(false);
    expect(isOnboardingStepAllowed("player", "invitation")).toBe(false);
  });
});
