// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { PlayerWorkspacePage } from "./player-workspace-page.tsx";

const getMyProfile = vi.fn<() => Promise<unknown>>();
const getMyTeams = vi.fn<() => Promise<unknown>>();
const setActiveTeam = vi.fn<(input: { rosterMembershipId: string }) => Promise<unknown>>();

vi.mock("./teams-browser-client.ts", () => ({
  teamsBrowserClient: {
    getMyProfile: () => getMyProfile(),
    getMyTeams: () => getMyTeams(),
    setActiveTeam: (input: { rosterMembershipId: string }) => setActiveTeam(input),
  },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children?: unknown }) => (
    <a href={to} {...props}>
      {children as never}
    </a>
  ),
}));

describe("PlayerWorkspacePage", () => {
  beforeEach(() => {
    vi.stubGlobal("PointerEvent", MouseEvent);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("lists roster memberships and sets the active team", async () => {
    getMyProfile.mockResolvedValue({
      profile: { id: "p1", createdAt: "2026-08-01T00:00:00.000Z" },
      gameAccounts: [],
    });
    getMyTeams.mockResolvedValue({
      activeRosterMembershipId: "m1",
      teams: [
        {
          active: true,
          team: {
            id: "t1",
            organizationId: "o1",
            name: "Alpha FC",
            createdAt: "2026-08-01T00:00:00.000Z",
          },
          membership: {
            id: "m1",
            organizationId: "o1",
            competitionId: "c1",
            teamId: "t1",
            playerProfileId: "p1",
            gameAccountId: null,
            role: "player",
            createdAt: "2026-08-01T00:00:00.000Z",
          },
        },
        {
          active: false,
          team: {
            id: "t2",
            organizationId: "o1",
            name: "Beta FC",
            createdAt: "2026-08-01T00:00:00.000Z",
          },
          membership: {
            id: "m2",
            organizationId: "o1",
            competitionId: "c2",
            teamId: "t2",
            playerProfileId: "p1",
            gameAccountId: null,
            role: "captain",
            createdAt: "2026-08-01T00:00:00.000Z",
          },
        },
      ],
    });
    setActiveTeam.mockResolvedValue({
      actorId: "a1",
      rosterMembershipId: "m2",
      updatedAt: "2026-08-01T01:00:00.000Z",
    });

    render(
      <QueryTestProvider>
        <PlayerWorkspacePage />
      </QueryTestProvider>,
    );

    expect(await screen.findByText("Alpha FC")).toBeTruthy();
    expect(screen.getByText("Beta FC")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Abrir Mis partidos" }).getAttribute("href")).toBe(
      "/player/matches",
    );
    expect(
      screen.getByRole("button", { name: "Abrir Mis estadísticas" }).getAttribute("href"),
    ).toBe("/player/statistics");

    fireEvent.click(screen.getByRole("radio", { name: /Beta FC/ }));
    await waitFor(() => {
      expect(setActiveTeam).toHaveBeenCalledWith({ rosterMembershipId: "m2" });
    });
  });
});
