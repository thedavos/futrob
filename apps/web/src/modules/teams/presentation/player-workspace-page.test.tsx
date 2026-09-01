// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type {
  GetMyPlayerProfileResponse,
  GetMyTeamsResponse,
  SetActiveTeamResponse,
} from "@futrob/api-contracts";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { PlayerWorkspacePage } from "./player-workspace-page.tsx";

const getMyProfile = vi.fn<() => Promise<GetMyPlayerProfileResponse>>();
const getMyTeams = vi.fn<() => Promise<GetMyTeamsResponse>>();
const setActiveTeam =
  vi.fn<(input: { rosterMembershipId: string }) => Promise<SetActiveTeamResponse>>();

vi.mock("./teams-browser-client.ts", () => ({
  teamsBrowserClient: {
    getMyProfile: () => getMyProfile(),
    getMyTeams: () => getMyTeams(),
    setActiveTeam: (input: { rosterMembershipId: string }) => setActiveTeam(input),
  },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children?: ReactNode }) => (
    <a href={to} {...props}>
      {children}
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
      externalClubs: [],
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

    renderPage();

    expect(await screen.findByText("Alpha FC")).toBeTruthy();
    expect(screen.getByText("Beta FC")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Abrir Mis partidos" }).getAttribute("href")).toBe(
      "/player/matches",
    );
    expect(screen.getByRole("button", { name: "Abrir tu perfil" }).getAttribute("href")).toBe(
      "/player/statistics",
    );

    fireEvent.click(screen.getByRole("radio", { name: /Beta FC/ }));
    await waitFor(() => {
      expect(setActiveTeam).toHaveBeenCalledWith({ rosterMembershipId: "m2" });
    });
  });

  it("renders English copy for the personal stats entry cards", async () => {
    getMyProfile.mockResolvedValue({
      profile: { id: "p1", createdAt: "2026-08-01T00:00:00.000Z" },
      gameAccounts: [],
      externalClubs: [],
    });
    getMyTeams.mockResolvedValue({ activeRosterMembershipId: null, teams: [] });

    renderPage("en");

    expect(await screen.findByRole("heading", { name: "My matches" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "My statistics" })).toBeTruthy();
    expect(
      screen.getByText(
        "You as a player: rating, attributes and statistics from your recent matches.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open My matches" }).getAttribute("href")).toBe(
      "/player/matches",
    );
    expect(screen.getByRole("button", { name: "Open your profile" }).getAttribute("href")).toBe(
      "/player/statistics",
    );
  });
});

function renderPage(locale: "es" | "en" = "es") {
  render(
    <I18nProvider initialLocale={locale} persistLocale={async () => undefined}>
      <QueryTestProvider>
        <PlayerWorkspacePage />
      </QueryTestProvider>
    </I18nProvider>,
  );
}
