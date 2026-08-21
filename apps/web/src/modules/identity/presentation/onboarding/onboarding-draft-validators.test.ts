import { describe, expect, it } from "vite-plus/test";
import { GAME_PLATFORM } from "@futrob/shared-kernel";
import type { OnboardingDraft } from "./onboarding-draft.ts";
import {
  providerGameEditionFromDraft,
  validCompleteAccount,
  validOptionalAccount,
  validOrganizationName,
} from "./onboarding-draft-validators.ts";

function draft(patch: Partial<OnboardingDraft> = {}): OnboardingDraft {
  return {
    organizationName: "",
    competitionName: "",
    competitionPlatform: null,
    competitionRegion: null,
    competitionTimeZone: "UTC",
    competitionFormat: null,
    competitionGameEdition: "",
    customCompetitionGameEdition: false,
    invitationToken: "",
    invitationPreview: null,
    gameAccountIdentifier: "",
    platform: null,
    gameEdition: "",
    customGameEdition: false,
    selectedExternalClub: null,
    ...patch,
  };
}

describe("validOrganizationName", () => {
  it("accepts trimmed names within 120 characters", () => {
    expect(validOrganizationName("Liga Norte")).toBe(true);
    expect(validOrganizationName("  Liga Norte  ")).toBe(true);
  });

  it("rejects empty and overlong names", () => {
    expect(validOrganizationName("")).toBe(false);
    expect(validOrganizationName("   ")).toBe(false);
    expect(validOrganizationName("x".repeat(121))).toBe(false);
  });
});

describe("validCompleteAccount / validOptionalAccount", () => {
  const complete = draft({
    gameAccountIdentifier: "gamer23",
    platform: GAME_PLATFORM.PLAYSTATION,
    gameEdition: "FC 26",
  });

  it("requires identifier, platform, and edition for a complete account", () => {
    expect(validCompleteAccount(complete)).toBe(true);
    expect(validCompleteAccount(draft({ gameAccountIdentifier: "gamer23" }))).toBe(false);
    expect(
      validCompleteAccount(draft({ gameAccountIdentifier: "gamer23", platform: GAME_PLATFORM.PC })),
    ).toBe(false);
  });

  it("treats a fully empty account as optional-valid", () => {
    expect(validOptionalAccount(draft())).toBe(true);
  });

  it("rejects a partial account for optional validation", () => {
    expect(validOptionalAccount(draft({ gameAccountIdentifier: "gamer23" }))).toBe(false);
  });

  it("accepts a complete account as optional-valid", () => {
    expect(validOptionalAccount(complete)).toBe(true);
  });
});

describe("providerGameEditionFromDraft", () => {
  it("normalizes display editions to EA provider keys", () => {
    expect(providerGameEditionFromDraft("FC 26")).toBe("fc26");
    expect(providerGameEditionFromDraft("FC 25")).toBe("fc25");
    expect(providerGameEditionFromDraft("fc_26")).toBe("fc26");
  });

  it("falls back when the edition is blank", () => {
    expect(providerGameEditionFromDraft("")).toBe("fc26");
    expect(providerGameEditionFromDraft("   ", "fc25")).toBe("fc25");
  });
});
