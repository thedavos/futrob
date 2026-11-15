// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  portalRefFixture,
  publicBracketFixture,
  publicCalendarFixture,
  publicCompetitionFixture,
  publicRankingFixture,
  publicRulesFixture,
  publicStandingsFixture,
} from "./public-portal.fixtures.ts";
import { PortalCalendarView, PortalCoverView } from "./public-portal-calendar.tsx";
import { PublicPortalLayout } from "./public-portal-layout.tsx";
import { PortalNotFound } from "./public-portal-states.tsx";
import { PortalBracketView, PortalRulesView, PortalTeamsView } from "./public-portal-structure.tsx";
import { PortalRankingView, PortalStandingsView } from "./public-portal-tables.tsx";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    search,
    children,
    ...props
  }: {
    to: string;
    params?: Record<string, string>;
    search?: Record<string, string>;
    children?: ReactNode;
  }) => {
    const path = Object.entries(params ?? {}).reduce(
      (href, [key, value]) => href.replace(`$${key}`, value),
      to,
    );
    const query = search ? `?${new URLSearchParams(search).toString()}` : "";
    return (
      <a href={`${path}${query}`} {...props}>
        {children}
      </a>
    );
  },
  useRouter: () => ({ invalidate: async () => undefined }),
}));

function renderEs(node: ReactNode) {
  return render(<I18nProvider initialLocale="es">{node}</I18nProvider>);
}

afterEach(cleanup);

describe("PublicPortalLayout", () => {
  it("shows the competition header and one tab per applicable section", () => {
    renderEs(
      <PublicPortalLayout
        competition={{ ...publicCompetitionFixture, format: "league" }}
        portalRef={portalRefFixture}
        section="standings"
      >
        <p>contenido</p>
      </PublicPortalLayout>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Liga Norte Apertura" })).toBeTruthy();
    const nav = within(screen.getByRole("navigation", { name: "Secciones de la competición" }));
    expect(nav.queryByRole("link", { name: "Bracket" })).toBeNull();
    expect(nav.getByRole("link", { name: "Tabla" }).getAttribute("aria-current")).toBe("page");
    expect(nav.getByRole("link", { name: "Tabla" }).getAttribute("href")).toBe(
      "/liga-norte/cmp_apertura/standings",
    );
    expect(screen.getByText("En juego")).toBeTruthy();
    // No operator actions on the public frame.
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("calendar and cover", () => {
  it("lists every round with official scores in place", () => {
    renderEs(
      <PortalCalendarView
        calendar={{ timeZone: "America/Lima", entries: publicCalendarFixture }}
      />,
    );
    expect(screen.getByRole("heading", { name: "Jornada 1" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Jornada 2" })).toBeTruthy();
    const official = within(
      screen.getByRole("article", { name: "Atlético Norte contra Real Sur" }),
    );
    expect(official.getByLabelText("Resultado oficial 2–1")).toBeTruthy();
    expect(official.getByText("Oficial")).toBeTruthy();
  });

  it("explains a competition without fixture instead of an empty list", () => {
    renderEs(<PortalCalendarView calendar={{ timeZone: "America/Lima", entries: [] }} />);
    expect(screen.getByText("El calendario aún no está publicado")).toBeTruthy();
  });

  it("puts the latest official result and the next encounters on the cover", () => {
    renderEs(
      <PortalCoverView
        calendar={{ timeZone: "America/Lima", entries: publicCalendarFixture }}
        portalRef={portalRefFixture}
      />,
    );
    const results = within(screen.getByRole("region", { name: "Últimos resultados" }));
    expect(results.getByLabelText("Resultado oficial 2–1")).toBeTruthy();
    const upcoming = within(screen.getByRole("region", { name: "Próximos enfrentamientos" }));
    expect(upcoming.getAllByRole("article")).toHaveLength(2);
  });
});

describe("tables", () => {
  it("renders the official table and its empty state", () => {
    renderEs(<PortalStandingsView standings={publicStandingsFixture} />);
    expect(screen.getByRole("cell", { name: "Atlético Norte" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "-1" })).toBeTruthy();
    cleanup();
    renderEs(<PortalStandingsView standings={{ ...publicStandingsFixture, rows: [] }} />);
    expect(screen.getByText("Aún no hay tabla")).toBeTruthy();
  });

  it("shows the ranking criterion and links every kind", () => {
    renderEs(<PortalRankingView portalRef={portalRefFixture} ranking={publicRankingFixture} />);
    expect(screen.getByText("Más goles en partidos oficiales aprobados.")).toBeTruthy();
    expect(screen.getByRole("cell", { name: "Nico_10" })).toBeTruthy();
    const kinds = within(screen.getByRole("navigation", { name: "Tipo de ranking" }));
    expect(kinds.getByRole("link", { name: "Goleadores" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(kinds.getByRole("link", { name: "Asistencias" }).getAttribute("href")).toBe(
      "/liga-norte/cmp_apertura/rankings?kind=assister",
    );
  });
});

describe("structure", () => {
  it("shows bracket sides by name or position and never a score for a bye", () => {
    const [stage] = publicBracketFixture.stages;
    const [first, second] = stage?.rounds ?? [];
    if (!stage || !first || !second) throw new Error("fixture shape");
    // Even a walkover recorded as 3–0 must not paint a score on a bye.
    const withScoredBye = {
      ...publicBracketFixture,
      stages: [
        {
          ...stage,
          rounds: [
            {
              ...first,
              encounters: first.encounters.map((encounter) =>
                encounter.away.kind === "bye"
                  ? { ...encounter, score: [{ homeGoals: 3, awayGoals: 0 }] }
                  : encounter,
              ),
            },
            second,
          ],
        },
      ],
    };
    renderEs(<PortalBracketView bracket={withScoredBye} format="league-playoffs" />);
    expect(screen.getByRole("heading", { name: "Playoffs" })).toBeTruthy();
    expect(screen.getByText("1.º de la fase anterior")).toBeTruthy();
    expect(screen.getByText("Ganador del cruce 1 (ronda 1)")).toBeTruthy();
    const bye = screen.getByText("Descanso").closest("li");
    expect(bye?.textContent).toMatch(/Real SurDescanso$/);
  });

  it("says there is no bracket yet before the fixture exists", () => {
    renderEs(<PortalBracketView bracket={null} format="knockout" />);
    expect(screen.getByText("Aún no hay cuadro")).toBeTruthy();
  });

  it("says a league has no elimination stage when its bracket URL is opened", () => {
    renderEs(<PortalBracketView bracket={null} format="league" />);
    expect(screen.getByText("Esta competición no tiene eliminatorias")).toBeTruthy();
  });

  it("lists teams by public name and explains an empty list", () => {
    renderEs(<PortalTeamsView teams={[{ name: "Real Sur" }]} />);
    expect(screen.getByText("Real Sur")).toBeTruthy();
    cleanup();
    renderEs(<PortalTeamsView teams={[]} />);
    expect(screen.getByText("Aún no hay equipos confirmados")).toBeTruthy();
  });

  it("spells out the rules of each stage", () => {
    renderEs(<PortalRulesView rules={publicRulesFixture} />);
    expect(screen.getByText("De 4 a 8")).toBeTruthy();
    expect(screen.getByText("Hasta 2 por equipo, con 24 h de aviso")).toBeTruthy();
    expect(screen.getByText("Marcador global")).toBeTruthy();
    expect(screen.getByText("No se permiten")).toBeTruthy();
  });
});

describe("PortalNotFound", () => {
  it("does not say whether the competition exists", () => {
    renderEs(<PortalNotFound />);
    expect(screen.getByText("Esta competición no está disponible")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ir a Futrob" }).getAttribute("href")).toBe("/");
  });
});
