import { defaultParseSearch, isRedirect } from "@tanstack/react-router";
import { describe, expect, it } from "vite-plus/test";
import type { ExternalClubDto, OnboardingStatusDto } from "@futrob/api-contracts";
import { createEmptyDraft } from "./onboarding-draft.ts";
import { finishOnboardingPath } from "./onboarding-finish.ts";
import { createFakeOnboardingGateway } from "./onboarding-story-router.tsx";
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

const competitionHandoff = {
  kind: "competition",
  competitionId: "c-open",
  club: clubHandoff.locator,
} as const satisfies OnboardingHandoff;

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

describe("competition handoff links", () => {
  it("reads back the competition and the club a landing link carries", () => {
    const url = new URL(onboardingHandoffHref(competitionHandoff), "https://futrob.test");

    expect(url.pathname).toBe("/onboarding/review");
    expect(fromUrlSearch(url.search)).toEqual(competitionHandoff);
  });

  it("joins without a club when the link has none or only part of one", () => {
    const withoutClub = { kind: "competition", competitionId: "c-open", club: null } as const;
    const url = new URL(onboardingHandoffHref(withoutClub), "https://futrob.test");

    expect(fromUrlSearch(url.search)).toEqual(withoutClub);
    expect(fromSearch({ competition: "c-open", club: "10754" })).toEqual(withoutClub);
    expect(fromSearch({ invitation: "code", competition: "c-open" })).toEqual({
      kind: "invitation",
      code: "code",
    });
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

describe("resolveOnboardingHandoff for a competition", () => {
  it("looks up the club, and skips the lookup when there is none", async () => {
    await expect(resolveOnboardingHandoff(competitionHandoff, async () => fera)).resolves.toEqual({
      kind: "competition",
      competitionId: "c-open",
      club: fera,
    });
    await expect(
      resolveOnboardingHandoff({ ...competitionHandoff, club: null }, async () => {
        throw new Error("no lookup expected");
      }),
    ).resolves.toEqual({ kind: "competition", competitionId: "c-open", club: null });
    await expect(
      resolveOnboardingHandoff(competitionHandoff, async () => {
        throw new Error("not found");
      }),
    ).resolves.toEqual({ kind: "competition", competitionId: "c-open", club: null });
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

  it("opens the player review with the competition to join and its club", () => {
    const state = onboardingStateForHandoff(
      { kind: "competition", competitionId: "c-open", club: fera },
      null,
    );

    expect(state).toMatchObject({ path: "player", step: "review" });
    expect(state.draft).toMatchObject({
      selectedExternalClub: fera,
      joiningCompetitionId: "c-open",
    });
  });

  it("forgets an earlier competition when a plain club link opens onboarding", () => {
    const stored = {
      path: "player",
      step: "review",
      draft: { ...createEmptyDraft(), joiningCompetitionId: "c-old" },
    } as const;

    const state = onboardingStateForHandoff({ kind: "club", club: fera }, stored);

    expect(state.draft.joiningCompetitionId).toBeNull();
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

describe("finishing the player path from a competition handoff", () => {
  it("lands on the competition with the application open and the club name as team", async () => {
    const gateway = createFakeOnboardingGateway({ path: "player", currentStep: "review" });
    const joining = { ...createEmptyDraft(), joiningCompetitionId: "c-open" };

    await expect(
      finishOnboardingPath.player(gateway, { ...joining, selectedExternalClub: fera }),
    ).resolves.toMatchObject({
      destination: {
        to: "/player/competitions/$competitionId",
        params: { competitionId: "c-open" },
        search: { apply: true, teamName: "Fera Enjaulada" },
      },
    });
    await expect(finishOnboardingPath.player(gateway, joining)).resolves.toMatchObject({
      destination: { search: { apply: true, teamName: undefined } },
    });
  });

  it("carries a failed club association to the competition so it can warn", async () => {
    const gateway = createFakeOnboardingGateway({
      path: "player",
      currentStep: "review",
      clubAssociation: "failed",
    });
    const joining = {
      ...createEmptyDraft(),
      joiningCompetitionId: "c-open",
      selectedExternalClub: fera,
    };

    await expect(finishOnboardingPath.player(gateway, joining)).resolves.toMatchObject({
      destination: {
        to: "/player/competitions/$competitionId",
        search: { apply: true, teamName: "Fera Enjaulada", clubAssociation: "failed" },
      },
    });
  });
});
