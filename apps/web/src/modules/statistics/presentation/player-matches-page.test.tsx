// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { GetMyRecentMatchesResponse } from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import {
  PLAYER_MATCHES_PAGE_NOW,
  recentMatchesReadyFixture,
  recentProviderMatchFixture,
} from "./player-matches-page.fixtures.ts";
import { PlayerMatchesPage, type PlayerMatchesView } from "./player-matches-page.tsx";

const getMyRecentMatches = vi.fn<() => Promise<GetMyRecentMatchesResponse>>();

vi.mock("@/modules/statistics/presentation/statistics-browser-client.ts", () => ({
  statisticsBrowserClient: {
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

  it("shows a loading state for the summary and the list", () => {
    getMyRecentMatches.mockReturnValue(new Promise(() => undefined));

    renderPage();

    expect(screen.getByText("Cargando tus partidos…")).toBeTruthy();
    expect(screen.getByLabelText("Cargando el resumen de partidos…")).toBeTruthy();
    expect(screen.queryByText("Oficiales")).toBeNull();
  });

  it("shows English copy when the locale is en", () => {
    getMyRecentMatches.mockReturnValue(new Promise(() => undefined));

    renderPage("en");

    expect(screen.getByRole("heading", { name: "My matches" })).toBeTruthy();
    expect(screen.getByText("Appearances in your associated clubs.")).toBeTruthy();
    expect(screen.getByText("Loading your matches…")).toBeTruthy();
  });

  it("shows a recoverable error without painting a 0-0-0 record", async () => {
    getMyRecentMatches.mockRejectedValue(new Error("provider-down"));

    renderPage();

    expect((await screen.findByRole("alert")).textContent).toContain(
      "No pudimos cargar tus partidos.",
    );
    expect(screen.queryByText("Ganados")).toBeNull();
    expect(screen.queryByText("0", { selector: "[data-metric='record-wins']" })).toBeNull();
  });

  it("asks to associate a club without sending the player to game accounts", async () => {
    getMyRecentMatches.mockResolvedValue({ status: "needs_club" });

    renderPage();

    expect(await screen.findByText("Asocia un club para ver partidos recientes")).toBeTruthy();
    expect(screen.queryByText("Ganados")).toBeNull();
    expect(screen.queryByRole("button", { name: "Revisar datos de juego" })).toBeNull();
    expect(screen.queryByText("Oficiales")).toBeNull();
  });

  it("opens the add-club dialog from the needs-club empty state", async () => {
    getMyRecentMatches.mockResolvedValue({ status: "needs_club" });

    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Añadir club" }));
    expect(await screen.findByRole("heading", { name: "Añadir club" })).toBeTruthy();
  });

  it("sends the player to game accounts when a club is associated without an identifier", async () => {
    getMyRecentMatches.mockResolvedValue({ status: "needs_game_account" });

    renderPage();

    expect(await screen.findByText("Añade una cuenta de juego")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Revisar datos de juego" }).getAttribute("href"),
    ).toBe("/player/game-accounts");
    expect(screen.queryByText("Ganados")).toBeNull();
  });

  it("does not tell the player to link game data when associated clubs returned no appearances", async () => {
    getMyRecentMatches.mockResolvedValue({ status: "ready", matches: [] });

    renderPage();

    expect(await screen.findByText("No hay partidos recientes")).toBeTruthy();
    expect(
      screen.getByText("Todavía no hay apariciones recientes en tus clubes asociados."),
    ).toBeTruthy();
    expect(screen.queryByText("Vincula tus datos de juego")).toBeNull();
    expect(screen.queryByRole("button", { name: "Revisar datos de juego" })).toBeNull();
    expect(screen.queryByText("Ganados")).toBeNull();
  });

  it("renders a recent appearance with a centered score, stats and MVP", async () => {
    getMyRecentMatches.mockResolvedValue(interMilan());

    renderPage();

    expect(await screen.findByRole("listitem", { name: /Inter 2 – 1 Milan/ })).toBeTruthy();
    expect(screen.getByText("Hoy")).toBeTruthy();
    expect(screen.getByText("davos282 MVP")).toBeTruthy();
    expect(document.querySelectorAll("[data-slot='club-crest-avatar']").length).toBe(2);
    expect(document.querySelector("[data-slot='club-crest-image']")?.getAttribute("src")).toBe(
      "https://example.com/inter.png",
    );
    expect(screen.getByText("1", { selector: "[data-metric='recent-goals']" })).toBeTruthy();
    expect(screen.getByText("0", { selector: "[data-metric='recent-assists']" })).toBeTruthy();
    expect(screen.getByText("8,4", { selector: "[data-metric='recent-rating']" })).toBeTruthy();
    expect(screen.getByText("1", { selector: "[data-metric='recent-yellow']" })).toBeTruthy();
    expect(document.querySelector("[data-metric='recent-red']")).toBeNull();
    expect(document.querySelector("[data-metric-icon='recent-goals']")).toBeTruthy();
    expect(document.querySelector("[data-metric-icon='recent-assists']")).toBeTruthy();
    expect(document.querySelector("[data-metric-icon='recent-rating']")).toBeTruthy();
    expect(document.querySelector("[data-metric-icon='recent-yellow']")).toBeTruthy();
    expect(document.querySelector("[data-match-type='leagueMatch']")?.textContent).toBe("Liga");
    expect(document.querySelector("[data-match-type='leagueMatch']")?.className).toContain(
      "text-emphasis",
    );
    expect(document.querySelector("[data-match-outcome='win']")).toBeTruthy();
    expect(screen.queryByText("Hat-trick")).toBeNull();
    expect(screen.getByRole("group", { name: "Resumen de esta vista" }).className).toContain(
      "xl:grid-cols-6",
    );
    expect(screen.getByText("1", { selector: "[data-metric='record-wins']" })).toBeTruthy();
    expect(screen.getByText("1", { selector: "[data-metric='record-goals']" })).toBeTruthy();
    expect(screen.getByText("0", { selector: "[data-metric='record-assists']" })).toBeTruthy();
    expect(document.querySelector("[data-metric-icon='record-wins']")).toBeTruthy();
    expect(document.querySelector("[data-metric-icon='record-draws']")).toBeTruthy();
    expect(document.querySelector("[data-metric-icon='record-losses']")).toBeTruthy();
    expect(document.querySelector("[data-metric-icon='record-goals']")).toBeTruthy();
    expect(document.querySelector("[data-metric-icon='record-assists']")).toBeTruthy();
    expect(document.querySelector("[data-metric-icon='record-rating']")).toBeTruthy();
    expect(screen.queryByText("Oficial")).toBeNull();
  });

  it("groups matches by day and keeps KPIs on the active tab", async () => {
    getMyRecentMatches.mockResolvedValue(recentMatchesReadyFixture());

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Hoy")).toBeTruthy();
    expect(screen.getByText("Ayer")).toBeTruthy();
    expect(screen.queryByText("Atlético Norte")).toBeNull();
    expect(screen.getByText("1", { selector: "[data-metric='record-wins']" })).toBeTruthy();
    expect(screen.getByText("1", { selector: "[data-metric='record-losses']" })).toBeTruthy();
    expect(screen.getByText("0", { selector: "[data-metric='record-draws']" })).toBeTruthy();
    expect(screen.getByText("3", { selector: "[data-metric='record-goals']" })).toBeTruthy();
    expect(screen.getByText("1", { selector: "[data-metric='record-assists']" })).toBeTruthy();

    await user.click(screen.getByRole("tab", { name: "Todos los partidos" }));

    expect(await screen.findByText("Atlético Norte")).toBeTruthy();
    expect(screen.getByText("1 de agosto del 2026")).toBeTruthy();
    expect(screen.getByText("1 de agosto del 2026").closest("time")?.dateTime).toBe("2026-08-01");
    expect(document.querySelector("[data-match-type='friendlyMatch']")?.textContent).toBe(
      "Amistoso",
    );
    expect(document.querySelector("[data-match-outcome='draw']")).toBeTruthy();
    expect(screen.getByText("1", { selector: "[data-metric='record-draws']" })).toBeTruthy();
  });

  it("offers Todos when Recientes is empty and older matches exist", async () => {
    getMyRecentMatches.mockResolvedValue(
      recentMatchesReadyFixture([
        recentProviderMatchFixture({
          id: "old",
          occurredAt: new Date(2026, 7, 1, 18, 0).toISOString(),
          home: { externalClubId: "44001", name: "Atlético Norte", goals: 1, imageUrl: null },
        }),
      ]),
    );

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("No hay partidos en los últimos 7 días")).toBeTruthy();
    expect(screen.queryByText("Atlético Norte")).toBeNull();
    expect(screen.queryByText("Ganados")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Ver todos los partidos" }));

    expect(await screen.findByText("Atlético Norte")).toBeTruthy();
    expect(screen.getByText("1 de agosto del 2026")).toBeTruthy();
    expect(
      screen.getByRole("tab", { name: "Todos los partidos" }).getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("formats older day headings in English", async () => {
    getMyRecentMatches.mockResolvedValue(
      recentMatchesReadyFixture([
        recentProviderMatchFixture({
          id: "old",
          occurredAt: new Date(2026, 7, 1, 18, 0).toISOString(),
          home: { externalClubId: "44001", name: "Atlético Norte", goals: 1, imageUrl: null },
        }),
      ]),
    );

    renderPage("en", { view: "all" });

    expect(await screen.findByText("Atlético Norte")).toBeTruthy();
    expect(screen.getByText("1 August 2026")).toBeTruthy();
  });

  it("notifies the route when the view changes", async () => {
    getMyRecentMatches.mockResolvedValue(recentMatchesReadyFixture());
    const onViewChange = vi.fn<(view: PlayerMatchesView) => void>();

    const user = userEvent.setup();
    renderPage("es", { view: "recent", onViewChange });

    await screen.findByText("Hoy");
    const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent);
    expect(tabs).toEqual(["Recientes", "Liga", "Playoff", "Amistosos", "Todos los partidos"]);
    await user.click(screen.getByRole("tab", { name: "Todos los partidos" }));
    expect(onViewChange).toHaveBeenCalledWith("all");
  });

  it("filters Liga, Playoff and Amistosos from the provider match type", async () => {
    getMyRecentMatches.mockResolvedValue(recentMatchesReadyFixture());

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Hoy")).toBeTruthy();
    expect(document.querySelector("[data-match-type='leagueMatch']")?.textContent).toBe("Liga");
    expect(document.querySelector("[data-match-type='leagueMatch']")?.className).toContain(
      "text-emphasis",
    );
    expect(document.querySelector("[data-match-type='playoffMatch']")?.textContent).toBe("Playoff");
    expect(document.querySelector("[data-match-type='playoffMatch']")?.className).toContain(
      "text-info",
    );
    expect(document.querySelector("[data-match-outcome='win']")).toBeTruthy();
    expect(document.querySelector("[data-match-outcome='loss']")).toBeTruthy();
    expect(document.querySelector("[data-scoring-feat='hatTrick']")?.textContent).toContain(
      "Hat-trick",
    );
    expect(screen.getByText("1", { selector: "[data-metric='recent-yellow']" })).toBeTruthy();
    expect(screen.getByText("2", { selector: "[data-metric='recent-yellow']" })).toBeTruthy();
    expect(screen.getByText("1", { selector: "[data-metric='recent-red']" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Liga" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Playoff" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Amistosos" })).toBeTruthy();

    await user.click(screen.getByRole("tab", { name: "Liga" }));
    expect(await screen.findByText("Fera Enjaulada")).toBeTruthy();
    expect(document.querySelector("[data-match-type]")).toBeNull();
    expect(screen.queryByText("Cuervos FC")).toBeNull();
    expect(screen.queryByText("Atlético Norte")).toBeNull();

    await user.click(screen.getByRole("tab", { name: "Playoff" }));
    expect(await screen.findByText("Cuervos FC")).toBeTruthy();
    expect(screen.queryByText("Atlético Norte")).toBeNull();

    await user.click(screen.getByRole("tab", { name: "Amistosos" }));
    expect(await screen.findByText("Atlético Norte")).toBeTruthy();
    expect(document.querySelector("[data-match-outcome='draw']")).toBeTruthy();
    expect(screen.queryByText("Cuervos FC")).toBeNull();
  });

  it("badges hat-trick, poker and repoker from appearance goals", async () => {
    getMyRecentMatches.mockResolvedValue(
      recentMatchesReadyFixture([
        recentProviderMatchFixture({
          home: { externalClubId: "1", name: "Norte FC", goals: 3, imageUrl: null },
          appearance: { goals: 3 },
        }),
        recentProviderMatchFixture({
          id: "poker-match",
          externalMatchId: "ea-poker",
          home: { externalClubId: "2", name: "Sur FC", goals: 4, imageUrl: null },
          appearance: { goals: 4 },
        }),
        recentProviderMatchFixture({
          id: "repoker-match",
          externalMatchId: "ea-repoker",
          home: { externalClubId: "3", name: "Este FC", goals: 6, imageUrl: null },
          appearance: { goals: 6 },
        }),
      ]),
    );

    renderPage();

    expect(await screen.findByText("Norte FC")).toBeTruthy();
    expect(document.querySelector("[data-scoring-feat='hatTrick']")?.textContent).toContain(
      "Hat-trick",
    );
    expect(
      document.querySelector("[data-scoring-feat='hatTrick']")?.getAttribute("data-feat-scorer"),
    ).toBe("davos282");
    expect(document.querySelector("[data-scoring-feat='poker']")?.textContent).toContain("Póker");
    expect(document.querySelector("[data-scoring-feat='repoker']")?.textContent).toContain(
      "Repóker",
    );
  });

  it("omits the hat-trick scorer tooltip when the name is missing", async () => {
    getMyRecentMatches.mockResolvedValue(
      recentMatchesReadyFixture([
        recentProviderMatchFixture({
          home: { externalClubId: "1", name: "Norte FC", goals: 3, imageUrl: null },
          appearance: { goals: 3, displayName: "  " },
        }),
      ]),
    );

    renderPage();

    expect(await screen.findByText("Hat-trick")).toBeTruthy();
    expect(
      document.querySelector("[data-scoring-feat='hatTrick']")?.getAttribute("data-feat-scorer"),
    ).toBeNull();
  });

  it("hides yellow cards unless the appearance has at least one", async () => {
    getMyRecentMatches.mockResolvedValue(
      recentMatchesReadyFixture([
        recentProviderMatchFixture({
          appearance: { yellowCards: 0, redCards: 0 },
        }),
      ]),
    );

    renderPage();

    expect(await screen.findByText("Fera Enjaulada")).toBeTruthy();
    expect(document.querySelector("[data-metric='recent-yellow']")).toBeNull();
    expect(document.querySelector("[data-metric='recent-red']")).toBeNull();
  });

  it("badges a DNF match with an icon", async () => {
    getMyRecentMatches.mockResolvedValue(
      recentMatchesReadyFixture([
        recentProviderMatchFixture({
          metadata: { winnerByForfeit: true, wasDisconnected: true },
        }),
      ]),
    );

    renderPage();

    expect(await screen.findByLabelText("Ganado por desconexión")).toBeTruthy();
    expect(document.querySelector("[data-match-dnf]")).toBeTruthy();
  });

  it("names the match MVP even when it is another player", async () => {
    const rival = recentProviderMatchFixture().appearance;
    getMyRecentMatches.mockResolvedValue(
      recentMatchesReadyFixture([
        recentProviderMatchFixture({
          appearance: { isMvp: false, displayName: "davos282" },
          players: [{ ...rival, displayName: "Rival Cap", isMvp: true }],
        }),
      ]),
    );

    renderPage();

    expect(await screen.findByText("Rival Cap MVP")).toBeTruthy();
  });
});

function renderPage(
  locale: "es" | "en" = "es",
  options: {
    readonly view?: PlayerMatchesView;
    readonly onViewChange?: (view: PlayerMatchesView) => void;
  } = {},
) {
  render(
    <I18nProvider initialLocale={locale} persistLocale={async () => undefined}>
      <QueryTestProvider>
        <PlayerMatchesPage
          now={PLAYER_MATCHES_PAGE_NOW}
          onViewChange={options.onViewChange}
          view={options.view}
        />
      </QueryTestProvider>
    </I18nProvider>,
  );
}

function interMilan(): GetMyRecentMatchesResponse {
  return recentMatchesReadyFixture([
    recentProviderMatchFixture({
      home: {
        externalClubId: "10754",
        name: "Inter",
        goals: 2,
        imageUrl: "https://example.com/inter.png",
      },
      away: { externalClubId: "99", name: "Milan", goals: 1, imageUrl: null },
      appearance: { isMvp: true, goals: 1, assists: 0, rating: 8.4, yellowCards: 1, redCards: 0 },
    }),
  ]);
}
