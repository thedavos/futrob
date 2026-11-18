import { defaultParseSearch, isRedirect } from "@tanstack/react-router";
import { describe, expect, it } from "vite-plus/test";
import type { ExternalClubDto, OnboardingStatusDto } from "@futrob/api-contracts";
import { createEmptyDraft } from "./onboarding-draft.ts";
import {
  handOffInvitationToOnboarding,
  onboardingHandoffFromSearch,
  onboardingHandoffHref,
  onboardingHandoffSearchSchema,
  onboardingStateForHandoff,
  resolveOnboardingHandoff,
  type OnboardingHandoff,
} from "./onboarding-handoff.ts";

const status = (completed: boolean): OnboardingStatusDto => ({
  completed,
  completedAt: completed ? "2026-11-01T00:00:00.000Z" : null,
  version: completed ? 3 : null,
  path: completed ? "player" : null,
  currentStep: completed ? null : "intention",
});

const clubHandoff = {
  kind: "club",
  locator: {
    providerKey: "ea-clubs",
    externalClubId: "10754",
    platform: "common-gen5",
    gameEdition: "fc27",
  },
} as const satisfies OnboardingHandoff;

const fera: ExternalClubDto = {
  providerKey: "ea-clubs",
  externalClubId: "10754",
  name: "Fera Enjaulada",
  platform: "common-gen5",
  gameEdition: "fc27",
  imageUrl: null,
};

const fromUrlSearch = (search: string) =>
  onboardingHandoffFromSearch(onboardingHandoffSearchSchema.parse(defaultParseSearch(search)));
const fromSearch = (search: unknown) =>
  onboardingHandoffFromSearch(onboardingHandoffSearchSchema.parse(search));

describe("onboarding handoff links", () => {
  it("reads back the club a landing link carries, numeric id included", () => {
    const href = onboardingHandoffHref(clubHandoff);
    const url = new URL(href, "https://futrob.test");

    expect(url.pathname).toBe("/onboarding/club");
    expect(fromUrlSearch(url.search)).toEqual(clubHandoff);
    expect(fromUrlSearch("?club=10754&platform=common-gen5&edition=fc27")).toEqual(clubHandoff);
  });

  it("prefers an invitation and ignores an incomplete or malformed club", () => {
    expect(fromSearch({ invitation: " code ", club: "10754" })).toEqual({
      kind: "invitation",
      code: "code",
    });
    expect(fromSearch({ club: "10754", platform: "common-gen5" })).toBeNull();
    expect(fromSearch({ club: { id: 1 }, platform: "common-gen5", edition: "fc27" })).toBeNull();
    expect(fromSearch({ invitation: "" })).toBeNull();
  });
});

describe("resolveOnboardingHandoff", () => {
  it("selects the club the provider returns, not what the link claims", async () => {
    const resolved = await resolveOnboardingHandoff(clubHandoff, async () => ({
      ...fera,
      imageUrl: "https://example.com/crest.png",
    }));

    expect(resolved).toEqual({
      kind: "club",
      club: { ...fera, imageUrl: "https://example.com/crest.png" },
    });
  });

  it("selects nothing when the lookup fails", async () => {
    await expect(
      resolveOnboardingHandoff(clubHandoff, async () => {
        throw new Error("not found");
      }),
    ).resolves.toEqual({ kind: "club", club: null });
  });
});

describe("onboardingStateForHandoff", () => {
  it("opens the player review with the club, keeping a player draft", () => {
    const stored = {
      path: "player",
      step: "game-account",
      draft: { ...createEmptyDraft(), gameAccountIdentifier: "fera_10" },
    } as const;

    const state = onboardingStateForHandoff({ kind: "club", club: fera }, stored);

    expect(state).toMatchObject({ path: "player", step: "review" });
    expect(state.draft).toMatchObject({
      gameAccountIdentifier: "fera_10",
      selectedExternalClub: fera,
    });
  });

  it("opens the club step with nothing selected when the club was not found", () => {
    const stored = {
      path: "organization",
      step: "organization",
      draft: { ...createEmptyDraft(), organizationName: "Liga Norte" },
    } as const;

    const state = onboardingStateForHandoff({ kind: "club", club: null }, stored);

    expect(state).toMatchObject({ path: "player", step: "club" });
    expect(state.draft).toMatchObject({ organizationName: "", selectedExternalClub: null });
  });

  it("opens the invitation step with the code filled in", () => {
    const state = onboardingStateForHandoff({ kind: "invitation", code: "invite-token" }, null);

    expect(state).toMatchObject({
      path: "invitation",
      step: "invitation",
      draft: { invitationToken: "invite-token" },
    });
  });
});

describe("handOffInvitationToOnboarding", () => {
  it("sends an actor who has not finished onboarding to the invitation path with the code", async () => {
    const caught = await handOffInvitationToOnboarding("invite-token", async () =>
      status(false),
    ).catch((error: unknown) => error);

    expect(isRedirect(caught)).toBe(true);
    expect(caught).toMatchObject({
      options: { to: "/onboarding/invitation", search: { invitation: "invite-token" } },
    });
  });

  it("lets a finished actor continue and fails when the status cannot be read", async () => {
    await expect(
      handOffInvitationToOnboarding("invite-token", async () => status(true)),
    ).resolves.toBeUndefined();
    await expect(
      handOffInvitationToOnboarding("invite-token", async () => {
        throw new Error("network");
      }),
    ).rejects.toThrow("network");
  });
});
