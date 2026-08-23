// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { GetMyGameProfileResponse, PlayerGameProfileDto } from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { PlayerStatisticsPage } from "./player-statistics-page.tsx";

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

describe("PlayerStatisticsPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows a loading state", () => {
    getMyGameProfile.mockReturnValue(new Promise(() => undefined));
    renderPage();
    expect(screen.getByText("Cargando tu perfil…")).toBeTruthy();
  });

  it("shows a recoverable error", async () => {
    getMyGameProfile.mockRejectedValue(new Error("offline"));
    renderPage();
    expect((await screen.findByRole("alert")).textContent).toContain(
      "No pudimos cargar tu perfil.",
    );
  });

  it("asks the player to associate a club", async () => {
    getMyGameProfile.mockResolvedValue({ status: "needs_club" });
    renderPage();
    expect(await screen.findByText("Asocia un club para reconocer tus partidos")).toBeTruthy();
  });

  it("renders elo, attributes and general statistics from played matches", async () => {
    getMyGameProfile.mockResolvedValue({ status: "ready", profile: profileFixture() });
    renderPage();

    expect(await screen.findByRole("heading", { name: "davos282" })).toBeTruthy();
    expect(screen.getByText("Delantero · 28 partidos jugados")).toBeTruthy();
    expect(screen.getByText("1512")).toBeTruthy();
    expect(screen.getByText("Ataque")).toBeTruthy();
    expect(screen.getByText(/Goles por partido: 30% → 0,14 \(4 puntos\)/)).toBeTruthy();
    expect(screen.getByText("Generales")).toBeTruthy();
  });
});

function renderPage() {
  return render(
    <QueryTestProvider>
      <I18nProvider initialLocale="es">
        <PlayerStatisticsPage />
      </I18nProvider>
    </QueryTestProvider>,
  );
}

function profileFixture(): PlayerGameProfileDto {
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
    elo: { rating: 1512, ratedMatches: 28 },
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
        elo: 1512,
        rating: 6.6,
        outcome: "win",
      },
    ],
    summary,
    byTeam: [{ clubId: "club-1", clubName: "Night Owls", ...summary }],
    byPosition: [{ position: "forward", role: "attack", ...summary }],
  };
}
