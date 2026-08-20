// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { GetMyTeamsResponse } from "@futrob/api-contracts";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { PlayerCompetitionsPage } from "./player-competitions-page.tsx";

const getMyTeams = vi.fn<() => Promise<GetMyTeamsResponse>>();

vi.mock("./teams-browser-client.ts", () => ({
  teamsBrowserClient: {
    getMyTeams: () => getMyTeams(),
  },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children?: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

describe("PlayerCompetitionsPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows an empty state when the player has no competitions", async () => {
    getMyTeams.mockResolvedValue({
      activeRosterMembershipId: null,
      teams: [],
    });

    render(
      <QueryTestProvider>
        <PlayerCompetitionsPage />
      </QueryTestProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Competiciones" })).toBeTruthy();
      expect(screen.getByText("Sin competiciones todavía")).toBeTruthy();
    });
    expect(screen.getByRole("button", { name: "Aceptar invitación" })).toBeTruthy();
  });

  it("lists competitions derived from team memberships", async () => {
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
      ],
    });

    render(
      <QueryTestProvider>
        <PlayerCompetitionsPage />
      </QueryTestProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Competición c1")).toBeTruthy();
    });
    expect(screen.getByText("Equipo Alpha FC")).toBeTruthy();
  });
});
