// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { GetMyGameProfileResponse, PlayerGameProfileDto } from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { PlayerStatisticsPage } from "./player-statistics-page.tsx";
import { gameProfileReadyFixture } from "./player-statistics-page.fixtures.ts";

const getMyGameProfile = vi.fn<() => Promise<GetMyGameProfileResponse>>();

vi.mock("@/modules/statistics/presentation/statistics-browser-client.ts", () => ({
  statisticsBrowserClient: {
    getMyGameProfile: () => getMyGameProfile(),
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
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a loading state", () => {
    getMyGameProfile.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByRole("heading", { name: "Mis estadísticas" })).toBeTruthy();
    expect(screen.getByText("Cargando tus estadísticas…")).toBeTruthy();
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
});

function renderPage() {
  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    configurable: true,
    value: ResizeObserverStub,
  });
  return render(
    <QueryTestProvider>
      <I18nProvider initialLocale="es">
        <PlayerStatisticsPage />
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
