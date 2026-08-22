// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ProviderMatchDto } from "@futrob/api-contracts";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  recentProviderMatchDetailFixture,
  recentProviderMatchFixture,
} from "./player-matches-page.fixtures.ts";
import {
  ProviderMatchDetailView,
  type ProviderMatchDetailViewState,
} from "./provider-match-detail-page.tsx";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    search,
    children,
    ...props
  }: {
    to: string;
    search?: { readonly view: string; readonly sort: string };
    children?: ReactNode;
  }) => (
    <a href={search ? `${to}?view=${search.view}&sort=${search.sort}` : to} {...props}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ProviderMatchDetailView", () => {
  it("renders the summary comparison, personal performance, and selected-club-first rosters", async () => {
    const user = userEvent.setup();
    const detail = recentProviderMatchDetailFixture({
      listedExternalClubId: "99",
      home: { externalClubId: "10754", name: "Home", goals: 1, imageUrl: null },
      away: { externalClubId: "99", name: "Selected away", goals: 2, imageUrl: null },
      players: [
        player("Zulu", "99", 8),
        player("Alpha", "99", 8, { goals: 0, saves: null, isMvp: true }),
        player("Opponent", "10754", 9),
      ],
      appearance: {
        externalPlayerId: "alpha",
        externalClubId: "99",
        displayName: "Alpha",
        goals: 0,
        saves: null,
      },
      metadata: { completeness: "partial" },
    });

    renderDetail({ kind: "ready", detail });

    expect(screen.getByRole("heading", { level: 1, name: "Home vs Selected away" })).toBeTruthy();
    expect(
      screen.getByText("Home vs Selected away", { selector: "[data-slot='breadcrumb-page']" }),
    ).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Resumen" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Jugadores" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Datos del partido" })).toBeTruthy();
    expect(screen.getByText("Comparación de equipos")).toBeTruthy();
    expect(screen.getByText("Tu rendimiento")).toBeTruthy();
    expect(document.querySelector("[data-comparison-metric='goals']")?.textContent).toContain("2");
    expect(document.querySelector("[data-highlight='mvp']")?.textContent).toContain("Alpha");
    const personal = document.querySelector("[data-personal-summary]");
    expect(personal?.querySelector("[data-metric='goals']")?.textContent).toBe("0");
    expect(personal?.querySelector("[data-metric='passesMade']")?.textContent).toBe(
      passAccuracyPercent("es", 6, 8),
    );
    expect(personal?.querySelector("[data-metric='tacklesMade']")?.textContent).toBe(
      passAccuracyPercent("es", 1, 1),
    );
    expect(personal?.textContent).toContain("Precisión de pase");
    expect(personal?.textContent).toContain("Precisión de entradas");
    expect(personal?.textContent).not.toContain("Pases completados");
    expect(personal?.textContent).not.toContain("Entradas completadas");
    expect(personal?.textContent).toContain("Alpha");
    expect(screen.queryByText("Club seleccionado")).toBeNull();

    await user.click(screen.getByRole("tab", { name: "Jugadores" }));

    expect(screen.getByText("Tú").className).toContain("text-foreground");
    const mvpBadge = screen
      .getAllByText("MVP")
      .find((element) => element.getAttribute("data-slot") === "badge");
    expect(mvpBadge?.className).toContain("text-foreground");
    const selected = document.querySelector("[data-roster='selected']");
    const opponent = document.querySelector("[data-roster='opponent']");
    expect(selected?.querySelector("h2")?.textContent).toContain("Selected away");
    expect(opponent?.querySelector("h2")?.textContent).toContain("Home");
    expect(
      [...(selected?.querySelectorAll("[data-roster-player]") ?? [])].map((row) =>
        row.getAttribute("data-player-name"),
      ),
    ).toEqual(["Alpha", "Zulu"]);
    expect(
      selected?.querySelector("[data-player-name='Alpha'] [data-player-metric='goals']")
        ?.textContent,
    ).toBe("0");
    expect(
      selected?.querySelector("[data-player-name='Alpha'] [data-player-metric='saves']")
        ?.textContent,
    ).toBe("—");
    expect(
      selected?.querySelectorAll("[data-player-name='Alpha'] [data-player-metric]"),
    ).toHaveLength(13);
  });

  it("shows No jugaste without a personal summary or highlighted roster row", async () => {
    const user = userEvent.setup();
    const detail = recentProviderMatchDetailFixture({
      kind: "not_played",
      listedExternalClubId: "10754",
      players: [player("Teammate", "10754", 7.5)],
    });

    renderDetail({ kind: "ready", detail });

    expect(document.querySelector("[data-played='false']")).toBeTruthy();
    expect(screen.getByText("No jugaste")).toBeTruthy();
    expect(screen.getByText("No alineaste con el club seleccionado en este partido.")).toBeTruthy();
    expect(document.querySelector("[data-personal-player]")).toBeNull();

    await user.click(screen.getByRole("tab", { name: "Jugadores" }));
    expect(document.querySelector("[data-personal-player]")).toBeNull();
  });

  it("keeps the cached header visible while the full rosters load", () => {
    const summary = recentProviderMatchFixture({
      home: { externalClubId: "10754", name: "Fera", goals: 3, imageUrl: null },
      away: { externalClubId: "99", name: "Rival", goals: 2, imageUrl: null },
    });

    renderDetail({ kind: "loading", summary });

    expect(screen.getByRole("heading", { name: "Fera vs Rival" })).toBeTruthy();
    expect(
      screen.getByText("Fera vs Rival", { selector: "[data-slot='breadcrumb-page']" }),
    ).toBeTruthy();
    expect(screen.getByLabelText("Cargando plantillas…")).toBeTruthy();
  });

  it.each([
    [{ kind: "needs_club" } as const, "Asocia un club para ver este partido"],
    [{ kind: "needs_game_account" } as const, "Añade una cuenta de juego"],
    [{ kind: "not_found" } as const, "Partido no encontrado"],
  ])("renders the %s feature state", (state, title) => {
    renderDetail(state, "es", "playoff", "oldest");
    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Mis partidos" }).getAttribute("href")).toBe(
      "/player/matches?view=playoff&sort=oldest",
    );
    expect(screen.getByText("Partido", { selector: "[data-slot='breadcrumb-page']" })).toBeTruthy();
  });

  it.each([
    [{ kind: "needs_club" } as const, "Añadir club", "/player/ea-clubs"],
    [{ kind: "needs_game_account" } as const, "Revisar datos de juego", "/player/game-accounts"],
  ])("points the %s state to its setup destination", (state, label, href) => {
    renderDetail(state);

    expect(screen.getByRole("link", { name: label }).getAttribute("href")).toBe(href);
  });

  it("omits unknown mode and duration metadata", async () => {
    const user = userEvent.setup();
    const detail = recentProviderMatchDetailFixture({
      mode: "unknown-provider-mode",
      metadata: { durationSeconds: null },
    });

    renderDetail({ kind: "ready", detail });

    expect(document.querySelector("[data-match-type]")).toBeNull();
    await user.click(screen.getByRole("tab", { name: "Datos del partido" }));
    expect(document.querySelector("[data-match-duration]")).toBeNull();
  });

  it("shows a DNF cue on the reused match row without a self-link", () => {
    const detail = recentProviderMatchDetailFixture({
      metadata: { wasDisconnected: true, winnerByForfeit: true },
    });

    renderDetail({ kind: "ready", detail });

    expect(screen.getByLabelText("Ganado por desconexión")).toBeTruthy();
    expect(document.querySelector("[data-match-dnf]")).toBeTruthy();
    expect(document.querySelector("[data-match-status='finalized']")?.textContent).toBe(
      "Finalizado",
    );
    expect(
      document
        .querySelector("[data-match-status='finalized']")
        ?.nextElementSibling?.getAttribute("data-match-score"),
    ).toBe("");
    expect(document.querySelector("[data-match-chevron]")).toBeNull();
  });

  it("renders localized copy when either roster has no player observations", async () => {
    const user = userEvent.setup();
    const detail = recentProviderMatchDetailFixture({ players: [] });

    renderDetail({ kind: "ready", detail });
    await user.click(screen.getByRole("tab", { name: "Jugadores" }));

    expect(screen.getAllByText("No hay datos de jugadores para esta plantilla.")).toHaveLength(2);
    expect(document.querySelectorAll("[data-roster] ol")).toHaveLength(0);
  });

  it("localizes known positions and leaves abbreviations unchanged", async () => {
    const user = userEvent.setup();
    const detail = recentProviderMatchDetailFixture({
      players: [
        player("Keeper", "10754", 7, { position: "goalkeeper" }),
        player("Striker", "10754", 8, { position: "ST" }),
      ],
    });

    renderDetail({ kind: "ready", detail });
    await user.click(screen.getByRole("tab", { name: "Jugadores" }));

    expect(
      document.querySelector("[data-player-name='Keeper'] [data-player-metric='position']")
        ?.textContent,
    ).toBe("Portero");
    expect(
      document.querySelector("[data-player-name='Striker'] [data-player-metric='position']")
        ?.textContent,
    ).toBe("ST");
  });

  it("renders a provider error with retry", async () => {
    const retry = vi.fn<() => void>();
    renderDetail({ kind: "error", retry });

    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(screen.getByRole("alert").textContent).toContain(
      "No se pudo cargar el partido. Inténtalo de nuevo.",
    );
    expect(retry).toHaveBeenCalledOnce();
  });

  it("renders English copy for the breadcrumb, summary, and roster sections", async () => {
    const user = userEvent.setup();
    const detail = recentProviderMatchDetailFixture({
      metadata: { completeness: "unknown" },
    });

    renderDetail({ kind: "ready", detail }, "en");

    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "My matches" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Summary" })).toBeTruthy();
    expect(screen.getByText("Your performance")).toBeTruthy();
    const personal = document.querySelector("[data-personal-summary]");
    expect(personal?.querySelector("[data-metric='passesMade']")?.textContent).toBe(
      passAccuracyPercent("en", 6, 8),
    );
    expect(personal?.textContent).toContain("Pass accuracy");
    expect(personal?.textContent).toContain("Tackle accuracy");
    expect(personal?.textContent).not.toContain("Passes completed");
    expect(personal?.textContent).not.toContain("Tackles completed");
    await user.click(screen.getByRole("tab", { name: "Players" }));
    expect(screen.getByText("Selected club")).toBeTruthy();
    expect(screen.getByText("Opponent")).toBeTruthy();
  });

  it.each([
    ["es", "2 asistencias", "9 tiros", "1 entrada", "precisión de pase"] as const,
    ["en", "2 assists", "9 shots", "1 tackle", "pass accuracy"] as const,
  ])(
    "renders highlight pass accuracy as a locale percent in %s",
    (locale, assists, shots, tackles, accuracy) => {
      renderDetail({ kind: "ready", detail: highlightPassDetail() }, locale);
      const percent = passAccuracyPercent(locale, 10, 15);

      expect(document.querySelector("[data-highlight='mvp']")?.textContent).toContain(
        `${assists} · ${percent} ${accuracy}`,
      );
      expect(document.querySelector("[data-highlight='playmaker']")?.textContent).toContain(
        `${percent} ${accuracy}`,
      );
      expect(document.querySelector("[data-highlight='rival']")?.textContent).toContain(
        `${percent} ${accuracy} · ${tackles}`,
      );
      expect(document.querySelector("[data-highlight='scorer']")?.textContent).toContain(shots);
      expect(document.body.textContent).not.toContain("10/15");
    },
  );

  it.each([
    ["es", "Precisión de pase", "Precisión de entradas"] as const,
    ["en", "Pass accuracy", "Tackle accuracy"] as const,
  ])(
    "renders personal pass and tackle accuracy as percents in %s",
    (locale, passLabel, tackleLabel) => {
      const detail = recentProviderMatchDetailFixture({
        appearance: {
          passesMade: 24,
          passAttempts: 34,
          tacklesMade: 2,
          tackleAttempts: 9,
        },
      });

      renderDetail({ kind: "ready", detail }, locale);
      const personal = document.querySelector("[data-personal-summary]");

      expect(personal?.querySelector("[data-metric='passesMade']")?.textContent).toBe(
        passAccuracyPercent(locale, 24, 34),
      );
      expect(personal?.querySelector("[data-metric='tacklesMade']")?.textContent).toBe(
        passAccuracyPercent(locale, 2, 9),
      );
      expect(personal?.textContent).toContain(passLabel);
      expect(personal?.textContent).toContain(tackleLabel);
      expect(personal?.textContent).not.toContain("24/34");
      expect(personal?.textContent).not.toContain("2/9");
    },
  );

  it("omits personal pass and tackle percents when attempts are zero or unknown", () => {
    const detail = recentProviderMatchDetailFixture({
      appearance: {
        passesMade: 0,
        passAttempts: 0,
        tacklesMade: 2,
        tackleAttempts: null,
      },
    });

    renderDetail({ kind: "ready", detail });
    const personal = document.querySelector("[data-personal-summary]");

    expect(personal?.querySelector("[data-metric='passesMade']")?.textContent).toBe("Sin datos");
    expect(personal?.querySelector("[data-metric='tacklesMade']")?.textContent).toBe("Sin datos");
    expect(personal?.textContent).not.toContain("0 %");
    expect(personal?.textContent).not.toContain("0%");
  });

  it("omits highlight pass accuracy when attempts are zero or unknown", () => {
    const detail = recentProviderMatchDetailFixture({
      listedExternalClubId: "99",
      home: { externalClubId: "10754", name: "Home", goals: 1, imageUrl: null },
      away: { externalClubId: "99", name: "Away", goals: 2, imageUrl: null },
      players: [
        player("Alpha", "99", 8, { isMvp: true, assists: 2, passesMade: 0, passAttempts: 0 }),
        player("Creator", "99", 7.5, { assists: 4, passesMade: null, passAttempts: null }),
      ],
    });

    renderDetail({ kind: "ready", detail });

    expect(document.querySelector("[data-highlight='mvp']")?.textContent).toContain(
      "2 asistencias",
    );
    expect(document.querySelector("[data-highlight='mvp']")?.textContent).not.toContain(
      "precisión",
    );
    expect(document.querySelector("[data-highlight='playmaker']")?.textContent).not.toContain(
      "precisión",
    );
  });
});

function renderDetail(
  state: ProviderMatchDetailViewState,
  locale: "es" | "en" = "es",
  view: "all" | "league" | "playoff" | "friendly" = "all",
  sort: "newest" | "oldest" = "newest",
) {
  return render(
    <I18nProvider initialLocale={locale}>
      <ProviderMatchDetailView sort={sort} state={state} view={view} />
    </I18nProvider>,
  );
}

function highlightPassDetail() {
  return recentProviderMatchDetailFixture({
    listedExternalClubId: "99",
    home: { externalClubId: "10754", name: "Home", goals: 1, imageUrl: null },
    away: { externalClubId: "99", name: "Away", goals: 2, imageUrl: null },
    players: [
      player("Alpha", "99", 8, {
        isMvp: true,
        assists: 2,
        passesMade: 10,
        passAttempts: 15,
      }),
      player("Striker", "99", 7, { goals: 3, shots: 9 }),
      player("Creator", "99", 7.5, { assists: 4, passesMade: 10, passAttempts: 15 }),
      player("Opponent", "10754", 9, { passesMade: 10, passAttempts: 15, tacklesMade: 1 }),
    ],
  });
}

function passAccuracyPercent(locale: "es" | "en", made: number, attempts: number): string {
  return new Intl.NumberFormat(locale === "en" ? "en-GB" : "es-ES", {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(made / attempts);
}

function player(
  displayName: string,
  externalClubId: string,
  rating: number | null,
  overrides: Partial<ProviderMatchDto["players"][number]> = {},
) {
  return {
    ...playerBase(),
    externalPlayerId: displayName.toLowerCase(),
    displayName,
    externalClubId,
    rating,
    ...overrides,
  };
}

function playerBase() {
  return {
    externalPlayerId: "player",
    displayName: "Player",
    externalClubId: "10754",
    position: "midfielder",
    minutesPlayed: 90,
    goals: 0,
    assists: 0,
    shots: 0,
    passAttempts: 0,
    passesMade: 0,
    tackleAttempts: 0,
    tacklesMade: 0,
    saves: 0,
    yellowCards: 0,
    redCards: 0,
    isMvp: false,
    rating: 7,
  };
}
