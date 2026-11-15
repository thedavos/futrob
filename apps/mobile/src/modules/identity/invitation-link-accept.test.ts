import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { AcceptCompetitionInvitationResponse } from "@futrob/api-contracts";
import {
  acceptInvitationLink,
  getInvitationLinkAccept,
  resetInvitationLinkAcceptForTests,
  retryInvitationLinkAccept,
  startInvitationLinkAccept,
  subscribeInvitationLinkAccept,
} from "./invitation-link-accept.ts";
import { clearPendingInvitation, peekPendingInvitation } from "./onboarding-draft.ts";
import { clearSession, saveSession } from "./session-store.ts";
import type { GateResult } from "./session-gate.ts";

const accepted: AcceptCompetitionInvitationResponse = {
  organizationId: "org-1",
  organizationName: "Liga",
  role: "member",
  competitionId: "comp-1",
  competitionName: "Copa",
  destination: { kind: "competition", organizationId: "org-1", competitionId: "comp-1" },
};

const readyGate: GateResult = {
  kind: "ready",
  route: "/player",
  destination: { kind: "personal" },
};

const mocks = vi.hoisted(() => ({
  accept: vi.fn(async (_input: { token: string }) => accepted),
  resolveSessionGate: vi.fn(),
}));

vi.mock("@/modules/api/futrob-client", () => ({
  getFutrobClient: () => ({
    competitions: { acceptInvitation: mocks.accept },
  }),
}));

vi.mock("./session-gate", () => ({
  resolveSessionGate: () => mocks.resolveSessionGate(),
}));

beforeEach(() => {
  mocks.accept.mockReset();
  mocks.accept.mockResolvedValue(accepted);
  mocks.resolveSessionGate.mockReset();
  mocks.resolveSessionGate.mockResolvedValue(readyGate);
});

afterEach(async () => {
  resetInvitationLinkAcceptForTests();
  await clearPendingInvitation();
  await clearSession();
});

describe("acceptInvitationLink", () => {
  it("treats an already-accepted invitation as success and returns the competition route", async () => {
    mocks.accept.mockResolvedValue(accepted);
    await expect(acceptInvitationLink("already-accepted")).resolves.toEqual({
      route: "/orgs/org-1/competitions/comp-1",
    });
    expect(mocks.accept).toHaveBeenCalledTimes(1);
    expect(await peekPendingInvitation()).toBeNull();
  });

  it("does not POST when the session still needs login or onboarding", async () => {
    mocks.resolveSessionGate.mockResolvedValue({
      kind: "login",
      route: "/(auth)/login",
    } satisfies GateResult);
    await expect(acceptInvitationLink("pending-token")).resolves.toEqual({
      route: "/(auth)/login",
    });
    expect(mocks.accept).not.toHaveBeenCalled();
    expect(await peekPendingInvitation()).toBe("pending-token");
  });
});

describe("startInvitationLinkAccept", () => {
  it("POSTs once across concurrent starts, resubscribe, and retry-less remount", async () => {
    mocks.accept.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(accepted), 20)),
    );
    startInvitationLinkAccept("link-token");
    startInvitationLinkAccept("link-token");
    const unsubscribe = subscribeInvitationLinkAccept("link-token", () => undefined);
    unsubscribe();
    subscribeInvitationLinkAccept("link-token", () => undefined);
    startInvitationLinkAccept("link-token");

    await vi.waitFor(() => {
      expect(getInvitationLinkAccept("link-token")).toEqual({
        status: "ready",
        route: "/orgs/org-1/competitions/comp-1",
      });
    });
    expect(mocks.accept).toHaveBeenCalledTimes(1);
    expect(mocks.accept).toHaveBeenCalledWith({ token: "link-token" });
  });

  it("POSTs again only after an explicit retry", async () => {
    mocks.accept.mockRejectedValueOnce(new Error("gate")).mockResolvedValueOnce(accepted);
    startInvitationLinkAccept("link-token");
    await vi.waitFor(() => {
      expect(getInvitationLinkAccept("link-token").status).toBe("error");
    });
    startInvitationLinkAccept("link-token");
    expect(mocks.accept).toHaveBeenCalledTimes(1);

    retryInvitationLinkAccept("link-token");
    await vi.waitFor(() => {
      expect(getInvitationLinkAccept("link-token")).toEqual({
        status: "ready",
        route: "/orgs/org-1/competitions/comp-1",
      });
    });
    expect(mocks.accept).toHaveBeenCalledTimes(2);
  });

  it("accepts again for the next account after a session change", async () => {
    await saveSession({
      token: "token-ana",
      user: { id: "actor-ana", name: "Ana", email: "ana@club.mx" },
    });
    startInvitationLinkAccept("link-token");
    await vi.waitFor(() => {
      expect(getInvitationLinkAccept("link-token").status).toBe("ready");
    });

    await saveSession({
      token: "token-beto",
      user: { id: "actor-beto", name: "Beto", email: "beto@club.mx" },
    });
    expect(getInvitationLinkAccept("link-token")).toEqual({ status: "idle" });
    startInvitationLinkAccept("link-token");

    await vi.waitFor(() => {
      expect(getInvitationLinkAccept("link-token").status).toBe("ready");
    });
    expect(mocks.accept).toHaveBeenCalledTimes(2);
  });
});
