// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import type { GetCurrentCompetitionFixtureResponse } from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { competitionFixturePageState } from "../competition-fixture-state.ts";
import {
  leagueOnly,
  sixTeamsWithByes,
  sixteenTeamKnockout,
  uncertainSources,
} from "./bracket.fixtures.ts";
import { CompetitionBracketPageView } from "./bracket-page.tsx";
import { bracketPageState } from "./bracket-state.ts";

afterEach(cleanup);

function mount(
  data: GetCurrentCompetitionFixtureResponse,
  { teamId = null, onTeamChange = () => undefined } = {} as {
    teamId?: string | null;
    onTeamChange?: (teamId: string | null) => void;
  },
) {
  const state = bracketPageState(
    competitionFixturePageState({ data, failed: false, refused: false, retry: () => undefined }),
  );
  const rootRoute = createRootRoute({ component: Outlet });
  const routes = [
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/bracket",
      component: () => (
        <CompetitionBracketPageView
          competitionId="competition-1"
          onTeamChange={onTeamChange}
          organizationId="org-1"
          state={state}
          teamId={teamId}
        />
      ),
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/encounters/$encounterId",
      component: () => <p>Encounter page</p>,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: "/orgs/$orgId/competitions/$competitionId/fixture",
      component: () => <p>Fixture page</p>,
    }),
  ];
  const router = createRouter({
    routeTree: rootRoute.addChildren(routes),
    history: createMemoryHistory({
      initialEntries: ["/orgs/org-1/competitions/competition-1/bracket"],
    }),
  });
  return render(
    <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
      <RouterProvider router={router} />
    </I18nProvider>,
  );
}

describe("CompetitionBracketPageView", () => {
  it("draws every Encounter as a link to its page, with one line per traced source", async () => {
    const { container } = mount(sixteenTeamKnockout);
    const region = await screen.findByRole("region", { name: "Cuadro desplazable: Eliminación" });
    expect(region.getAttribute("tabindex")).toBe("0");
    expect(within(region).getAllByRole("link")).toHaveLength(15);
    expect(container.querySelectorAll("[data-slot=bracket-wire]")).toHaveLength(14);
    expect(
      within(region)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(["Octavos de final", "Cuartos de final", "Semifinales", "Final"]);
    const first = within(region).getByRole("link", {
      name: /^Octavos de final, cruce 1: Cuervos FC contra Maderas FC\./,
    });
    expect(decodeURIComponent(first.getAttribute("href") ?? "")).toBe(
      "/orgs/org-1/competitions/competition-1/encounters/fixture-cup:stage:1:round:1:encounter:1",
    );
    expect(
      within(region).getByRole("link", {
        name: /^Final, cruce 1: Ganador de la semifinal 1 contra Ganador de la semifinal 2\..*Rival por definir\.$/,
      }),
    ).toBeTruthy();
  });

  it("shows no score: the fixture does not carry results", async () => {
    mount(sixteenTeamKnockout);
    const region = await screen.findByRole("region", { name: /Cuadro desplazable/ });
    for (const link of within(region).getAllByRole("link")) {
      expect(link.textContent).not.toMatch(/\d\s*[-–]\s*\d/);
    }
  });

  it("keeps the draw when following a Team and only quiets the other Encounters", async () => {
    const onTeamChange = vi.fn();
    const { container } = mount(sixteenTeamKnockout, { teamId: "team-3", onTeamChange });
    expect(await screen.findByText(/1 de 15 cruces destacados/)).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /Fuera del filtro\.$/ })).toHaveLength(14);
    expect(container.querySelectorAll("[data-slot=bracket-wire]")).toHaveLength(14);
    await userEvent.click(screen.getByRole("button", { name: "Quitar filtro" }));
    expect(onTeamChange).toHaveBeenCalledWith(null);
  });

  it("ignores a followed Team the draw does not place", async () => {
    mount(sixteenTeamKnockout, { teamId: "team-gone" });
    await screen.findByRole("region", { name: /Cuadro desplazable/ });
    expect(screen.queryByText(/cruces destacados/)).toBeNull();
    expect(screen.queryByRole("link", { name: /Fuera del filtro/ })).toBeNull();
  });

  it("names byes without inventing a match", async () => {
    mount(sixTeamsWithByes);
    const region = await screen.findByRole("region", { name: /Cuadro desplazable/ });
    expect(screen.getByText("2 descansos")).toBeTruthy();
    expect(within(region).getAllByText("Descansa")).toHaveLength(2);
    expect(within(region).getAllByText("Sin rival")).toHaveLength(2);
  });

  it("tells the reader when a place cannot be traced instead of drawing a line", async () => {
    const { container } = mount(uncertainSources);
    expect(
      await screen.findByText("1 plaza no indica de qué cruce llega, así que no tiene línea."),
    ).toBeTruthy();
    expect(container.querySelectorAll("[data-slot=bracket-wire]")).toHaveLength(4);
  });

  it("offers the same Encounters as a list by round", async () => {
    mount(sixteenTeamKnockout);
    await userEvent.click(
      await screen.findByRole("button", { name: "Ver eliminatorias en lista" }),
    );
    const row = await screen.findByRole("link", { name: /^Cuervos FC vs Maderas FC/ });
    expect(decodeURIComponent(row.getAttribute("href") ?? "")).toContain(
      "encounters/fixture-cup:stage:1:round:1:encounter:1",
    );
  });

  it("sends a league without knockout to the calendar", async () => {
    mount(leagueOnly);
    expect(
      await screen.findByRole("heading", { name: "Esta competición no tiene eliminatorias" }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ver calendario" }).getAttribute("href")).toBe(
      "/orgs/org-1/competitions/competition-1/fixture",
    );
    expect(screen.queryByRole("region")).toBeNull();
  });
});
