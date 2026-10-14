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
  AcceptCompetitionInvitationResponse,
  AcceptInvitationRequest,
} from "@futrob/api-contracts";
import { OrganizationsClientError } from "./organizations-browser-client.ts";
import { AcceptInvitationDeepLink } from "./accept-invitation-deep-link.tsx";
import {
  forgetInvitationAccept,
  loadCompetitionInvitationAccept,
  resetInvitationAcceptOnceForTests,
  type InvitationAcceptLoaderResult,
} from "./accept-invitation-once.ts";

const accepted: AcceptCompetitionInvitationResponse = {
  organizationId: "org-1",
  organizationName: "Org Test",
  role: "member",
  competitionId: "comp-1",
  competitionName: "Liga Test",
  destination: { kind: "competition", organizationId: "org-1", competitionId: "comp-1" },
};

const mocks = vi.hoisted(() => ({
  accept: vi.fn<(input: AcceptInvitationRequest) => Promise<AcceptCompetitionInvitationResponse>>(),
}));

vi.mock("./organizations-browser-client.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./organizations-browser-client.ts")>();
  return {
    ...actual,
    organizationsBrowserClient: {
      ...actual.organizationsBrowserClient,
      acceptInvitation: (input: AcceptInvitationRequest) => mocks.accept(input),
    },
  };
});

afterEach(() => {
  cleanup();
  mocks.accept.mockReset();
  resetInvitationAcceptOnceForTests();
  vi.useRealTimers();
});

describe("loadCompetitionInvitationAccept", () => {
  it("POSTs once across concurrent loader calls, remount, and a focus-style replay", async () => {
    mocks.accept.mockResolvedValue(accepted);
    const [first, second] = await Promise.allSettled([
      loadCompetitionInvitationAccept("competition-token", false),
      loadCompetitionInvitationAccept("competition-token", false),
    ]);
    const remount = loadCompetitionInvitationAccept("competition-token", false);
    window.dispatchEvent(new Event("focus"));
    const afterFocus = loadCompetitionInvitationAccept("competition-token", false);

    for (const result of [first, second]) {
      expect(result.status).toBe("rejected");
      if (result.status === "rejected") {
        expect(isRedirect(result.reason)).toBe(true);
      }
    }
    await expect(remount).rejects.toSatisfy((error: unknown) => isRedirect(error));
    await expect(afterFocus).rejects.toSatisfy((error: unknown) => isRedirect(error));
    expect(mocks.accept).toHaveBeenCalledTimes(1);
    expect(mocks.accept).toHaveBeenCalledWith({ token: "competition-token" });
  });

  it("does not POST on preload", async () => {
    mocks.accept.mockResolvedValue(accepted);
    await expect(loadCompetitionInvitationAccept("competition-token", true)).resolves.toEqual({
      kind: "preload",
    });
    expect(mocks.accept).not.toHaveBeenCalled();
  });

  it("treats an already-accepted invitation as success and redirects", async () => {
    mocks.accept.mockResolvedValue(accepted);
    await expect(loadCompetitionInvitationAccept("already-accepted", false)).rejects.toSatisfy(
      (error: unknown) =>
        isRedirect(error) && error.options.to === "/orgs/$orgId/competitions/$competitionId",
    );
    expect(mocks.accept).toHaveBeenCalledTimes(1);
  });

  it("POSTs again only after an explicit retry forget", async () => {
    mocks.accept
      .mockRejectedValueOnce(
        new OrganizationsClientError({
          status: 429,
          code: "api.rate_limited",
          message: "api.rate_limited",
          requestId: "2170e2f6-a47e-4338-83c3-27c054630800",
          retryAfterSeconds: 2,
        }),
      )
      .mockResolvedValueOnce(accepted);

    const limited = await loadCompetitionInvitationAccept("competition-token", false);
    expect(limited).toEqual({
      kind: "error",
      error: {
        message: "Alcanzaste el límite temporal de invitaciones.",
        requestId: "2170e2f6-a47e-4338-83c3-27c054630800",
        retryAfterSeconds: 2,
      },
    });
    await expect(loadCompetitionInvitationAccept("competition-token", false)).resolves.toEqual(
      limited,
    );
    expect(mocks.accept).toHaveBeenCalledTimes(1);

    forgetInvitationAccept("competition-token");
    await expect(loadCompetitionInvitationAccept("competition-token", false)).rejects.toSatisfy(
      (error: unknown) => isRedirect(error),
    );
    expect(mocks.accept).toHaveBeenCalledTimes(2);
  });
});

describe("AcceptInvitationDeepLink", () => {
  it("keeps the token available for manual retry after rate limiting", async () => {
    mocks.accept
      .mockRejectedValueOnce(
        new OrganizationsClientError({
          status: 429,
          code: "api.rate_limited",
          message: "api.rate_limited",
          requestId: "2170e2f6-a47e-4338-83c3-27c054630800",
          retryAfterSeconds: 2,
        }),
      )
      .mockResolvedValueOnce(accepted);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(
      <StrictMode>
        <InvitationAcceptHarness token="competition-token" />
      </StrictMode>,
    );

    expect(await screen.findByText("Podrás reintentar en 2 s.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reintentar en 2 s" })).toBeDisabled();
    expect(mocks.accept).toHaveBeenCalledTimes(1);

    void act(() => vi.advanceTimersByTime(2_000));
    fireEvent.click(screen.getByRole("button", { name: "Reintentar invitación" }));

    expect(await screen.findByText("Copa (destino)")).toBeTruthy();
    await waitFor(() => expect(mocks.accept).toHaveBeenCalledTimes(2));
    expect(mocks.accept).toHaveBeenLastCalledWith({ token: "competition-token" });
  });

  it("redirects once under StrictMode when the invitation was already accepted", async () => {
    mocks.accept.mockResolvedValue(accepted);
    render(
      <StrictMode>
        <InvitationAcceptHarness token="already-accepted" />
      </StrictMode>,
    );

    expect(await screen.findByText("Copa (destino)")).toBeTruthy();
    expect(mocks.accept).toHaveBeenCalledTimes(1);
  });
});

function InvitationAcceptHarness({ token }: Readonly<{ token: string }>) {
  const [router] = useState(() => {
    const rootRoute = createRootRoute({ component: Outlet });
    const acceptRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/invitations/accept/$plainToken",
      staleTime: Infinity,
      gcTime: Infinity,
      preload: false,
      pendingComponent: () => <AcceptInvitationDeepLink error={null} />,
      loader: ({ params, preload }) => loadCompetitionInvitationAccept(params.plainToken, preload),
      component: function AcceptPage() {
        const { plainToken } = acceptRoute.useParams();
        const result = acceptRoute.useLoaderData() as InvitationAcceptLoaderResult;
        if (result.kind !== "error") return <AcceptInvitationDeepLink error={null} />;
        return (
          <AcceptInvitationDeepLink
            error={result.error}
            onRetry={() => {
              forgetInvitationAccept(plainToken);
              void router.invalidate();
            }}
          />
        );
      },
    });
    const destinationRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId",
      component: () => <p>Copa (destino)</p>,
    });
    return createRouter({
      routeTree: rootRoute.addChildren([acceptRoute, destinationRoute]),
      history: createMemoryHistory({ initialEntries: [`/invitations/accept/${token}`] }),
      defaultPreload: false,
    });
  });
  return <RouterProvider router={router} />;
}
