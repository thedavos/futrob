// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
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
import { PortalCalendarView, PortalCoverView } from "./public-portal-calendar.tsx";
import { PublicPortalLayout } from "./public-portal-layout.tsx";
import { portalRankingSearchSchema } from "./public-portal-model.ts";
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
  it("shows the competition header and one tab per applicable section", async () => {
    await renderEs(
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
    // Resolved frame lets keyboard focus go directly to the real tab links.
    expect(nav.getByRole("list").getAttribute("tabindex")).toBeNull();
    expect(screen.getByText("En juego")).toBeTruthy();
    // No operator actions on the public frame.
    expect(screen.queryByRole("button")).toBeNull();
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
  it("lists every round with official scores in place", async () => {
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
  });

  it("explains a competition without fixture instead of an empty list", async () => {
    await renderEs(<PortalCalendarView calendar={{ timeZone: "America/Lima", entries: [] }} />);
    expect(screen.getByText("El calendario aún no está publicado")).toBeTruthy();
  });

  it("puts the latest official result and the next encounters on the cover", async () => {
    await renderEs(
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
  it("renders the official table and its empty state", async () => {
    await renderEs(<PortalStandingsView standings={publicStandingsFixture} />);
    expect(screen.getByRole("cell", { name: "Atlético Norte" })).toBeTruthy();
    expect(screen.getByRole("cell", { name: "-1" })).toBeTruthy();
    cleanup();
    await renderEs(<PortalStandingsView standings={{ ...publicStandingsFixture, rows: [] }} />);
    expect(screen.getByText("Aún no hay tabla")).toBeTruthy();
  });

  it("shows the ranking criterion and links every kind", async () => {
    await renderEs(
      <PortalRankingView portalRef={portalRefFixture} ranking={publicRankingFixture} />,
    );
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
  it("shows bracket sides by name or position and never a score for a bye", async () => {
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
    const bye = screen.getByText("Descanso").closest("li");
    expect(bye?.textContent).toMatch(/Real SurDescanso$/);
  });

  it("says there is no bracket yet before the fixture exists", async () => {
    await renderEs(<PortalBracketView bracket={null} format="knockout" />);
    expect(screen.getByText("Aún no hay cuadro")).toBeTruthy();
  });

  it("says a league has no elimination stage when its bracket URL is opened", async () => {
    await renderEs(<PortalBracketView bracket={null} format="league" />);
    expect(screen.getByText("Esta competición no tiene eliminatorias")).toBeTruthy();
  });

  it("lists teams by public name and explains an empty list", async () => {
    await renderEs(<PortalTeamsView teams={[{ name: "Real Sur" }]} />);
    expect(screen.getByText("Real Sur")).toBeTruthy();
    cleanup();
    await renderEs(<PortalTeamsView teams={[]} />);
    expect(screen.getByText("Aún no hay equipos confirmados")).toBeTruthy();
  });

  it("spells out the rules of each stage", async () => {
    await renderEs(<PortalRulesView rules={publicRulesFixture} />);
    expect(screen.getByText("De 4 a 8")).toBeTruthy();
    expect(screen.getByText("Hasta 2 por equipo, con 24 h de aviso")).toBeTruthy();
    expect(screen.getByText("Marcador global")).toBeTruthy();
    expect(screen.getByText("No se permiten")).toBeTruthy();
  });
});

describe("PortalNotFound", () => {
  it("does not say whether the competition exists", async () => {
    await renderEs(<PortalNotFound />);
    expect(screen.getByText("Esta competición no está disponible")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ir a Futrob" }).getAttribute("href")).toBe("/");
  });
});
