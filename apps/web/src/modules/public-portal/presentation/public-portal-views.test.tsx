// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
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
import { PortalCalendarView } from "./public-portal-calendar.tsx";
import { coverLeadersFromRankings, PortalCoverView } from "./public-portal-cover.tsx";
import { PublicPortalLayout } from "./public-portal-layout.tsx";
import { portalCalendarProgress, portalRankingSearchSchema } from "./public-portal-model.ts";
import { PortalFrameLoading, PortalSectionLoading } from "./public-portal-skeleton.tsx";
import { PortalNotFound } from "./public-portal-states.tsx";
import { PortalBracketView, PortalRulesView, PortalTeamsView } from "./public-portal-structure.tsx";
import { PortalRankingView, PortalStandingsView } from "./public-portal-tables.tsx";

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
});

async function renderEs(node: ReactNode, initialEntry = "/liga-norte/cmp_apertura/standings") {
  const rootRoute = createRootRoute({ component: Outlet });
  const home = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    component: () => <p>Futrob</p>,
  });
  const portal = createRoute({
    getParentRoute: () => rootRoute,
    path: "/$organizationSlug/$competitionKey/$",
    component: () => node,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([home, portal]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });
  await router.load();
  return render(
    <I18nProvider initialLocale="es">
      <RouterProvider router={router} />
    </I18nProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("PublicPortalLayout", () => {
  it("shows the editorial competition hero, progress, and one tab per applicable section", async () => {
    await renderEs(
      <PublicPortalLayout
        championName="Atlético Norte"
        competition={{ ...publicCompetitionFixture, format: "league", status: "finished" }}
        portalRef={portalRefFixture}
        progress={portalCalendarProgress(publicCalendarFixture, "finished")}
        section="standings"
      >
        <p>contenido</p>
      </PublicPortalLayout>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Liga Norte Apertura" })).toBeTruthy();
    expect(screen.getByText("Campeón: Atlético Norte")).toBeTruthy();
    expect(screen.getByText("25%")).toBeTruthy();
    const nav = within(screen.getByRole("navigation", { name: "Secciones de la competición" }));
    expect(nav.queryByRole("link", { name: "Bracket" })).toBeNull();
    expect(nav.getByRole("link", { name: "Tabla" }).getAttribute("aria-current")).toBe("page");
    expect(nav.getByRole("link", { name: "Tabla" }).getAttribute("href")).toBe(
      "/liga-norte/cmp_apertura/standings",
    );
    expect(nav.getByRole("list").getAttribute("tabindex")).toBeNull();
    expect(screen.getByText("Finalizada")).toBeTruthy();
    // Only the spectator Share utility button is present; no operator actions (UX-PUB-001).
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.textContent).toContain("Compartir");
  });

  it("keeps the chrome layout while the competition identity is still loading", async () => {
    await renderEs(
      <PublicPortalLayout busyLabel="Cargando la competición" section="standings">
        <p>contenido</p>
      </PublicPortalLayout>,
    );
    expect(screen.queryByRole("heading", { level: 1, name: "Liga Norte Apertura" })).toBeNull();
    expect(screen.getByRole("link", { name: "Futrob" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Tabla" })).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Tabla")).toBeTruthy();
    const tabList = screen.getByRole("list", { name: "Secciones de la competición" });
    expect(tabList.getAttribute("tabindex")).toBe("0");
    const status = screen.getByRole("status", { name: "Cargando la competición" });
    const busy = document.querySelector("[aria-busy='true']");
    expect(busy?.getAttribute("aria-label")).toBe("Cargando la competición");
    expect(busy?.contains(status)).toBe(false);
  });
});

describe("loading skeletons", () => {
  it("mirrors the standings table and leaves sequential focus", async () => {
    await renderEs(<PortalSectionLoading section="standings" />);
    expect(
      screen.getByText("Tabla oficial, calculada solo con resultados oficializados."),
    ).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Equipo" })).toBeTruthy();
    expect(document.querySelector("[data-slot='table-container']")?.getAttribute("tabindex")).toBe(
      "-1",
    );
    expect(screen.queryByRole("cell", { name: "Atlético Norte" })).toBeNull();
    const status = screen.getByRole("status", { name: "Cargando la sección" });
    const busy = document.querySelector("[aria-busy='true']");
    expect(busy?.getAttribute("aria-label")).toBe("Cargando la sección");
    expect(busy?.contains(status)).toBe(false);
  });

  it("keeps cover headings in place while encounters load", async () => {
    await renderEs(<PortalSectionLoading portalRef={portalRefFixture} section="cover" />);
    expect(screen.getByRole("heading", { name: "Últimos resultados" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Próximos enfrentamientos" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ver calendario completo" }).getAttribute("href")).toBe(
      "/liga-norte/cmp_apertura/calendar",
    );
  });

  it("keeps the assister ranking criterion while competition identity is pending", async () => {
    let resolveIdentity!: () => void;
    const identityPending = new Promise<void>((resolve) => {
      resolveIdentity = resolve;
    });

    const rootRoute = createRootRoute({ component: Outlet });
    const competitionRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/$organizationSlug/$competitionKey",
      loader: () => identityPending,
      pendingMs: 0,
      pendingMinMs: 0,
      pendingComponent: PortalFrameLoading,
      component: () => (
        <PublicPortalLayout
          competition={publicCompetitionFixture}
          portalRef={portalRefFixture}
          section="rankings"
        >
          <Outlet />
        </PublicPortalLayout>
      ),
    });
    const rankingsRoute = createRoute({
      getParentRoute: () => competitionRoute,
      path: "/rankings",
      validateSearch: portalRankingSearchSchema,
      component: () => (
        <PortalRankingView
          portalRef={portalRefFixture}
          ranking={{ ...publicRankingFixture, kind: "assister" }}
        />
      ),
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([competitionRoute.addChildren([rankingsRoute])]),
      history: createMemoryHistory({
        initialEntries: ["/liga-norte/cmp_apertura/rankings?kind=assister"],
      }),
    });

    render(
      <I18nProvider initialLocale="es">
        <RouterProvider router={router} />
      </I18nProvider>,
    );

    try {
      expect(
        await screen.findByText("Más asistencias en partidos oficiales aprobados."),
      ).toBeTruthy();
      expect(screen.getByRole("columnheader", { name: "Asistencias" })).toBeTruthy();
      expect(screen.queryByText("Más goles en partidos oficiales aprobados.")).toBeNull();
      const status = screen.getByRole("status", { name: "Cargando la competición" });
      const busy = document.querySelector("[aria-busy='true']");
      expect(busy?.contains(status)).toBe(false);
    } finally {
      resolveIdentity();
    }

    expect(
      await screen.findByRole("heading", { level: 1, name: "Liga Norte Apertura" }),
    ).toBeTruthy();
  });

  it("falls back to scorer in the pending frame when the ranking kind is invalid", async () => {
    let resolveIdentity!: () => void;
    const identityPending = new Promise<void>((resolve) => {
      resolveIdentity = resolve;
    });

    const rootRoute = createRootRoute({ component: Outlet });
    const competitionRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/$organizationSlug/$competitionKey",
      loader: () => identityPending,
      pendingMs: 0,
      pendingMinMs: 0,
      pendingComponent: PortalFrameLoading,
      component: () => (
        <PublicPortalLayout
          competition={publicCompetitionFixture}
          portalRef={portalRefFixture}
          section="rankings"
        >
          <Outlet />
        </PublicPortalLayout>
      ),
    });
    const rankingsRoute = createRoute({
      getParentRoute: () => competitionRoute,
      path: "/rankings",
      validateSearch: portalRankingSearchSchema,
      component: () => (
        <PortalRankingView portalRef={portalRefFixture} ranking={publicRankingFixture} />
      ),
    });
    const router = createRouter({
      routeTree: rootRoute.addChildren([competitionRoute.addChildren([rankingsRoute])]),
      history: createMemoryHistory({
        initialEntries: ["/liga-norte/cmp_apertura/rankings?kind=invalid"],
      }),
    });

    render(
      <I18nProvider initialLocale="es">
        <RouterProvider router={router} />
      </I18nProvider>,
    );

    try {
      expect(await screen.findByText("Más goles en partidos oficiales aprobados.")).toBeTruthy();
      expect(screen.getByRole("columnheader", { name: "Goles" })).toBeTruthy();
    } finally {
      resolveIdentity();
    }

    expect(
      await screen.findByRole("heading", { level: 1, name: "Liga Norte Apertura" }),
    ).toBeTruthy();
  });
});

describe("calendar and cover", () => {
  it("lists rounds and switches to agenda view with official scores in place", async () => {
    await renderEs(
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

    fireEvent.click(screen.getByRole("tab", { name: "Agenda" }));
    expect(screen.getByRole("tab", { name: "Agenda" }).getAttribute("aria-selected")).toBe("true");
  });

  it("applies an initial team filter when navigated from the teams directory", async () => {
    await renderEs(
      <PortalCalendarView
        calendar={{ timeZone: "America/Lima", entries: publicCalendarFixture }}
        initialTeam="Real Sur"
      />,
    );
    expect(screen.getByText("Mostrando 2 de 4 enfrentamientos")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(screen.getByText("4 enfrentamientos")).toBeTruthy();
  });

  it("explains a competition without fixture instead of an empty list", async () => {
    await renderEs(<PortalCalendarView calendar={{ timeZone: "America/Lima", entries: [] }} />);
    expect(screen.getByText("El calendario aún no está publicado")).toBeTruthy();
  });

  it("puts podium, featured match, official table, leaders, and calendar blocks on the cover", async () => {
    await renderEs(
      <PortalCoverView
        calendar={{ timeZone: "America/Lima", entries: publicCalendarFixture }}
        leaders={coverLeadersFromRankings([publicRankingFixture])}
        portalRef={portalRefFixture}
        standings={publicStandingsFixture}
      />,
    );
    expect(screen.getByRole("region", { name: "Podio oficial" })).toBeTruthy();
    expect(screen.getByRole("article", { name: "Partido destacado" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Tabla oficial" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Líderes individuales" })).toBeTruthy();
    const results = within(screen.getByRole("region", { name: "Últimos resultados" }));
    expect(results.getByLabelText("Resultado oficial 2–1")).toBeTruthy();
    const upcoming = within(screen.getByRole("region", { name: "Próximos enfrentamientos" }));
    expect(upcoming.getAllByRole("article")).toHaveLength(2);
  });

  it("offers a retry when the calendar read failed instead of calling it unpublished", async () => {
    const onRetry = vi.fn();
    const empty = { ...publicStandingsFixture, rows: [] };
    await renderEs(
      <PortalCoverView
        calendar={null}
        onCalendarRetry={onRetry}
        portalRef={portalRefFixture}
        standings={empty}
      />,
    );
    expect(screen.queryByText("El calendario aún no está publicado")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalledOnce();
    cleanup();

    await renderEs(
      <PortalCoverView
        calendar={{ timeZone: "America/Lima", entries: [] }}
        portalRef={portalRefFixture}
        standings={empty}
      />,
    );
    expect(screen.getByText("El calendario aún no está publicado")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
  });

  it("marks only the places the fixture sends to the playoffs, on the cover and the table", async () => {
    const [template] = publicStandingsFixture.rows;
    if (!template) throw new Error("fixture shape");
    const standings = {
      ...publicStandingsFixture,
      qualifyingSpots: 2,
      rows: Array.from({ length: 6 }, (_, index) => ({
        ...template,
        position: index + 1,
        teamName: `Equipo ${index + 1}`,
      })),
    };
    await renderEs(
      <PortalCoverView calendar={null} portalRef={portalRefFixture} standings={standings} />,
    );
    expect(screen.getByText("Los dos primeros pasan al playoff")).toBeTruthy();
    cleanup();

    await renderEs(<PortalStandingsView standings={standings} />);
    expect(screen.getByText("Los dos primeros pasan al playoff")).toBeTruthy();
  });
});

describe("tables", () => {
  it("renders the official table with KPI summary, form strip, and its empty state", async () => {
    await renderEs(<PortalStandingsView standings={publicStandingsFixture} />);
    expect(screen.getByRole("region", { name: "Resumen de la clasificación" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: /Atlético Norte/ })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "-1" })).toBeTruthy();
    expect(screen.getAllByText("Victoria").length).toBeGreaterThan(0);
    cleanup();
    await renderEs(<PortalStandingsView standings={{ ...publicStandingsFixture, rows: [] }} />);
    expect(screen.getByText("Aún no hay tabla")).toBeTruthy();
  });

  it("shows the ranking KPI summary, criterion, search filter, and links every kind", async () => {
    await renderEs(
      <PortalRankingView portalRef={portalRefFixture} ranking={publicRankingFixture} />,
    );
    expect(screen.getByRole("region", { name: "Resumen del ranking" })).toBeTruthy();
    expect(screen.getByText("Más goles en partidos oficiales aprobados.")).toBeTruthy();
    expect(screen.getByRole("cell", { name: /Nico_10/ })).toBeTruthy();
    const kinds = within(screen.getByRole("navigation", { name: "Tipo de ranking" }));
    expect(kinds.getByRole("link", { name: "Goleadores" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(kinds.getByRole("link", { name: "Asistencias" }).getAttribute("href")).toBe(
      "/liga-norte/cmp_apertura/rankings?kind=assister",
    );

    const search = screen.getByRole("searchbox", { name: "Buscar jugador" });
    fireEvent.change(search, { target: { value: "nadie" } });
    expect(screen.getByText("Ningún jugador coincide")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(screen.getByRole("cell", { name: /Nico_10/ })).toBeTruthy();
  });
});

describe("structure", () => {
  it("shows visual bracket and accessible list with never a score for a bye", async () => {
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
    await renderEs(<PortalBracketView bracket={withScoredBye} format="league-playoffs" />);
    expect(screen.getByRole("heading", { name: "Playoffs" })).toBeTruthy();
    expect(screen.getByText("1.º de la fase anterior")).toBeTruthy();
    expect(screen.getByText("Ganador del cruce 1 (ronda 1)")).toBeTruthy();
    expect(screen.queryByText("3")).toBeNull();

    // Accessible list view works equivalently (UX-BRK-001).
    fireEvent.click(screen.getByRole("tab", { name: "Lista" }));
    expect(screen.getByRole("tab", { name: "Lista" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByText("3")).toBeNull();
  });

  it("keeps each match of a two-leg tie in both the canvas and the list", async () => {
    const [stage] = publicBracketFixture.stages;
    const [first, second] = stage?.rounds ?? [];
    if (!stage || !first || !second) throw new Error("fixture shape");
    const twoLegs = {
      ...publicBracketFixture,
      stages: [
        {
          ...stage,
          rounds: [
            {
              ...first,
              encounters: first.encounters.map((encounter) =>
                encounter.order === 1
                  ? {
                      ...encounter,
                      home: { kind: "team" as const, name: "Atlético Norte" },
                      away: { kind: "team" as const, name: "Unión Oeste" },
                      status: "official" as const,
                      score: [
                        { homeGoals: 3, awayGoals: 0 },
                        { homeGoals: 0, awayGoals: 1 },
                      ],
                      winner: null,
                    }
                  : encounter,
              ),
            },
            second,
          ],
        },
      ],
    };
    await renderEs(<PortalBracketView bracket={twoLegs} format="league-playoffs" />);
    expect(screen.getByText("(3 · 0)")).toBeTruthy();
    expect(screen.getByText("(0 · 1)")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Lista" }));
    expect(screen.getByText("(3 · 0)")).toBeTruthy();
    expect(screen.getByText("(0 · 1)")).toBeTruthy();
  });

  it("says there is no bracket yet before the fixture exists", async () => {
    await renderEs(<PortalBracketView bracket={null} format="knockout" />);
    expect(screen.getByText("Aún no hay cuadro")).toBeTruthy();
  });

  it("says a league has no elimination stage when its bracket URL is opened", async () => {
    await renderEs(<PortalBracketView bracket={null} format="league" />);
    expect(screen.getByText("Esta competición no tiene eliminatorias")).toBeTruthy();
  });

  it("lists teams enriched with standings, supports search, and explains an empty list", async () => {
    await renderEs(
      <PortalTeamsView
        portalRef={portalRefFixture}
        standings={publicStandingsFixture}
        teams={["Atlético Norte", "Deportivo Este", "Real Sur", "Unión Oeste"].map((name) => ({
          name,
        }))}
      />,
    );
    expect(screen.getByText("Real Sur")).toBeTruthy();
    expect(screen.getByText("#1")).toBeTruthy();
    const search = screen.getByRole("searchbox", { name: "Buscar equipo" });
    fireEvent.change(search, { target: { value: "Sur" } });
    expect(screen.getByText("Real Sur")).toBeTruthy();
    expect(screen.queryByText("Unión Oeste")).toBeNull();
    cleanup();
    await renderEs(<PortalTeamsView teams={[]} />);
    expect(screen.getByText("Aún no hay equipos confirmados")).toBeTruthy();
  });

  it("spells out the competition rules and platform tiebreak rules", async () => {
    await renderEs(<PortalRulesView rules={publicRulesFixture} />);
    expect(screen.getByText("De 4 a 8")).toBeTruthy();
    expect(screen.getByText("Hasta 2 por equipo, con 24 h de aviso")).toBeTruthy();
    expect(screen.getByText("Marcador global")).toBeTruthy();
    expect(screen.getByText("No se permiten")).toBeTruthy();
    expect(screen.getByText("Reglas de la plataforma")).toBeTruthy();
  });
});

describe("PortalNotFound", () => {
  it("does not say whether the competition exists", async () => {
    await renderEs(<PortalNotFound />);
    expect(screen.getByText("Esta competición no está disponible")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ir a Futrob" }).getAttribute("href")).toBe("/");
  });
});
