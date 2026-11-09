// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { GetMyStatisticsQuery, GetMyStatisticsResponse } from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import {
  createTestQueryClient,
  QueryTestProvider,
} from "@/shared/presentation/query/query-test-utils.tsx";
import { playerCompetitionStatsFixture } from "./player-competition-stats.fixtures.ts";
import { PlayerCompetitionStatsPage } from "./player-competition-stats-page.tsx";

const getMyStatistics =
  vi.fn<(filters?: GetMyStatisticsQuery) => Promise<GetMyStatisticsResponse>>();

vi.mock("@/modules/statistics/presentation/statistics-browser-client.ts", () => ({
  statisticsBrowserClient: {
    getMyStatistics: (filters?: GetMyStatisticsQuery) => getMyStatistics(filters),
  },
}));

const COMPETITION_ID = "competition-1";
let releaseLoading: (() => void) | undefined;

function renderPage(locale: "es" | "en" = "es", client?: QueryClient) {
  return render(
    <QueryTestProvider client={client}>
      <I18nProvider initialLocale={locale}>
        <PlayerCompetitionStatsPage competitionId={COMPETITION_ID} />
      </I18nProvider>
    </QueryTestProvider>,
  );
}

function statValue(region: HTMLElement, label: string): HTMLElement | null {
  const match = [...region.querySelectorAll("[data-slot='stat-label']")].find(
    (node) => node.textContent === label,
  );
  return match?.closest("[data-slot='stat']")?.querySelector("[data-slot='stat-value']") ?? null;
}

describe("PlayerCompetitionStatsPage", () => {
  afterEach(() => {
    releaseLoading?.();
    releaseLoading = undefined;
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a loading summary while the competition statistics are pending", () => {
    getMyStatistics.mockReturnValue(
      new Promise((resolve) => {
        releaseLoading = () => resolve({ statistics: null });
      }),
    );
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Estadísticas" })).toBeTruthy();
    expect(screen.getByText("Cargando tus estadísticas…")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Resumen" })).toBeNull();
  });

  it("requests this competition and explains that official results are still missing", async () => {
    getMyStatistics.mockResolvedValue({ statistics: null });
    renderPage();
    expect(await screen.findByText("Aún no hay estadísticas oficiales")).toBeTruthy();
    expect(
      screen.getByText(
        "Aquí aparecerán tus estadísticas cuando se aprueben resultados oficiales en esta competición.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("Aún no hay apariciones tuyas")).toBeNull();
    expect(getMyStatistics).toHaveBeenCalledWith({ competitionId: COMPETITION_ID });
  });

  it("explains the same absence in English", async () => {
    getMyStatistics.mockResolvedValue({ statistics: null });
    renderPage("en");
    expect(await screen.findByText("No official statistics yet")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Statistics" })).toBeTruthy();
    expect(
      screen.getByText(
        "Your statistics will appear here when official results are approved in this competition.",
      ),
    ).toBeTruthy();
  });

  it("shows the official summary and keeps a real zero", async () => {
    getMyStatistics.mockResolvedValue({ statistics: playerCompetitionStatsFixture() });
    renderPage();
    const summary = await screen.findByRole("region", { name: "Resumen" });
    expect(statValue(summary, "Partidos")?.textContent).toBe("6");
    expect(summary.textContent).toContain("540 min");
    expect(statValue(summary, "Rating")?.textContent).toBe("7,5");
    expect(summary.textContent).toContain("Promedio por partido");
    expect(statValue(summary, "Goles")?.textContent).toBe("12");
    expect(summary.textContent).toContain("2 por partido");
    expect(statValue(summary, "Asistencias")?.textContent).toBe("0");
    expect(summary.textContent).toContain("0 por partido");
    expect(statValue(summary, "Asistencias")?.getAttribute("data-size")).not.toBe("empty");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows no-data for an unobserved rating and warns that some metrics are partial", async () => {
    getMyStatistics.mockResolvedValue({
      statistics: playerCompetitionStatsFixture({
        averages: { rating: null },
        partial: { rating: true, minutes: true },
      }),
    });
    renderPage();
    const summary = await screen.findByRole("region", { name: "Resumen" });
    const rating = statValue(summary, "Rating");
    expect(rating?.textContent).toBe("Sin datos");
    expect(rating?.getAttribute("data-size")).toBe("empty");
    expect(rating?.getAttribute("data-tone")).toBe("muted");
    expect(summary.textContent).not.toContain("7,5");
    expect(summary.textContent).not.toContain("540 min");
    expect(statValue(summary, "Goles")?.textContent).toBe("12");
    expect(screen.getByRole("alert").textContent).toContain(
      "Algunas métricas no estuvieron disponibles en todos los partidos.",
    );
  });

  it("offers a retry when the first load fails", async () => {
    getMyStatistics.mockRejectedValue(new Error("offline"));
    const user = userEvent.setup();
    renderPage();
    expect((await screen.findByRole("alert")).textContent).toContain(
      "No pudimos cargar tus estadísticas.",
    );
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(getMyStatistics).toHaveBeenCalledTimes(2);
  });

  it("keeps the last statistics when a refresh fails", async () => {
    const client = createTestQueryClient();
    getMyStatistics.mockResolvedValueOnce({ statistics: playerCompetitionStatsFixture() });
    renderPage("es", client);
    expect(await screen.findByText("12")).toBeTruthy();

    getMyStatistics.mockRejectedValueOnce(new Error("offline"));
    await client.refetchQueries({
      queryKey: queryKeys.statistics.me({ competitionId: COMPETITION_ID }),
    });

    expect((await screen.findByRole("alert")).textContent).toContain(
      "No pudimos actualizar tus estadísticas. Se muestran las últimas que cargamos.",
    );
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.queryByText("Aún no hay estadísticas oficiales")).toBeNull();
  });
});
