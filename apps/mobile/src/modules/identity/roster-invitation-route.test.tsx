import { waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { clearSession, saveSession } from "./session-store";
import { clearPendingRosterInvitation, pendingRosterInvitation } from "./roster-invitation-link";
import { installFakeApi } from "../../../test/fake-api";
import { currentLocation } from "../../../test/expo-router";
import { cleanupApp, renderApp } from "../../../test/render-app";

afterEach(async () => {
  cleanupApp();
  await clearSession();
  await clearPendingRosterInvitation();
  vi.unstubAllGlobals();
});

describe("roster deep link", () => {
  it("preserves a link for login", async () => {
    installFakeApi({});
    renderApp("/roster-invitations/accept/roster-token");
    await waitFor(() => expect(currentLocation()?.pathname).toBe("/(auth)/login"));
    expect(await pendingRosterInvitation()).toBe("roster-token");
  });

  it("accepts the link and navigates to the player home", async () => {
    await saveSession({
      token: "session",
      user: { id: "actor", name: "Ana", email: "ana@example.com" },
    });
    const accept = vi.fn((_url: URL, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual({ token: "roster-token" });
      return Response.json({
        id: "membership",
        organizationId: "org",
        competitionId: "comp",
        teamId: "team",
        playerProfileId: "player",
        gameAccountId: null,
        role: "player",
        createdAt: "2026-01-01T00:00:00.000Z",
      });
    });
    installFakeApi({
      "/identity/onboarding": () =>
        Response.json({
          completed: true,
          completedAt: "2026-01-01T00:00:00.000Z",
          version: 1,
          path: "player",
          currentStep: null,
        }),
      "/organizations/post-auth-destination": () =>
        Response.json({ destination: { kind: "personal" }, memberships: [] }),
      "/roster-invitations/accept": accept,
    });
    renderApp("/roster-invitations/accept/roster-token");
    await waitFor(() => expect(accept).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(currentLocation()?.pathname).toBe("/player"));
    expect(await pendingRosterInvitation()).toBeNull();
  });
});
