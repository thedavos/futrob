import { describe, expect, it } from "vite-plus/test";
import { CURRENT_ONBOARDING_VERSION, isOnboardingStepAllowed } from "./onboarding-status.ts";

describe("isOnboardingStepAllowed", () => {
  it("only allows intention before a path is chosen", () => {
    expect(isOnboardingStepAllowed(null, "intention")).toBe(true);
    for (const step of [
      "organization",
      "competition",
      "game",
      "invitation",
      "game-account",
      "club",
      "review",
    ] as const) {
      expect(isOnboardingStepAllowed(null, step)).toBe(false);
    }
  });

  it.each([
    [
      "organization",
      ["intention", "organization", "competition", "game-account", "game", "review"],
    ],
    ["invitation", ["intention", "invitation", "game-account", "review"]],
    ["player", ["intention", "game", "game-account", "club", "review"]],
  ] as const)("allows exactly the declared steps for the %s path", (path, allowedSteps) => {
    const allSteps = [
      "intention",
      "organization",
      "competition",
      "game",
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

  it("pins the current onboarding schema version", () => {
    expect(CURRENT_ONBOARDING_VERSION).toBeGreaterThan(0);
  });
});
