// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { PlayerStatisticsPage } from "./player-statistics-page.tsx";

const getMyStatistics = vi.fn<() => Promise<unknown>>();

vi.mock("@/modules/statistics/presentation/statistics-browser-client.ts", () => ({
  statisticsBrowserClient: {
    getMyStatistics: () => getMyStatistics(),
  },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children?: unknown }) => (
    <a href={to} {...props}>
      {children as never}
    </a>
  ),
}));

describe("PlayerStatisticsPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a loading state", () => {
    getMyStatistics.mockReturnValue(new Promise(() => undefined));

    renderPage();

    expect(screen.getByText("Cargando tus estadísticas…")).toBeTruthy();
  });

  it("shows a recoverable error", async () => {
    getMyStatistics.mockRejectedValue(new Error("offline"));

    renderPage();

    expect((await screen.findByRole("alert")).textContent).toContain(
      "No pudimos cargar tus estadísticas.",
    );
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
  });

  it("shows the empty state with a game-account action", async () => {
    getMyStatistics.mockResolvedValue({ statistics: null });

    renderPage();

    expect(await screen.findByText("Aún no hay estadísticas oficiales")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Revisar datos de juego" }).getAttribute("href"),
    ).toBe("/player/game-accounts");
  });

  it("renders official aggregates and distinguishes null from zero", async () => {
    getMyStatistics.mockResolvedValue({
      statistics: {
        playerProfileId: "profile-1",
        matchesPlayed: 3,
        minutes: 210,
        totals: metricRecord(0, { goals: 2, assists: 1, rating: 21.4 }),
        averages: metricRecord(null, { goals: 0, assists: 0.33, rating: 7.13 }),
        per90: metricRecord(null, { goals: 0.86, assists: 0.43, rating: null }),
        partial: {
          ...metricRecord(false),
          minutes: true,
          saves: true,
        },
        sourceRevisionMax: 2,
        updatedAt: "2026-08-12T12:00:00.000Z",
        rawPayload: "raw-provider-payload",
      },
    });

    renderPage();

    expect(await screen.findByText("3 partidos oficiales")).toBeTruthy();
    expect(screen.getByRole("row", { name: /Goles/ }).textContent).toContain("2");
    expect(screen.getByRole("row", { name: /Goles/ }).textContent).toContain("0");
    expect(screen.getByRole("row", { name: /Rating/ }).textContent).toContain("Sin datos");
    expect(screen.getAllByText("Datos parciales").length).toBeGreaterThan(0);
    expect(screen.queryByText("raw-provider-payload")).toBeNull();
  });
});

function renderPage() {
  render(
    <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
      <QueryTestProvider>
        <PlayerStatisticsPage />
      </QueryTestProvider>
    </I18nProvider>,
  );
}

function metricRecord<T>(
  fallback: T,
  overrides: Partial<Record<Metric, T>> = {},
): Record<Metric, T> {
  return Object.fromEntries(
    METRICS.map((metric) => [metric, overrides[metric] ?? fallback]),
  ) as Record<Metric, T>;
}

const METRICS = [
  "goals",
  "assists",
  "shots",
  "passAttempts",
  "passesMade",
  "tackleAttempts",
  "tacklesMade",
  "saves",
  "yellowCards",
  "redCards",
  "mvpAwards",
  "rating",
] as const;

type Metric = (typeof METRICS)[number];
