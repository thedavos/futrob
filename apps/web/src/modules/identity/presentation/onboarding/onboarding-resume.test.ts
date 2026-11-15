import { describe, expect, it } from "vite-plus/test";
import { createEmptyDraft, type OnboardingDraft } from "./onboarding-draft.ts";
import { initialOnboardingState, resumeOnboardingStep } from "./onboarding-resume.ts";

const organizationDraft: OnboardingDraft = {
  ...createEmptyDraft(),
  organizationName: "Liga Norte",
};

describe("resumeOnboardingStep", () => {
  it("starts at intention without a path or with a step outside the path", () => {
    expect(resumeOnboardingStep(null, "review", organizationDraft)).toBe("intention");
    expect(resumeOnboardingStep("player", "organization", organizationDraft)).toBe("intention");
    expect(resumeOnboardingStep("player", null, organizationDraft)).toBe("intention");
  });

  it("returns the stored step when every earlier step has its data", () => {
    expect(resumeOnboardingStep("organization", "review", organizationDraft)).toBe("review");
    expect(resumeOnboardingStep("player", "review", createEmptyDraft())).toBe("review");
  });

  it("returns the first earlier step whose data is missing", () => {
    expect(resumeOnboardingStep("organization", "review", createEmptyDraft())).toBe("organization");
    expect(
      resumeOnboardingStep("organization", "review", {
        ...organizationDraft,
      }),
    ).toBe("review");
    expect(
      resumeOnboardingStep("player", "club", { ...createEmptyDraft(), gameAccountIdentifier: "x" }),
    ).toBe("game-account");
  });

  it("always sends the invitation path back to the code, which is never stored", () => {
    expect(resumeOnboardingStep("invitation", "review", createEmptyDraft())).toBe("invitation");
  });
});

describe("initialOnboardingState", () => {
  const server = (
    path: "organization" | "player" | null,
    currentStep: "intention" | "organization" | "review" | "club",
  ) => ({ path, currentStep });

  it("keeps the local draft when a failed write left the server without a path or on another", () => {
    const local = {
      path: "organization" as const,
      step: "review" as const,
      draft: organizationDraft,
    };

    expect(initialOnboardingState(server(null, "intention"), local)).toEqual(local);
    expect(initialOnboardingState(server("player", "club"), local)).toEqual(local);
  });

  it("follows another device that got further on the same path", () => {
    const local = {
      path: "organization" as const,
      step: "organization" as const,
      draft: organizationDraft,
    };

    expect(initialOnboardingState(server("organization", "review"), local).step).toBe("review");
  });

  it("uses the server alone when this browser has nothing", () => {
    expect(initialOnboardingState(server("player", "club"), null)).toEqual({
      path: "player",
      step: "club",
      draft: createEmptyDraft(),
    });
  });
});
