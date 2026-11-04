// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { createEmptyDraft } from "./onboarding-draft.ts";
import { browserOnboardingDraftStore } from "./onboarding-draft-storage.ts";

beforeEach(() => {
  const stored = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
    removeItem: (key: string) => stored.delete(key),
    clear: () => stored.clear(),
  });
});
afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

const draft = {
  ...createEmptyDraft(),
  organizationName: "Liga Norte",
  invitationToken: "secret-token",
  invitationPreview: {
    organizationId: "org",
    organizationName: "Liga",
    competitionName: "Copa",
    competitionId: "comp",
    competitionRole: "player" as const,
    expiresAt: "2026-12-01T00:00:00.000Z",
  },
};

describe("browserOnboardingDraftStore", () => {
  it("restores path, step and draft for the same user without the invitation code", () => {
    browserOnboardingDraftStore("user-a").save({
      path: "organization",
      step: "review",
      draft,
    });

    expect(localStorage.getItem("futrob:onboarding-draft:user-a")).not.toContain("secret-token");
    expect(browserOnboardingDraftStore("user-a").load()).toEqual({
      path: "organization",
      step: "review",
      draft: { ...draft, invitationToken: "", invitationPreview: null },
    });
  });

  it("returns nothing for another user or unreadable data", () => {
    browserOnboardingDraftStore("user-a").save({
      path: "organization",
      step: "review",
      draft,
    });

    expect(browserOnboardingDraftStore("user-b").load()).toBeNull();
    localStorage.setItem("futrob:onboarding-draft:user-a", "{not json");
    expect(browserOnboardingDraftStore("user-a").load()).toBeNull();
  });

  it("forgets the draft once cleared", () => {
    const store = browserOnboardingDraftStore("user-a");
    store.save({ path: "organization", step: "review", draft });
    store.clear();
    expect(store.load()).toBeNull();
  });
});
