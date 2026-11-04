import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  clearOnboardingDraft,
  loadOnboardingDraft,
  saveOnboardingDraft,
  type OnboardingDraft,
} from "./onboarding-draft.ts";
import { NativeOnboardingFlow, type OnboardingGateway } from "./onboarding-flow.ts";
import type { OnboardingStatusDto } from "@futrob/api-contracts";

const status = (
  path: OnboardingStatusDto["path"],
  currentStep: OnboardingStatusDto["currentStep"],
): OnboardingStatusDto => ({
  completed: false,
  completedAt: null,
  version: null,
  path,
  currentStep,
});

function gateway() {
  const saveOnboardingProgress = vi.fn(async () => status("player", "review"));
  const completePlayerOnboarding = vi.fn(async () => ({ destination: "personal" }));
  const completeOrganizationOnboarding = vi.fn(async () => ({
    destination: { organizationId: "org-1", competitionId: "comp-1" },
  }));
  const completeInvitationOnboarding = vi.fn(async () => ({
    destination: { organizationId: "org-2", competitionId: "comp-2" },
  }));
  const inspectCompetitionInvitation = vi.fn(async () => ({
    organizationId: "org-2",
    organizationName: "Liga",
    competitionId: "comp-2",
    competitionName: "Copa",
    competitionRole: "player",
    expiresAt: "2027-01-01T00:00:00.000Z",
  }));
  const client = {
    identity: {
      saveOnboardingProgress,
      completePlayerOnboarding,
      completeOrganizationOnboarding,
      completeInvitationOnboarding,
      inspectCompetitionInvitation,
    },
    organizations: { checkNameAvailability: vi.fn(async () => ({ available: true })) },
    gameData: { clubs: { search: vi.fn(async () => ({ clubs: [] })) } },
  } as unknown as OnboardingGateway;
  return {
    client,
    saveOnboardingProgress,
    completePlayerOnboarding,
    completeOrganizationOnboarding,
    completeInvitationOnboarding,
    inspectCompetitionInvitation,
  };
}

afterEach(async () => {
  await clearOnboardingDraft();
});

describe("native onboarding flow", () => {
  it("isolates a local draft by user and restores the server step", async () => {
    const api = gateway();
    const first = await NativeOnboardingFlow.load(
      "ana",
      status("player", "game-account"),
      api.client,
    );
    await first.update({
      gameAccount: { identifier: "Ana", platform: "playstation", gameEdition: "FC 26" },
    });
    const restored = await NativeOnboardingFlow.load("ana", status("player", "club"), api.client);
    expect(restored.step).toBe("club");
    expect(restored.draft.gameAccount.identifier).toBe("Ana");
    const other = await NativeOnboardingFlow.load("other", status("player", "club"), api.client);
    expect(other.draft.gameAccount).toEqual({});
  });

  it("records the entry into onboarding once a fresh actor opens it", async () => {
    const api = gateway();
    await NativeOnboardingFlow.load("ana", status(null, "intention"), api.client);
    expect(api.saveOnboardingProgress).toHaveBeenCalledWith({
      path: null,
      currentStep: "intention",
    });

    api.saveOnboardingProgress.mockClear();
    await NativeOnboardingFlow.load("ana", status("player", "club"), api.client);
    expect(api.saveOnboardingProgress).not.toHaveBeenCalled();
  });

  it("persists the draft before saving a transition", async () => {
    const api = gateway();
    const flow = await NativeOnboardingFlow.load("ana", status("player", "intention"), api.client);
    await flow.update({ path: "player" });
    await flow.goTo("game-account");
    expect(api.saveOnboardingProgress).toHaveBeenCalledWith({
      path: "player",
      currentStep: "game-account",
    });
    expect((await loadOnboardingDraft("ana")).path).toBe("player");
  });

  it("merges rapid field edits without losing prior values", async () => {
    const api = gateway();
    const flow = await NativeOnboardingFlow.load(
      "ana",
      status("organization", "organization"),
      api.client,
    );
    const first = flow.update({ organizationName: "Liga" });
    const second = flow.update({ organizationTimeZone: "America/Lima" });
    await Promise.all([first, second]);
    expect(await loadOnboardingDraft("ana")).toMatchObject({
      organizationName: "Liga",
      organizationTimeZone: "America/Lima",
    });
  });

  it("submits an optional player account and selected club to the composed endpoint", async () => {
    const api = gateway();
    const flow = await NativeOnboardingFlow.load("ana", status("player", "review"), api.client);
    await flow.update({
      club: {
        providerKey: "ea-clubs",
        externalClubId: "club-7",
        name: "Atlético",
        imageUrl: null,
        platform: "playstation",
        gameEdition: "fc26",
      },
    });
    await expect(flow.finish()).resolves.toEqual({ route: "/player" });
    expect(api.completePlayerOnboarding).toHaveBeenCalledWith({
      gameAccount: null,
      externalClub: {
        providerKey: "ea-clubs",
        externalClubId: "club-7",
        platform: "playstation",
        gameEdition: "fc26",
      },
    });
    expect((await loadOnboardingDraft("ana")).path).toBeNull();
  });

  it("creates an organization without a competition, then opens the organization", async () => {
    const api = gateway();
    const flow = await NativeOnboardingFlow.load(
      "ana",
      status("organization", "review"),
      api.client,
    );
    await flow.update({
      organizationName: "Liga Lima",
      organizationTimeZone: "America/Lima",
    });
    await expect(flow.finish()).resolves.toEqual({
      route: "/orgs/org-1",
    });
    expect(api.completeOrganizationOnboarding).toHaveBeenCalledWith({
      name: "Liga Lima",
      gameAccount: null,
      timeZone: "America/Lima",
    });
  });

  it("inspects then accepts an invitation without exposing the token in the route", async () => {
    const api = gateway();
    const flow = await NativeOnboardingFlow.load("ana", status("invitation", "review"), api.client);
    await flow.update({ invitationToken: "private-token" });
    await flow.inspectInvitation();
    await expect(flow.finish()).resolves.toEqual({ route: "/orgs/org-2/competitions/comp-2" });
    expect(api.completeInvitationOnboarding).toHaveBeenCalledWith({
      token: "private-token",
      gameAccount: null,
    });
  });

  it("reinspects a restored invitation before allowing review confirmation", async () => {
    const api = gateway();
    const first = await NativeOnboardingFlow.load(
      "ana",
      status("invitation", "invitation"),
      api.client,
    );
    await first.update({ invitationToken: "private-token" });
    const restored = await NativeOnboardingFlow.load(
      "ana",
      status("invitation", "review"),
      api.client,
    );
    expect(restored.preview).toBeNull();
    await restored.reinspectRestoredInvitation();
    expect(api.inspectCompetitionInvitation).toHaveBeenCalledWith({ token: "private-token" });
    await expect(restored.finish()).resolves.toEqual({ route: "/orgs/org-2/competitions/comp-2" });
  });

  it("rejects a partial account and a stale invitation preview", async () => {
    const api = gateway();
    const flow = await NativeOnboardingFlow.load("ana", status("invitation", "review"), api.client);
    await flow.update({ invitationToken: "old", gameAccount: { identifier: "Ana" } });
    await expect(flow.finish()).rejects.toThrow("game-account");
    const pending = flow.inspectInvitation();
    await flow.update({ invitationToken: "new" });
    await expect(pending).rejects.toThrow("cambió");
    expect(flow.preview).toBeNull();
  });

  it("does not restore a corrupt or mismatched draft", async () => {
    await saveOnboardingDraft("ana", {
      path: "player",
      organizationName: "",
      organizationTimeZone: "UTC",
      organizationAccountStep: false,
      invitationToken: "",
      gameAccount: {},
      club: null,
    } satisfies OnboardingDraft);
    expect((await loadOnboardingDraft("other")).path).toBeNull();
  });
});

it("keeps the organizer's game account as an optional detour and submits it on completion", async () => {
  const api = gateway();
  const flow = await NativeOnboardingFlow.load(
    "organizer-optional",
    status("organization", "organization"),
    api.client,
  );
  await flow.update({
    organizationName: "Liga opcional",
    organizationTimeZone: "America/Lima",
    organizationAccountStep: true,
  });
  await flow.goTo("game-account");
  await flow.update({
    gameAccount: { identifier: "CaptainEA", platform: "xbox", gameEdition: "FC 27" },
  });
  await flow.goTo("review");
  expect(await flow.finish()).toEqual({ route: "/orgs/org-1" });
  expect(api.completeOrganizationOnboarding).toHaveBeenCalledWith({
    name: "Liga opcional",
    timeZone: "America/Lima",
    gameAccount: { identifier: "CaptainEA", platform: "xbox", gameEdition: "FC 27" },
  });
  expect((await loadOnboardingDraft("organizer-optional")).path).toBeNull();
});
