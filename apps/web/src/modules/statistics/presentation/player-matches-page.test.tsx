// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { GetMyRecentMatchesResponse } from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import {
  PLAYER_MATCHES_PAGE_NOW,
  recentMatchesReadyFixture,
  recentProviderMatchFixture,
} from "./player-matches-page.fixtures.ts";
import { PlayerMatchesPage, type PlayerMatchesView } from "./player-matches-page.tsx";
import type { MatchSortOrder } from "./player-match-view.ts";

const getMyRecentMatches =
  vi.fn<(query?: { readonly externalClubId?: string }) => Promise<GetMyRecentMatchesResponse>>();

vi.mock("@/modules/statistics/presentation/statistics-browser-client.ts", () => ({
  statisticsBrowserClient: {
    getMyRecentMatches: (query?: { readonly externalClubId?: string }) => getMyRecentMatches(query),
  },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    search,
    children,
    ...props
  }: {
    to: string;
    params?: { readonly providerKey: string; readonly externalMatchId: string };
    search?: { readonly view: string; readonly sort: string };
    children?: ReactNode;
  }) => {
    const path = params
      ? to
          .replace("$providerKey", params.providerKey)
          .replace("$externalMatchId", params.externalMatchId)
      : to;
    const query = search ? `?view=${search.view}&sort=${search.sort}` : "";
    return (
      <a href={`${path}${query}`} {...props}>
        {children}
      </a>
    );
  },
}));

describe("PlayerMatchesPage", () => {
  beforeEach(() => {
    vi.stubGlobal("PointerEvent", MouseEvent);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows a loading state for the summary and the list", () => {
    getMyRecentMatches.mockReturnValue(new Promise(() => undefined));

    renderPage();

    expect(screen.getByText("Cargando tus partidos…")).toBeTruthy();
    expect(screen.getByLabelText("Cargando el resumen de partidos…")).toBeTruthy();
    expect(
      screen.getByLabelText("Cargando el resumen de partidos…").getAttribute("data-record-cards"),
    ).toBe("3");
    expect(screen.queryByText("Oficiales")).toBeNull();
  });

  it("shows English copy when the locale is en", () => {
    getMyRecentMatches.mockReturnValue(new Promise(() => undefined));

    renderPage("en");

    expect(screen.getByRole("heading", { name: "My matches" })).toBeTruthy();
    expect(screen.getByText("Appearances in the selected club.")).toBeTruthy();
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

    expect(await screen.findByText("No hay partidos")).toBeTruthy();
    expect(screen.getByText("Todavía no hay apariciones en el club seleccionado.")).toBeTruthy();
    expect(screen.queryByText("Vincula tus datos de juego")).toBeNull();
    expect(screen.queryByRole("button", { name: "Revisar datos de juego" })).toBeNull();
    expect(screen.queryByText("Ganados")).toBeNull();
  });

  it("requests appearances for the selected club", async () => {
    getMyRecentMatches.mockResolvedValue({ status: "ready", matches: [] });

    renderPage("es", { externalClubId: "10754" });

    expect(await screen.findByText("No hay partidos")).toBeTruthy();
    expect(getMyRecentMatches).toHaveBeenCalledWith({ externalClubId: "10754" });
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
    expect(
      document.querySelector("[data-match-type='leagueMatch']")?.getAttribute("data-variant"),
    ).toBe("emphasis");
    const outcomeCaption = document.querySelector(
      "[data-match-outcome='win']:not([data-match-score])",
    );
    expect(outcomeCaption?.textContent).toContain("Victoria");
    expect(outcomeCaption?.querySelector("[data-match-outcome-icon='win']")).toBeTruthy();
    expect(document.querySelector("[data-match-chevron]")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ver Inter 2 – 1 Milan" }).getAttribute("href")).toBe(
      "/player/matches/ea-clubs/ea-1?view=all&sort=newest",
    );
    expect(document.querySelectorAll("[data-mvp]")).toHaveLength(1);
    expect(
      document.querySelector("[data-slot='club-crest-avatar']")?.getAttribute("data-slot"),
    ).toBe("club-crest-avatar");
    expect(
      screen
        .getByText("8,4", { selector: "[data-metric='recent-rating']" })
        .closest("[data-slot='badge']")
        ?.getAttribute("data-variant"),
    ).toBe("primary");
    expect(document.querySelector("[data-match-outcome='win']")).toBeTruthy();
    const finalizedStatus = document.querySelector("[data-match-status='finalized']");
    expect(finalizedStatus?.textContent).toBe("Finalizado");
    expect(finalizedStatus?.getAttribute("data-slot")).toBeNull();
    expect(finalizedStatus?.nextElementSibling?.getAttribute("data-match-score")).toBe("");
    expect(document.querySelector("[data-match-score] [data-score-lead='home']")?.textContent).toBe(
      "2",
    );
    const homeWinItem = screen.getByRole("listitem", { name: /Inter 2 – 1 Milan/ });
    expect(
      homeWinItem.querySelector("[data-pitch-half='home']")?.getAttribute("data-pitch-fill"),
    ).toBe("win");
    expect(
      homeWinItem.querySelector("[data-pitch-half='away']")?.getAttribute("data-pitch-fill"),
    ).toBe("loss");
    const homeWatermark = homeWinItem.querySelector("[data-pitch-watermark='home']");
    expect(homeWatermark?.getAttribute("src")).toBe("https://example.com/inter.png");
    expect(homeWinItem.querySelector("[data-pitch-watermark='away']")).toBeNull();
    expect(screen.queryByText("Hat-trick")).toBeNull();
    expect(screen.getByRole("heading", { name: "Rendimiento" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Record" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Contribuciones" })).toBeTruthy();
    const summary = screen.getByRole("group", { name: "Resumen de esta vista" });
    expect(
      within(summary)
        .getAllByRole("heading")
        .map((heading) => heading.textContent),
    ).toEqual(["Rendimiento", "Record", "Contribuciones"]);
    expect(summary.getAttribute("data-record-cards")).toBe("3");
    expect(
      screen
        .getByRole("heading", { name: "Rendimiento" })
        .closest("[data-slot='card']")
        ?.getAttribute("data-record-slot"),
    ).toBe("performance");
    expect(
      screen
        .getByRole("heading", { name: "Contribuciones" })
        .closest("[data-slot='card']")
        ?.getAttribute("data-record-slot"),
    ).toBe("contributions");
    expect(
      screen
        .getByRole("heading", { name: "Record" })
        .closest("[data-slot='card']")
        ?.getAttribute("data-record-slot"),
    ).toBe("record");
    expect(screen.getByText("1", { selector: "[data-metric='record-wins']" })).toBeTruthy();
    expect(
      screen.getByText("1", { selector: "[data-metric='record-goals-plus-assists']" }),
    ).toBeTruthy();
    expect(screen.getByText("1 gol · 0 asistencias")).toBeTruthy();
    expect(
      screen.getByText("1/1", { selector: "[data-metric='record-contributed']" }),
    ).toBeTruthy();
    expect(screen.getByText("1", { selector: "[data-metric='record-pace']" })).toBeTruthy();
    expect(screen.getByText("50%", { selector: "[data-metric='record-share']" })).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Marcaste o asististe en 1 de 1 partido. No cuenta partidos sin datos de goles o asistencias.",
      }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Media de 1 G+A por partido." })).toBeTruthy();
    expect(
      screen.getByRole("button", {
        name: "Marcaste el 50% de los goles del club. No incluye asistencias.",
      }),
    ).toBeTruthy();
    expect(document.querySelector("[data-metric-icon='record-wins']")).toBeTruthy();
    expect(document.querySelector("[data-metric-icon='record-draws']")).toBeTruthy();
    expect(document.querySelector("[data-metric-icon='record-losses']")).toBeTruthy();
    expect(document.querySelector("[data-metric-icon='record-goals-plus-assists']")).toBeTruthy();
    expect(
      document
        .querySelector("[data-metric='record-goals-plus-assists']")
        ?.getAttribute("data-size"),
    ).toBe("compact");
    expect(screen.getByText("8,4", { selector: "[data-metric='record-rating']" })).toBeTruthy();
    expect(screen.getByText("Rating promedio")).toBeTruthy();
    expect(screen.getByText("1", { selector: "[data-metric='record-matches']" })).toBeTruthy();
    expect(document.querySelector("[data-rating-ring]")).toBeTruthy();
    expect(document.querySelector("[data-rating-trend]")).toBeNull();
    expect(screen.queryByLabelText("Forma reciente")).toBeNull();
    expect(screen.queryByText("Oficial")).toBeNull();
  });

  it("groups matches by day and keeps KPIs on the active filter", async () => {
    getMyRecentMatches.mockResolvedValue(recentMatchesReadyFixture());

    renderPage();

    expect(await screen.findByText("Hoy")).toBeTruthy();
    expect(screen.getByText("Ayer")).toBeTruthy();
    expect(screen.getByText("Atlético Norte")).toBeTruthy();
    expect(screen.getByText("1 de agosto del 2026")).toBeTruthy();
    expect(screen.getByText("1 de agosto del 2026").closest("time")?.dateTime).toBe("2026-08-01");
    expect(screen.getByText("1", { selector: "[data-metric='record-wins']" })).toBeTruthy();
    expect(screen.getByText("1", { selector: "[data-metric='record-losses']" })).toBeTruthy();
    expect(screen.getByText("1", { selector: "[data-metric='record-draws']" })).toBeTruthy();
    expect(
      screen.getByText("4", { selector: "[data-metric='record-goals-plus-assists']" }),
    ).toBeTruthy();
    expect(screen.getByText("3 goles · 1 asistencia")).toBeTruthy();
    expect(
      screen.getByText("2/3", { selector: "[data-metric='record-contributed']" }),
    ).toBeTruthy();
    expect(screen.getByText("1,33", { selector: "[data-metric='record-pace']" })).toBeTruthy();
    expect(screen.getByText("75%", { selector: "[data-metric='record-share']" })).toBeTruthy();
    expect(screen.getByText("3", { selector: "[data-metric='record-matches']" })).toBeTruthy();
    expect(screen.getByText("3 partidos")).toBeTruthy();
    expect(document.querySelector("[data-rating-ring]")).toBeTruthy();
    expect(document.querySelector("[data-rating-trend]")).toBeNull();
    expect(screen.getByLabelText("Forma reciente")).toBeTruthy();
    expect(screen.getByText("Forma reciente")).toBeTruthy();
    expect(document.querySelector("[data-recent-form-bar]")).toBeTruthy();
    expect(
      [...document.querySelectorAll("[data-form-segment]")].map((segment) =>
        segment.getAttribute("data-form-segment"),
      ),
    ).toEqual(["draw", "loss", "win"]);
    expect(
      [...document.querySelectorAll("[data-last-game-outcome]")].map((mark) =>
        mark.getAttribute("data-last-game-outcome"),
      ),
    ).toEqual(["draw", "loss", "win"]);
    expect(document.querySelector("[data-match-type='friendlyMatch']")?.textContent).toBe(
      "Amistoso",
    );
    expect(document.querySelector("[data-match-outcome='draw']")).toBeTruthy();
    const drawItem = screen.getByRole("listitem", { name: /Atlético Norte 1 – 1 Fera Enjaulada/ });
    expect(
      drawItem.querySelector("[data-pitch-half='home']")?.getAttribute("data-pitch-fill"),
    ).toBe("drawHome");
    expect(
      drawItem.querySelector("[data-pitch-half='away']")?.getAttribute("data-pitch-fill"),
    ).toBe("drawAway");
    expect(drawItem.querySelector("[data-pitch-fill='win']")).toBeNull();
    expect(drawItem.querySelector("[data-pitch-fill='loss']")).toBeNull();
    expect(document.querySelector("[data-form-segment='draw']")).toBeTruthy();
    expect(document.querySelector("[data-last-game-outcome='draw']")).toBeTruthy();
    expect(document.querySelector("[data-last-game-outcome='draw']")?.textContent).toBe("E");
  });

  it("shows older matches in Todos without a 7-day empty wall", async () => {
    getMyRecentMatches.mockResolvedValue(
      recentMatchesReadyFixture([
        recentProviderMatchFixture({
          id: "old",
          occurredAt: new Date(2026, 7, 1, 18, 0).toISOString(),
          home: { externalClubId: "44001", name: "Atlético Norte", goals: 1, imageUrl: null },
        }),
      ]),
    );

    renderPage();

    expect(await screen.findByText("Atlético Norte")).toBeTruthy();
    expect(screen.getByText("1 de agosto del 2026")).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Todos" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("1 partido")).toBeTruthy();
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
    expect(document.querySelector("[data-match-status='finalized']")?.textContent).toBe(
      "Full time",
    );
  });

  it("notifies the route when the view changes", async () => {
    getMyRecentMatches.mockResolvedValue(recentMatchesReadyFixture());
    const onViewChange = vi.fn<(view: PlayerMatchesView) => void>();

    const user = userEvent.setup();
    renderPage("es", { view: "all", onViewChange });

    await screen.findByText("Hoy");
    const filters = screen.getAllByRole("radio").map((filter) => filter.textContent);
    expect(filters).toEqual(["Todos", "Liga", "Playoff", "Amistosos"]);
    await user.click(screen.getByRole("radio", { name: "Liga" }));
    expect(onViewChange).toHaveBeenCalledWith("league");
  });

  it("notifies the route when the sort order changes", async () => {
    getMyRecentMatches.mockResolvedValue(recentMatchesReadyFixture());
    const onSortChange = vi.fn<(order: MatchSortOrder) => void>();

    const user = userEvent.setup();
    renderPage("es", { view: "all", onSortChange });

    await screen.findByText("Hoy");
    await user.click(screen.getByLabelText("Orden de partidos"));
    await user.click(await screen.findByRole("option", { name: "Más antiguos" }));
    expect(onSortChange).toHaveBeenCalledWith("oldest");
  });

  it("moves the match type filter with arrow keys", async () => {
    getMyRecentMatches.mockResolvedValue(recentMatchesReadyFixture());
    const onViewChange = vi.fn<(view: PlayerMatchesView) => void>();

    const user = userEvent.setup();
    renderPage("es", { view: "all", onViewChange });

    await screen.findByText("Hoy");
    screen.getByRole("radio", { name: "Todos" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onViewChange).toHaveBeenCalledWith("league");
    expect(document.activeElement).toBe(screen.getByRole("radio", { name: "Liga" }));
  });

  it("sorts the day list from oldest to newest", async () => {
    getMyRecentMatches.mockResolvedValue(recentMatchesReadyFixture());

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Hoy")).toBeTruthy();
    const region = screen.getByRole("region", { name: "Todos los partidos" });
    expect([...region.querySelectorAll("h2")].map((heading) => heading.textContent)).toEqual([
      "Hoy",
      "Ayer",
      "1 de agosto del 2026",
    ]);

    expect(screen.getByLabelText("Orden de partidos").textContent).toContain("Más recientes");
    expect(screen.queryByText("newest")).toBeNull();
    await user.click(screen.getByLabelText("Orden de partidos"));
    await user.click(await screen.findByRole("option", { name: "Más antiguos" }));

    expect([...region.querySelectorAll("h2")].map((heading) => heading.textContent)).toEqual([
      "1 de agosto del 2026",
      "Ayer",
      "Hoy",
    ]);
  });

  it("filters Liga, Playoff and Amistosos from the provider match type", async () => {
    getMyRecentMatches.mockResolvedValue(recentMatchesReadyFixture());

    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Hoy")).toBeTruthy();
    expect(
      [...document.querySelectorAll("time")].some((node) =>
        /^\d{2}:\d{2}$/.test(node.textContent ?? ""),
      ),
    ).toBe(true);
    expect(document.querySelector("[data-match-score]")).toBeTruthy();
    expect(document.querySelector("[data-match-status='finalized']")?.nextElementSibling).toBe(
      document.querySelector("[data-match-score]"),
    );
    expect(document.querySelector("[data-match-type='leagueMatch']")?.textContent).toBe("Liga");
    expect(
      document.querySelector("[data-match-type='leagueMatch']")?.getAttribute("data-variant"),
    ).toBe("emphasis");
    expect(document.querySelector("[data-match-type='playoffMatch']")?.textContent).toBe("Playoff");
    expect(
      document.querySelector("[data-match-type='playoffMatch']")?.getAttribute("data-variant"),
    ).toBe("info");
    expect(document.querySelector("[data-match-outcome='win']")).toBeTruthy();
    expect(document.querySelector("[data-match-outcome='loss']")).toBeTruthy();
    const awayWinItem = screen.getByRole("listitem", { name: /Cuervos FC 0 – 3 Fera Barranco/ });
    expect(
      awayWinItem.querySelector("[data-pitch-half='away']")?.getAttribute("data-pitch-fill"),
    ).toBe("win");
    expect(
      awayWinItem.querySelector("[data-pitch-half='home']")?.getAttribute("data-pitch-fill"),
    ).toBe("loss");
    expect(document.querySelector("[data-match-outcome='loss']")).toBeTruthy();
    expect(document.querySelector("[data-scoring-feat='hatTrick']")?.textContent).toContain(
      "Hat-trick",
    );
    expect(
      document.querySelector("[data-scoring-feat='hatTrick']")?.getAttribute("data-variant"),
    ).toBe("warning");
    expect(screen.getByText("1", { selector: "[data-metric='recent-yellow']" })).toBeTruthy();
    expect(screen.getByText("2", { selector: "[data-metric='recent-yellow']" })).toBeTruthy();
    expect(screen.getByText("1", { selector: "[data-metric='recent-red']" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Liga" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Playoff" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Amistosos" })).toBeTruthy();

    await user.click(screen.getByRole("radio", { name: "Liga" }));
    expect(await screen.findByText("Fera Enjaulada")).toBeTruthy();
    expect(document.querySelector("[data-match-type]")).toBeNull();
    expect(screen.queryByText("Cuervos FC")).toBeNull();
    expect(screen.queryByText("Atlético Norte")).toBeNull();
    expect(screen.queryByLabelText("Forma reciente")).toBeNull();

    await user.click(screen.getByRole("radio", { name: "Playoff" }));
    expect(await screen.findByText("Cuervos FC")).toBeTruthy();
    expect(
      screen
        .getByText("6,8", { selector: "[data-metric='recent-rating']" })
        .closest("[data-slot='badge']")
        ?.getAttribute("data-variant"),
    ).toBe("outline");
    expect(screen.queryByText("Atlético Norte")).toBeNull();

    await user.click(screen.getByRole("radio", { name: "Amistosos" }));
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
      document.querySelector("[data-scoring-feat='hatTrick']")?.getAttribute("data-variant"),
    ).toBe("warning");
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
    getMyRecentMatches.mockResolvedValue(
      recentMatchesReadyFixture([
        recentProviderMatchFixture({
          appearance: { isMvp: false, displayName: "davos282" },
          listedMvpDisplayName: "Rival Cap",
        }),
      ]),
    );

    renderPage();

    expect(await screen.findByText("Rival Cap MVP")).toBeTruthy();
    expect(screen.queryByText("davos282")).toBeNull();
    expect(document.querySelector("[data-mvp]")?.getAttribute("data-variant")).toBe("warning");
  });

  it("shows rating trend against the last five when enough matches exist", async () => {
    getMyRecentMatches.mockResolvedValue(
      recentMatchesReadyFixture([
        recentProviderMatchFixture({
          id: "baseline",
          externalMatchId: "ea-baseline",
          occurredAt: new Date(2026, 7, 1, 12, 0).toISOString(),
          appearance: { rating: 7 },
        }),
        ...Array.from({ length: 5 }, (_, index) =>
          recentProviderMatchFixture({
            id: `recent-${index}`,
            externalMatchId: `ea-recent-${index}`,
            occurredAt: new Date(2026, 7, 8 + index, 12, 0).toISOString(),
            appearance: { rating: 8 },
          }),
        ),
      ]),
    );

    renderPage("es", { view: "all" });

    expect(await screen.findByLabelText("Ha mejorado. +1 vs últimos 5")).toBeTruthy();
    expect(document.querySelector("[data-rating-trend='up']")).toBeTruthy();
    expect(screen.getByText("6", { selector: "[data-metric='record-matches']" })).toBeTruthy();
  });

  it("shows No jugaste and hides personal stats when the player lined up for the other club", async () => {
    getMyRecentMatches.mockResolvedValue(
      recentMatchesReadyFixture([
        recentProviderMatchFixture({
          kind: "not_played",
          listedExternalClubId: "10754",
          home: { externalClubId: "10754", name: "Sirius", goals: 2, imageUrl: null },
          away: { externalClubId: "99", name: "Cuervos", goals: 1, imageUrl: null },
        }),
      ]),
    );

    renderPage("es", { externalClubId: "10754" });

    expect(await screen.findByText("No jugaste")).toBeTruthy();
    expect(screen.getByRole("listitem", { name: /No jugaste/ })).toBeTruthy();
    expect(document.querySelector("[data-played='false']")?.textContent).toBe("No jugaste");
    expect(
      document.querySelector("[data-played='false']")?.closest("[data-slot='badge']"),
    ).toBeNull();
    expect(document.querySelector("[data-metric='recent-goals']")).toBeNull();
    expect(document.querySelector("[data-match-outcome='win']")).toBeTruthy();
    expect(screen.getByText("1", { selector: "[data-metric='record-wins']" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Rendimiento" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Contribuciones" })).toBeNull();
    expect(document.querySelector("[data-metric='record-goals-plus-assists']")).toBeNull();
    expect(document.querySelector("[data-contribution-composition]")).toBeNull();
    expect(document.querySelector("[data-metric='record-contributed']")).toBeNull();
    expect(document.querySelector("[data-metric='record-pace']")).toBeNull();
    expect(document.querySelector("[data-metric='record-share']")).toBeNull();
    expect(document.querySelector("[data-rating-ring]")).toBeNull();
  });

  it("hides contribution and performance cards when G+A and rating are missing", async () => {
    getMyRecentMatches.mockResolvedValue(
      recentMatchesReadyFixture([
        recentProviderMatchFixture({ appearance: { goals: null, assists: null, rating: null } }),
      ]),
    );

    renderPage();

    expect(await screen.findByRole("heading", { name: "Record" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Contribuciones" })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Rendimiento" })).toBeNull();
    expect(document.querySelector("[data-metric='record-goals-plus-assists']")).toBeNull();
    expect(document.querySelector("[data-metric='record-contributed']")).toBeNull();
    expect(document.querySelector("[data-metric='record-pace']")).toBeNull();
    expect(document.querySelector("[data-metric='record-share']")).toBeNull();
    expect(document.querySelector("[data-rating-ring]")).toBeNull();
    expect(
      screen
        .getByRole("group", { name: "Resumen de esta vista" })
        .getAttribute("data-record-cards"),
    ).toBe("1");
    expect(
      screen
        .getByRole("heading", { name: "Record" })
        .closest("[data-slot='card']")
        ?.getAttribute("data-record-slot"),
    ).toBe("record");
  });
});

function renderPage(
  locale: "es" | "en" = "es",
  options: {
    readonly externalClubId?: string;
    readonly view?: PlayerMatchesView;
    readonly onViewChange?: (view: PlayerMatchesView) => void;
    readonly onSortChange?: (order: MatchSortOrder) => void;
  } = {},
) {
  render(
    <I18nProvider initialLocale={locale} persistLocale={async () => undefined}>
      <QueryTestProvider>
        <PlayerMatchesPage
          externalClubId={options.externalClubId ?? "10754"}
          now={PLAYER_MATCHES_PAGE_NOW}
          onSortChange={options.onSortChange}
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
