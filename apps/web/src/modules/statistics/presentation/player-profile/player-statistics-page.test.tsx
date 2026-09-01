// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type {
  GetMyGameProfileQueryInput,
  GetMyGameProfileResponse,
  PlayerGameProfileDto,
} from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { PlayerStatisticsPage } from "./player-statistics-page.tsx";
import {
  PLAYER_STATISTICS_RANGE,
  gameProfileReadyFixture,
  gameProfileUnavailableGoalsFixture,
  gameProfileUnknownOnlyFormFixture,
} from "./player-statistics-page.fixtures.ts";
import { gameProfileQueryFromRange } from "./player-statistics-period.ts";

const getMyGameProfile =
  vi.fn<(query?: GetMyGameProfileQueryInput) => Promise<GetMyGameProfileResponse>>();

vi.mock("@/modules/statistics/presentation/statistics-browser-client.ts", () => ({
  statisticsBrowserClient: {
    getMyGameProfile: (query?: GetMyGameProfileQueryInput) => getMyGameProfile(query),
  },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children?: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

describe("PlayerStatisticsPage", () => {
  beforeEach(() => {
    vi.stubGlobal("PointerEvent", MouseEvent);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows a loading state", () => {
    getMyGameProfile.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByRole("heading", { name: "Mis estadísticas" })).toBeTruthy();
    expect(screen.getByText("Cargando tus estadísticas…")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Rango de fechas" })).toBeTruthy();
  });

  it("shows a recoverable error", async () => {
    getMyGameProfile.mockRejectedValue(new Error("offline"));
    renderPage();
    expect((await screen.findByRole("alert")).textContent).toContain(
      "No pudimos cargar tus estadísticas.",
    );
  });

  it("asks the player to associate a club", async () => {
    getMyGameProfile.mockResolvedValue({ status: "needs_club" });
    renderPage();
    expect(await screen.findByText("Asocia un club para reconocer tus partidos")).toBeTruthy();
  });

  it("requests the selected club and default week", async () => {
    getMyGameProfile.mockResolvedValue({ status: "ready", profile: gameProfileReadyFixture() });
    renderPage();
    expect(await screen.findByRole("heading", { name: "davos282" })).toBeTruthy();
    expect(getMyGameProfile).toHaveBeenCalledWith(
      gameProfileQueryFromRange({
        externalClubId: "10754",
        range: PLAYER_STATISTICS_RANGE,
      }),
    );
  });

  it("requests a new club without keeping the previous profile", async () => {
    getMyGameProfile.mockResolvedValue({ status: "ready", profile: gameProfileReadyFixture() });
    const view = renderPage({ externalClubId: "10754" });
    expect(await screen.findByRole("heading", { name: "davos282" })).toBeTruthy();

    getMyGameProfile.mockResolvedValue({ status: "ready", profile: compactProfileFixture() });
    view.rerender(
      <QueryTestProvider>
        <I18nProvider initialLocale="es">
          <PlayerStatisticsPage
            externalClubId="44001"
            onPeriodChange={() => undefined}
            period={PLAYER_STATISTICS_RANGE}
          />
        </I18nProvider>
      </QueryTestProvider>,
    );

    expect(await screen.findByText("Delantero · Night Owls · 28 partidos jugados")).toBeTruthy();
    expect(getMyGameProfile).toHaveBeenLastCalledWith(
      gameProfileQueryFromRange({
        externalClubId: "44001",
        range: PLAYER_STATISTICS_RANGE,
      }),
    );
  });

  it("applies a new date range from the filter", async () => {
    getMyGameProfile.mockResolvedValue({ status: "ready", profile: gameProfileReadyFixture() });
    const onPeriodChange = vi.fn();
    const user = userEvent.setup();
    renderPage({ onPeriodChange });

    expect(await screen.findByRole("heading", { name: "davos282" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Rango de fechas" }));
    await user.clear(screen.getByLabelText("Desde"));
    await user.type(screen.getByLabelText("Desde"), "2026-08-01");
    await user.clear(screen.getByLabelText("Hasta"));
    await user.type(screen.getByLabelText("Hasta"), "2026-08-07");
    await user.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(onPeriodChange).toHaveBeenCalledWith({ from: "2026-08-01", to: "2026-08-07" });
  });

  it("renders identity, kpis, charts and category profile from played matches", async () => {
    getMyGameProfile.mockResolvedValue({
      status: "ready",
      profile: gameProfileReadyFixture(),
    });
    renderPage();

    expect(await screen.findByRole("heading", { name: "davos282" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Mis estadísticas" })).toBeTruthy();
    expect(screen.getByText("Delantero · Cuervos FC1 · 28 partidos jugados")).toBeTruthy();
    expect(
      [
        ...screen
          .getByRole("region", { name: "Resumen" })
          .querySelectorAll("[data-slot='stat-label']"),
      ].map((label) => label.textContent),
    ).toEqual(["V–E–D", "Rating", "Goles", "Asistencias"]);
    expect(screen.getByText("16–4–8")).toBeTruthy();
    expect(screen.getByText(/de victorias/)).toBeTruthy();
    expect(screen.getByText("11")).toBeTruthy();
    expect(screen.getByText("0,39 por partido")).toBeTruthy();
    expect(await screen.findByRole("heading", { name: "Rating por partido" })).toBeTruthy();
    expect(screen.getByText("1 sin resultado")).toBeTruthy();
    expect(screen.getAllByText("Sin resultado").length).toBeGreaterThan(0);
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.getByRole("heading", { name: "Récord" })).toBeTruthy();
    expect(screen.getByText("16 victorias")).toBeTruthy();
    expect(screen.getByText("4 empates")).toBeTruthy();
    expect(screen.getByText("8 derrotas")).toBeTruthy();
    expect(screen.getByText("Últimos 5 partidos")).toBeTruthy();
    expect(screen.queryByText("2 victorias · 1 empate · 1 derrota · 1 sin resultado")).toBeNull();
    expect(screen.getByRole("heading", { name: "Atributos" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Desglose" })).toBeNull();
    expect(screen.getByText("Punto fuerte")).toBeTruthy();
    expect(screen.getByText("A mejorar")).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "Generales" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Volver al espacio personal" })).toBeNull();
  });

  it("renders a compact fixture without hiding the selected category detail", async () => {
    getMyGameProfile.mockResolvedValue({ status: "ready", profile: compactProfileFixture() });
    renderPage();

    expect(await screen.findByRole("heading", { name: "davos282" })).toBeTruthy();
    expect(screen.getByText("Delantero · Night Owls · 28 partidos jugados")).toBeTruthy();
    expect(await screen.findByText("Ataque")).toBeTruthy();
    expect(screen.getByText("Goles por partido")).toBeTruthy();
    expect(screen.getByText(/0,14 · 4 puntos/)).toBeTruthy();
  });

  it("keeps the form chart when every sample is unknown", async () => {
    getMyGameProfile.mockResolvedValue({
      status: "ready",
      profile: gameProfileUnknownOnlyFormFixture(),
    });
    renderPage();

    expect(await screen.findByRole("heading", { name: "Récord" })).toBeTruthy();
    expect(screen.getByText("2 sin resultado")).toBeTruthy();
    expect(screen.queryByText("Aún no hay partidos para armar tu récord.")).toBeNull();
  });

  it("shows no-data for goals when the average is unavailable", async () => {
    getMyGameProfile.mockResolvedValue({
      status: "ready",
      profile: gameProfileUnavailableGoalsFixture(),
    });
    renderPage();

    expect(await screen.findByRole("heading", { name: "davos282" })).toBeTruthy();
    const goals = screen.getByRole("region", { name: "Resumen" });
    expect(goals.textContent).toContain("Goles");
    expect(goals.textContent).toContain("Sin datos");
    expect(goals.textContent).not.toContain("0,64");
  });

  it("explains the EA window when the range has no appearances", async () => {
    getMyGameProfile.mockResolvedValue({
      status: "ready",
      profile: { ...gameProfileReadyFixture(), sampleSize: 0 },
    });
    renderPage();
    expect(await screen.findByText("Aún no hay apariciones tuyas")).toBeTruthy();
    expect(
      screen.getByText(
        "Solo vemos los últimos 50 partidos que EA tiene ahora. Si no hay apariciones en el rango, prueba otras fechas.",
      ),
    ).toBeTruthy();
  });
});

function renderPage(
  options: {
    readonly externalClubId?: string;
    readonly onPeriodChange?: (next: { readonly from: string; readonly to: string }) => void;
  } = {},
) {
  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    configurable: true,
    value: ResizeObserverStub,
  });
  return render(
    <QueryTestProvider>
      <I18nProvider initialLocale="es">
        <PlayerStatisticsPage
          externalClubId={options.externalClubId ?? "10754"}
          onPeriodChange={options.onPeriodChange ?? (() => undefined)}
          period={PLAYER_STATISTICS_RANGE}
        />
      </I18nProvider>
    </QueryTestProvider>,
  );
}

function compactProfileFixture(): PlayerGameProfileDto {
  const emptyRates = {
    goals: 0.14,
    assists: 0,
    shots: 0,
    passAttempts: 0,
    passesMade: 0,
    tackleAttempts: 0,
    tacklesMade: 0,
    saves: 0,
    yellowCards: 0,
    redCards: 0,
    mvpAwards: 0,
    rating: 6.6,
  };
  const totals = {
    goals: 4,
    assists: 0,
    shots: 0,
    passAttempts: 0,
    passesMade: 0,
    tackleAttempts: 0,
    tacklesMade: 0,
    saves: 0,
    yellowCards: 0,
    redCards: 0,
    mvpAwards: 0,
    rating: 184.8,
  };
  const partial = {
    minutes: false,
    goals: false,
    assists: false,
    shots: false,
    passAttempts: false,
    passesMade: false,
    tackleAttempts: false,
    tacklesMade: false,
    saves: false,
    yellowCards: false,
    redCards: false,
    mvpAwards: false,
    rating: false,
  };
  const summary = {
    matchesPlayed: 28,
    wins: 16,
    draws: 4,
    losses: 8,
    minutes: 2520,
    totals,
    averages: emptyRates,
    partial,
  };
  return {
    sampleSize: 28,
    identity: {
      displayName: "davos282",
      preferredPosition: "forward",
      preferredRole: "attack",
    },
    attributes: [
      {
        category: "attack",
        score: 4,
        components: [
          {
            key: "goalsPerMatch",
            weight: 0.3,
            raw: 0.14,
            rawKind: "perMatch",
            score: 14,
            points: 4,
            confidence: 1,
            sampleCount: 28,
          },
        ],
      },
    ],
    evolution: [
      {
        occurredAt: "2026-08-10T02:00:00.000Z",
        rating: 6.6,
        outcome: "win",
      },
    ],
    summary,
    byTeam: [{ clubId: "club-1", clubName: "Night Owls", ...summary }],
    byPosition: [{ position: "forward", role: "attack", ...summary }],
  };
}
