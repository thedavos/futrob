// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { PlayerMatchesPage } from "./player-matches-page.tsx";

const getMyMatches = vi.fn<() => Promise<unknown>>();

vi.mock("./statistics-browser-client.ts", () => ({
  statisticsBrowserClient: {
    getMyMatches: () => getMyMatches(),
  },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children?: unknown }) => (
    <a href={to} {...props}>
      {children as never}
    </a>
  ),
}));

describe("PlayerMatchesPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a loading state", () => {
    getMyMatches.mockReturnValue(new Promise(() => undefined));

    renderPage();

    expect(screen.getByText("Cargando tus partidos…")).toBeTruthy();
  });

  it("shows a recoverable error", async () => {
    getMyMatches.mockRejectedValue(new Error("offline"));

    renderPage();

    expect((await screen.findByRole("alert")).textContent).toContain(
      "No pudimos cargar tus partidos.",
    );
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
  });

  it("shows the empty state with a game-account action", async () => {
    getMyMatches.mockResolvedValue({ matches: [], nextCursor: null });

    renderPage();

    expect(await screen.findByText("Aún no hay partidos oficiales")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Revisar datos de juego" }).getAttribute("href"),
    ).toBe("/player/game-accounts");
  });

  it("renders only sanitized contribution fields and marks incomplete data", async () => {
    getMyMatches.mockResolvedValue({
      matches: [
        {
          id: "contribution-1",
          officialResultId: "official-result-1",
          revision: 2,
          encounterId: "encounter-1",
          competitionId: "competition-1",
          organizationId: "organization-1",
          officialSlot: 1,
          teamId: "team-1",
          correlationStatus: "matched",
          externalPlayerId: "external-player-1",
          displayName: "Davion10",
          externalClubId: "external-club-1",
          platform: "playstation",
          gameEdition: "FC 26",
          position: "Delantero",
          minutesPlayed: 90,
          goals: 0,
          assists: 2,
          shots: 4,
          passAttempts: 19,
          passesMade: 16,
          tackleAttempts: null,
          tacklesMade: null,
          saves: null,
          yellowCards: 0,
          redCards: 0,
          isMvp: false,
          rating: 8.4,
          rawPayload: "raw-provider-payload",
        },
      ],
      nextCursor: null,
    });

    renderPage();

    expect(await screen.findByText("Davion10")).toBeTruthy();
    expect(screen.getByText("FC 26 · PlayStation")).toBeTruthy();
    expect(screen.getByText("0", { selector: "[data-metric='goals']" })).toBeTruthy();
    expect(screen.getByText("2", { selector: "[data-metric='assists']" })).toBeTruthy();
    expect(screen.getByText("Datos parciales")).toBeTruthy();
    expect(screen.queryByText("raw-provider-payload")).toBeNull();
    expect(screen.queryByText("official-result-1")).toBeNull();
    expect(screen.queryByText("external-player-1")).toBeNull();
  });
});

function renderPage() {
  render(
    <QueryTestProvider>
      <PlayerMatchesPage />
    </QueryTestProvider>,
  );
}
