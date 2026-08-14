// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { GetMyMatchesQuery, GetMyRecentMatchesResponse } from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { PlayerMatchesPage } from "./player-matches-page.tsx";

const getMyMatches = vi.fn<(query?: Partial<GetMyMatchesQuery>) => Promise<unknown>>();
const getMyRecentMatches = vi.fn<() => Promise<GetMyRecentMatchesResponse>>();

vi.mock("./statistics-browser-client.ts", () => ({
  statisticsBrowserClient: {
    getMyMatches: (query: Partial<GetMyMatchesQuery>) => getMyMatches(query),
    getMyRecentMatches: () => getMyRecentMatches(),
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

  it("shows a loading state in both sections", () => {
    getMyMatches.mockReturnValue(new Promise(() => undefined));
    getMyRecentMatches.mockReturnValue(new Promise(() => undefined));

    renderPage();

    expect(screen.getByText("Cargando partidos recientes…")).toBeTruthy();
    expect(screen.getByText("Cargando partidos oficiales…")).toBeTruthy();
  });

  it("shows English copy when the locale is en", () => {
    getMyMatches.mockReturnValue(new Promise(() => undefined));
    getMyRecentMatches.mockReturnValue(new Promise(() => undefined));

    renderPage("en");

    expect(screen.getByText("Loading recent matches…")).toBeTruthy();
    expect(screen.getByText("Loading official matches…")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "My matches" })).toBeTruthy();
  });

  it("keeps official matches visible when recent matches fail", async () => {
    getMyRecentMatches.mockRejectedValue(new Error("provider-down"));
    getMyMatches.mockResolvedValue({
      matches: [contribution({ id: "contribution-1", displayName: "Davion10" })],
      nextCursor: null,
    });

    renderPage();

    expect((await screen.findByRole("alert")).textContent).toContain(
      "No pudimos cargar tus partidos recientes.",
    );
    expect(await screen.findByText("Davion10")).toBeTruthy();
  });

  it("keeps recent matches visible when official matches fail", async () => {
    getMyMatches.mockRejectedValue(new Error("offline"));
    getMyRecentMatches.mockResolvedValue({ status: "needs_club" });

    renderPage();

    expect((await screen.findByRole("alert")).textContent).toContain(
      "No pudimos cargar tus partidos oficiales.",
    );
    expect(await screen.findByText("Asocia un club para ver partidos recientes")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Añadir club" })).toBeTruthy();
  });

  it("asks to associate a club without sending the player to game accounts for official empty", async () => {
    getMyMatches.mockResolvedValue({ matches: [], nextCursor: null });
    getMyRecentMatches.mockResolvedValue({ status: "needs_club" });

    renderPage();

    expect(await screen.findByText("Asocia un club para ver partidos recientes")).toBeTruthy();
    expect(await screen.findByText("Aún no hay partidos oficiales")).toBeTruthy();
    expect(
      screen.getByText(
        "Los partidos oficiales aparecen cuando una organización aprueba un resultado que coincida contigo.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Revisar datos de juego" })).toBeNull();
    expect(screen.queryByText("Vincula tus datos de juego")).toBeNull();
  });

  it("opens the add-club dialog from the recent empty state", async () => {
    getMyMatches.mockResolvedValue({ matches: [], nextCursor: null });
    getMyRecentMatches.mockResolvedValue({ status: "needs_club" });

    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Añadir club" }));
    expect(await screen.findByRole("heading", { name: "Añadir club" })).toBeTruthy();
  });

  it("sends the player to game accounts when a club is associated without an identifier", async () => {
    getMyMatches.mockResolvedValue({ matches: [], nextCursor: null });
    getMyRecentMatches.mockResolvedValue({ status: "needs_game_account" });

    renderPage();

    expect(await screen.findByText("Añade una cuenta de juego")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Revisar datos de juego" }).getAttribute("href"),
    ).toBe("/player/game-accounts");
  });

  it("does not tell the player to link game data when associated clubs returned no appearances", async () => {
    getMyMatches.mockResolvedValue({ matches: [], nextCursor: null });
    getMyRecentMatches.mockResolvedValue({ status: "ready", matches: [] });

    renderPage();

    expect(await screen.findByText("No hay partidos recientes")).toBeTruthy();
    expect(
      screen.getByText("Todavía no hay apariciones recientes en tus clubes asociados."),
    ).toBeTruthy();
    expect(screen.queryByText("Vincula tus datos de juego")).toBeNull();
    expect(screen.queryByRole("button", { name: "Revisar datos de juego" })).toBeNull();
  });

  it("renders a recent appearance with home/away score and this player's stats", async () => {
    getMyMatches.mockResolvedValue({ matches: [], nextCursor: null });
    getMyRecentMatches.mockResolvedValue(recentAppearance());

    renderPage();

    expect(await screen.findByText("Inter")).toBeTruthy();
    expect(screen.getByText("Milan")).toBeTruthy();
    expect(screen.getByText("2–1")).toBeTruthy();
    expect(screen.queryByText("Observación EA")).toBeNull();
    expect(document.querySelectorAll("[data-slot='club-crest-avatar']").length).toBe(2);
    expect(document.querySelector("[data-slot='club-crest-image']")?.getAttribute("src")).toBe(
      "https://example.com/inter.png",
    );
    expect(screen.getByText("1", { selector: "[data-metric='recent-goals']" })).toBeTruthy();
    expect(screen.getByText("0", { selector: "[data-metric='recent-assists']" })).toBeTruthy();
    expect(screen.getByText("8,4", { selector: "[data-metric='recent-rating']" })).toBeTruthy();
    expect(screen.getByText(/davos282/)).toBeTruthy();
  });

  it("renders only sanitized contribution fields and marks incomplete data", async () => {
    getMyRecentMatches.mockResolvedValue({ status: "needs_club" });
    getMyMatches.mockResolvedValue({
      matches: [contribution({ id: "contribution-1", displayName: "Davion10" })],
      nextCursor: null,
    });

    renderPage();

    expect(await screen.findByText("Davion10")).toBeTruthy();
    expect(screen.getByText("FC 26 · PlayStation")).toBeTruthy();
    expect(screen.getByText("0", { selector: "[data-metric='goals']" })).toBeTruthy();
    expect(screen.getByText("2", { selector: "[data-metric='assists']" })).toBeTruthy();
    expect(screen.getByText("Datos parciales")).toBeTruthy();
    expect(screen.getByText("Oficial")).toBeTruthy();
    expect(screen.queryByText("raw-provider-payload")).toBeNull();
    expect(screen.queryByText("official-result-1")).toBeNull();
    expect(screen.queryByText("external-player-1")).toBeNull();
  });

  it("loads the next cursor page into the history list", async () => {
    getMyRecentMatches.mockResolvedValue({ status: "needs_club" });
    getMyMatches
      .mockResolvedValueOnce({
        matches: [contribution({ id: "page-1", displayName: "First page" })],
        nextCursor: "cursor-2",
      })
      .mockResolvedValueOnce({
        matches: [contribution({ id: "page-2", displayName: "Second page" })],
        nextCursor: null,
      });

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("First page")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Cargar más partidos" }));
    expect(await screen.findByText("Second page")).toBeTruthy();
    expect(getMyMatches).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ cursor: "cursor-2" }),
    );
    expect(screen.queryByRole("button", { name: "Cargar más partidos" })).toBeNull();
  });
});

function renderPage(locale: "es" | "en" = "es") {
  render(
    <I18nProvider initialLocale={locale} persistLocale={async () => undefined}>
      <QueryTestProvider>
        <PlayerMatchesPage />
      </QueryTestProvider>
    </I18nProvider>,
  );
}

function contribution(input: { readonly id: string; readonly displayName: string }) {
  return {
    id: input.id,
    officialResultId: "official-result-1",
    revision: 2,
    encounterId: "encounter-1",
    competitionId: "competition-1",
    organizationId: "organization-1",
    officialSlot: 1,
    teamId: "team-1",
    correlationStatus: "matched",
    externalPlayerId: "external-player-1",
    displayName: input.displayName,
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
  };
}

function recentAppearance(): GetMyRecentMatchesResponse {
  return {
    status: "ready",
    matches: [
      {
        match: {
          id: "provider-match-1",
          provider: { key: "ea-clubs", externalMatchId: "ea-1" },
          game: { edition: "fc26", platform: "common-gen5", mode: "clubs" },
          occurredAt: "2026-08-13T18:00:00.000Z",
          home: {
            externalClubId: "10754",
            name: "Inter",
            goals: 2,
            imageUrl: "https://example.com/inter.png",
          },
          away: { externalClubId: "99", name: "Milan", goals: 1, imageUrl: null },
          players: [],
          metadata: {
            durationSeconds: 540,
            wasDisconnected: false,
            winnerByForfeit: false,
            completeness: "complete",
          },
        },
        appearance: {
          externalPlayerId: "davos282",
          displayName: "davos282",
          externalClubId: "10754",
          position: "ST",
          minutesPlayed: 12,
          goals: 1,
          assists: 0,
          shots: 3,
          passAttempts: 8,
          passesMade: 6,
          tackleAttempts: 1,
          tacklesMade: 1,
          saves: null,
          yellowCards: 0,
          redCards: 0,
          isMvp: false,
          rating: 8.4,
        },
      },
    ],
  };
}
