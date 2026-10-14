// @vitest-environment jsdom

import { StrictMode, useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  isRedirect,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type {
  AcceptRosterInvitationRequest,
  AcceptRosterInvitationResponse,
} from "@futrob/api-contracts";
import { TeamsClientError } from "./teams-browser-client.ts";
import { AcceptRosterInvitationDeepLink } from "./accept-roster-invitation-deep-link.tsx";
import {
  forgetRosterInvitationAccept,
  loadRosterInvitationAccept,
  resetRosterInvitationAcceptOnceForTests,
  type RosterInvitationAcceptLoaderResult,
} from "./accept-roster-invitation-once.ts";

const accepted: AcceptRosterInvitationResponse = {
  id: "membership-1",
  organizationId: "org-1",
  competitionId: "comp-1",
  teamId: "team-1",
  playerProfileId: "profile-1",
  gameAccountId: null,
  role: "player",
  createdAt: "2026-08-14T22:00:00.000Z",
};

const mocks = vi.hoisted(() => ({
  accept:
    vi.fn<(input: AcceptRosterInvitationRequest) => Promise<AcceptRosterInvitationResponse>>(),
}));

vi.mock("./teams-browser-client.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./teams-browser-client.ts")>();
  return {
    ...actual,
    teamsBrowserClient: {
      ...actual.teamsBrowserClient,
      acceptRosterInvitation: (input: AcceptRosterInvitationRequest) => mocks.accept(input),
    },
  };
});

afterEach(() => {
  cleanup();
  mocks.accept.mockReset();
  resetRosterInvitationAcceptOnceForTests();
  vi.useRealTimers();
});

describe("loadRosterInvitationAccept", () => {
  it("POSTs once across concurrent loader calls, remount, and a focus-style replay", async () => {
    mocks.accept.mockResolvedValue(accepted);
    const [first, second] = await Promise.allSettled([
      loadRosterInvitationAccept("roster-token", false),
      loadRosterInvitationAccept("roster-token", false),
    ]);
    const remount = loadRosterInvitationAccept("roster-token", false);
    window.dispatchEvent(new Event("focus"));
    const afterFocus = loadRosterInvitationAccept("roster-token", false);

    for (const result of [first, second]) {
      expect(result.status).toBe("rejected");
      if (result.status === "rejected") {
        expect(isRedirect(result.reason)).toBe(true);
      }
    }
    await expect(remount).rejects.toSatisfy((error: unknown) => isRedirect(error));
    await expect(afterFocus).rejects.toSatisfy((error: unknown) => isRedirect(error));
    expect(mocks.accept).toHaveBeenCalledTimes(1);
    expect(mocks.accept).toHaveBeenCalledWith({ token: "roster-token" });
  });

  it("treats an already-accepted roster invitation as success and redirects to player", async () => {
    mocks.accept.mockResolvedValue(accepted);
    await expect(loadRosterInvitationAccept("already-accepted", false)).rejects.toSatisfy(
      (error: unknown) => isRedirect(error) && error.options.to === "/player",
    );
    expect(mocks.accept).toHaveBeenCalledTimes(1);
  });
});

describe("AcceptRosterInvitationDeepLink", () => {
  it("offers a usable retry after auto-accept is rate limited", async () => {
    mocks.accept
      .mockRejectedValueOnce(
        new TeamsClientError(429, "api.rate_limited", "2170e2f6-a47e-4338-83c3-27c054630800", 2),
      )
      .mockResolvedValueOnce(accepted);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(
      <StrictMode>
        <RosterAcceptHarness token="roster-token" />
      </StrictMode>,
    );

    expect(await screen.findByText("Podrás reintentar en 2 s.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reintentar en 2 s" })).toBeDisabled();
    expect(mocks.accept).toHaveBeenCalledTimes(1);

    void act(() => vi.advanceTimersByTime(2_000));
    fireEvent.click(screen.getByRole("button", { name: "Reintentar invitación" }));

    expect(await screen.findByText("Jugador (destino)")).toBeTruthy();
    await waitFor(() => expect(mocks.accept).toHaveBeenCalledTimes(2));
    expect(mocks.accept).toHaveBeenLastCalledWith({ token: "roster-token" });
  });

  it("redirects once under StrictMode when the roster invitation was already accepted", async () => {
    mocks.accept.mockResolvedValue(accepted);
    render(
      <StrictMode>
        <RosterAcceptHarness token="already-accepted" />
      </StrictMode>,
    );
    expect(await screen.findByText("Jugador (destino)")).toBeTruthy();
    expect(mocks.accept).toHaveBeenCalledTimes(1);
  });
});

function RosterAcceptHarness({ token }: Readonly<{ token: string }>) {
  const [router] = useState(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const acceptRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/roster-invitations/accept/$token",
      staleTime: Infinity,
      gcTime: Infinity,
      preload: false,
      pendingComponent: () => <AcceptRosterInvitationDeepLink error={null} />,
      loader: ({ params, preload }) => loadRosterInvitationAccept(params.token, preload),
      component: function AcceptPage() {
        const { token: routeToken } = acceptRoute.useParams();
        const result = acceptRoute.useLoaderData() as RosterInvitationAcceptLoaderResult;
        if (result.kind !== "error") return <AcceptRosterInvitationDeepLink error={null} />;
        return (
          <AcceptRosterInvitationDeepLink
            error={result.error}
            onRetry={() => {
              forgetRosterInvitationAccept(routeToken);
              void router.invalidate();
            }}
          />
        );
      },
    });
    const destinationRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/player",
      component: () => <p>Jugador (destino)</p>,
    });
    return createRouter({
      routeTree: rootRoute.addChildren([acceptRoute, destinationRoute]),
      history: createMemoryHistory({
        initialEntries: [`/roster-invitations/accept/${token}`],
      }),
      defaultPreload: false,
    });
  });
  return <RouterProvider router={router} />;
}
