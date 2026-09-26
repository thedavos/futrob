// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { GetMyPlayerProfileResponse, GetMyTeamsResponse } from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { PlayerCompetitionsPage } from "./player-competitions-page.tsx";
import { playerExternalClubFixture, playerProfileFixture } from "./player-story-fixtures.ts";

const getMyTeams = vi.fn<() => Promise<GetMyTeamsResponse>>();
const getMyProfile = vi.fn<() => Promise<GetMyPlayerProfileResponse>>();

vi.mock("./teams-browser-client.ts", () => ({
  teamsBrowserClient: {
    getMyTeams: () => getMyTeams(),
    getMyProfile: () => getMyProfile(),
  },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children?: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

function renderPage() {
  return render(
    <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
      <QueryTestProvider>
        <PlayerCompetitionsPage />
      </QueryTestProvider>
    </I18nProvider>,
  );
}

describe("PlayerCompetitionsPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a centered empty section when the player has no competitions", async () => {
    getMyTeams.mockResolvedValue({
      activeRosterMembershipId: null,
      teams: [],
    });
    getMyProfile.mockResolvedValue(playerProfileFixture());

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Tu club aún no participa en competiciones" }),
      ).toBeTruthy();
    });
    expect(screen.getByRole("heading", { name: "Mis competiciones" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Explorar competiciones" })).toHaveAttribute(
      "href",
      "/player/competitions/explore",
    );
    expect(screen.queryByRole("button", { name: "Aceptar invitación" })).toBeNull();
    await waitFor(() => {
      expect(getMyProfile).toHaveBeenCalled();
    });
    expect(screen.queryByRole("link", { name: "Cambiar club" })).toBeNull();
  });

  it("hides the switch-club line when the player has a single club", async () => {
    getMyTeams.mockResolvedValue({
      activeRosterMembershipId: null,
      teams: [],
    });
    getMyProfile.mockResolvedValue(
      playerProfileFixture({
        externalClubs: [playerExternalClubFixture()],
      }),
    );

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Tu club aún no participa en competiciones" }),
      ).toBeTruthy();
    });
    await waitFor(() => {
      expect(getMyProfile).toHaveBeenCalled();
    });
    expect(screen.queryByRole("link", { name: "Cambiar club" })).toBeNull();
  });

  it("links Cambiar club to game data when the player has more than one club", async () => {
    getMyTeams.mockResolvedValue({
      activeRosterMembershipId: null,
      teams: [],
    });
    getMyProfile.mockResolvedValue(
      playerProfileFixture({
        externalClubs: [
          playerExternalClubFixture(),
          playerExternalClubFixture({
            externalClubId: "22110",
            externalClubName: "Fera Enjaulada",
          }),
        ],
      }),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Cambiar club" })).toHaveAttribute(
        "href",
        "/player/game-accounts",
      );
    });
    expect(screen.getByText("¿Buscas otro club?", { exact: false })).toBeTruthy();
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
    getMyProfile.mockResolvedValue(playerProfileFixture());

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Competición c1")).toBeTruthy();
    });
    expect(screen.getByText("Equipo Alpha FC")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Explorar competiciones" })).toBeTruthy();
  });
});
