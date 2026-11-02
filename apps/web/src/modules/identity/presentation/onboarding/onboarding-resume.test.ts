import { describe, expect, it } from "vite-plus/test";
import { createEmptyDraft, type OnboardingDraft } from "./onboarding-draft.ts";
import { resumeOnboardingStep } from "./onboarding-resume.ts";

const organizationDraft: OnboardingDraft = {
  ...createEmptyDraft(),
  organizationName: "Liga Norte",
  competitionName: "Apertura",
  competitionPlatform: "playstation",
  competitionRegion: "south-america",
  competitionTimeZone: "America/Lima",
  competitionFormat: "league",
  competitionGameEdition: "FC 26",
};

describe("resumeOnboardingStep", () => {
  it("starts at intention without a path or with a step outside the path", () => {
    expect(resumeOnboardingStep(null, "review", organizationDraft)).toBe("intention");
    expect(resumeOnboardingStep("player", "competition", organizationDraft)).toBe("intention");
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
        competitionFormat: null,
      }),
    ).toBe("competition");
    expect(
      resumeOnboardingStep("player", "club", { ...createEmptyDraft(), gameAccountIdentifier: "x" }),
    ).toBe("game-account");
  });

  it("always sends the invitation path back to the code, which is never stored", () => {
    expect(resumeOnboardingStep("invitation", "review", createEmptyDraft())).toBe("invitation");
  });
});
