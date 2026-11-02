// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vite-plus/test";
import { createEmptyDraft } from "./onboarding-draft.ts";
import { browserOnboardingDraftStore } from "./onboarding-draft-storage.ts";

afterEach(() => localStorage.clear());

const draft = {
  ...createEmptyDraft(),
  organizationName: "Liga Norte",
  invitationToken: "secret-token",
  invitationPreview: {
    organizationId: "org",
    organizationName: "Liga",
    competitionId: "comp",
    competitionName: "Copa",
    competitionRole: "player" as const,
    expiresAt: "2026-12-01T00:00:00.000Z",
  },
};

describe("browserOnboardingDraftStore", () => {
  it("restores the draft for the same user and path without the invitation code", () => {
    browserOnboardingDraftStore("user-a").save("organization", draft);

    expect(localStorage.getItem("futrob:onboarding-draft:user-a")).not.toContain("secret-token");
    expect(browserOnboardingDraftStore("user-a").load("organization")).toEqual({
      ...draft,
      invitationToken: "",
      invitationPreview: null,
    });
  });

  it("returns an empty draft for another user, another path or unreadable data", () => {
    browserOnboardingDraftStore("user-a").save("organization", draft);

    expect(browserOnboardingDraftStore("user-b").load("organization")).toEqual(createEmptyDraft());
    expect(browserOnboardingDraftStore("user-a").load("player")).toEqual(createEmptyDraft());

    localStorage.setItem("futrob:onboarding-draft:user-a", "{not json");
    expect(browserOnboardingDraftStore("user-a").load("organization")).toEqual(createEmptyDraft());
  });

  it("forgets the draft once cleared", () => {
    const store = browserOnboardingDraftStore("user-a");
    store.save("organization", draft);
    store.clear();
    expect(store.load("organization")).toEqual(createEmptyDraft());
  });
});
