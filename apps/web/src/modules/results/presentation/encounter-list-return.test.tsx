// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { ListCompetitionEncountersResponse } from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  competitionEncountersSearchSchema,
  filtersFromSearch,
  searchFromFilters,
} from "./competition-encounters-model.ts";
import { CompetitionEncountersRoute } from "./competition-encounters-page.tsx";
import { encounterDetailSearchSchema, encounterListReturn } from "./encounter-list-return.ts";
import { EncounterPageView } from "./encounter-page.tsx";
import { encounterView } from "./encounter-page.fixtures.ts";

const league = { id: "plan-1:stage:1", kind: "league", order: 1 } as const;

const list: ListCompetitionEncountersResponse = {
  competition: { id: "competition-1", name: "Liga Verify", timeZone: "America/Lima" },
  encounters: [
    {
      encounterId: "encounter-1",
      round: { id: "plan-1:stage:1:round:1", number: 1, total: 2, stage: league },
      scheduledStartAt: "2026-10-19T16:00:00.000Z",
      officialMatchCount: 1,
      resolutionMode: null,
      home: { teamId: "team-cuervos", name: "Cuervos FC" },
      away: { teamId: "team-maderas", name: "Maderas FC" },
      status: "official",
      score: [{ homeGoals: 2, awayGoals: 1 }],
    },
    {
      encounterId: "encounter-2",
      round: { id: "plan-1:stage:1:round:2", number: 2, total: 2, stage: league },
      scheduledStartAt: "2026-10-26T16:00:00.000Z",
      officialMatchCount: 1,
      resolutionMode: null,
      home: { teamId: "team-halcones", name: "Halcones FC" },
      away: { teamId: "team-cuervos", name: "Cuervos FC" },
      status: "scheduled",
      score: null,
    },
    {
      encounterId: "encounter-3",
      round: { id: "plan-1:stage:1:round:2", number: 2, total: 2, stage: league },
      scheduledStartAt: "2026-10-26T18:00:00.000Z",
      officialMatchCount: 1,
      resolutionMode: null,
      home: { teamId: "team-maderas", name: "Maderas FC" },
      away: { teamId: "team-halcones", name: "Halcones FC" },
      status: "scheduled",
      score: null,
    },
  ],
};

/** The list and Match Center routes as the app declares them, without the signed-in shell. */
function renderApp(initialEntry: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(list)),
  );
  const rootRoute = createRootRoute({ component: Outlet });
  const listRoute = (path: string, origin: "encounters" | "matches") => {
    const route = createRoute({
      getParentRoute: () => rootRoute,
      path,
      validateSearch: competitionEncountersSearchSchema,
      component: function ListPage() {
        const search = route.useSearch();
        const navigate = route.useNavigate();
        return (
          <CompetitionEncountersRoute
            competitionId="competition-1"
            filters={filtersFromSearch(search)}
            onFiltersChange={(next) => {
              void navigate({ replace: true, search: searchFromFilters(next) });
            }}
            organizationId="org-1"
            origin={origin}
            page={origin === "matches" ? "competitionPlayer.matches" : "competition.encounters"}
          />
        );
      },
    });
    return route;
  };
  const encountersRoute = listRoute(
    "/orgs/$orgId/competitions/$competitionId/encounters",
    "encounters",
  );
  const matchesRoute = listRoute("/orgs/$orgId/competitions/$competitionId/matches", "matches");
  const encounterRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/orgs/$orgId/competitions/$competitionId/encounters/$encounterId",
    validateSearch: encounterDetailSearchSchema,
    component: function MatchCenter() {
      const search = encounterRoute.useSearch();
      return (
        <EncounterPageView
          candidates={{ kind: "loading" }}
          competitionId="competition-1"
          encounter={{
            kind: "ready",
            view: encounterView({
              competition: { ...encounterView().competition, id: "competition-1" },
            }),
          }}
          listReturn={encounterListReturn(search)}
          organizationId="org-1"
        />
      );
    },
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([encountersRoute, matchesRoute, encounterRoute]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
        <RouterProvider router={router} />
      </I18nProvider>
    </QueryClientProvider>,
  );
  return router;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Match Center return to its list", () => {
  it("goes back from an Encounter to «Partidos» with the filters it was opened with", async () => {
    const user = userEvent.setup();
    const router = renderApp(
      "/orgs/org-1/competitions/competition-1/matches?status=scheduled&team=team-cuervos",
    );

    await user.click(await screen.findByRole("link", { name: "Abrir Halcones FC vs Cuervos FC" }));
    const breadcrumb = await screen.findByRole("navigation", { name: "Ruta del enfrentamiento" });
    expect(router.state.location.pathname).toBe(
      "/orgs/org-1/competitions/competition-1/encounters/encounter-2",
    );

    await user.click(within(breadcrumb).getByRole("link", { name: "Partidos" }));

    await screen.findByRole("link", { name: "Abrir Halcones FC vs Cuervos FC" });
    expect(router.state.location.pathname).toBe("/orgs/org-1/competitions/competition-1/matches");
    expect(router.state.location.search).toEqual({ status: "scheduled", team: "team-cuervos" });
    expect(screen.getByRole("radio", { name: /Programados/ })).toBeChecked();
    expect(screen.getByRole("heading", { name: "Partidos" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Abrir Maderas FC vs Halcones FC" })).toBeNull();
  });

  it("goes back to the staff list without filters after a direct visit or an unknown origin", async () => {
    renderApp(
      "/orgs/org-1/competitions/competition-1/encounters/encounter-1?from=https%3A%2F%2Fevil.test&status=official",
    );

    const breadcrumb = await screen.findByRole("navigation", { name: "Ruta del enfrentamiento" });
    expect(within(breadcrumb).getByRole("link", { name: "Enfrentamientos" })).toHaveAttribute(
      "href",
      "/orgs/org-1/competitions/competition-1/encounters",
    );
  });
});
