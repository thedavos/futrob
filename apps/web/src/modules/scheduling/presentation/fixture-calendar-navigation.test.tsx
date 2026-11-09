// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { CompetitionFixturePageView } from "./competition-fixture-page.tsx";
import { competitionFixturePageState } from "./competition-fixture-state.ts";
import { FIXTURE_CALENDAR_NOW, leagueFixture } from "./fixture-calendar.fixtures.ts";
import { fixtureCalendarSearchSchema } from "./fixture-calendar-search.ts";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function mount(query: string, wide = true) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: wide,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })),
  );
  const state = competitionFixturePageState({
    data: leagueFixture,
    failed: false,
    refused: false,
    retry: () => undefined,
  });
  const root = createRootRoute({ component: Outlet });
  const fixture = createRoute({
    getParentRoute: () => root,
    path: "/orgs/$orgId/competitions/$competitionId/fixture",
    validateSearch: fixtureCalendarSearchSchema,
    component: () => (
      <CompetitionFixturePageView
        competitionId="competition-1"
        organizationId="org-1"
        now={FIXTURE_CALENDAR_NOW}
        state={state}
      />
    ),
  });
  const encounter = createRoute({
    getParentRoute: () => root,
    path: "/orgs/$orgId/competitions/$competitionId/encounters/$encounterId",
    component: () => <p>Encounter detail</p>,
  });
  const history = createMemoryHistory({
    initialEntries: ["/orgs/org-1/competitions/competition-1/fixture?" + query],
  });
  const router = createRouter({ routeTree: root.addChildren([fixture, encounter]), history });
  render(
    <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
      <RouterProvider router={router} />
    </I18nProvider>,
  );
  return { history, router };
}

describe("calendar return navigation", () => {
  it("restores team, round, view, month and selected day after opening an Encounter and going Back", async () => {
    const { history, router } = mount("");
    const user = userEvent.setup();
    await user.click(await screen.findByRole("combobox", { name: "Equipo" }));
    await user.click(await screen.findByRole("option", { name: "Atlas FC" }));
    await user.click(screen.getByRole("combobox", { name: "Ronda" }));
    await user.click(await screen.findByRole("option", { name: "Jornada 3" }));
    await user.click(screen.getByRole("tab", { name: "Calendario" }));
    await screen.findByRole("tab", { name: "Calendario", selected: true });
    await user.click(screen.getByRole("button", { name: "Mes siguiente" }));
    await user.click(screen.getByRole("button", { name: "Mes anterior" }));
    await user.click(
      screen.getByRole("button", { name: "lunes, 16 de noviembre: 1 enfrentamiento" }),
    );
    expect(router.state.location.search).toMatchObject({
      view: "month",
      team: "team-atlas",
      round: "league-plan:stage:1:round:3",
      month: "2026-11",
      day: "2026-11-16",
    });
    expect(screen.getByRole("combobox", { name: "Equipo" }).textContent).toContain("Atlas FC");
    expect(screen.getByRole("combobox", { name: "Ronda" }).textContent).toContain("Jornada 3");
    const selected = await screen.findByRole("button", {
      name: "lunes, 16 de noviembre: 1 enfrentamiento",
    });
    expect(selected.getAttribute("aria-pressed")).toBe("true");
    const before = router.state.location.search;
    fireEvent.click(
      screen.getByRole("link", {
        name: "Abrir Atlas FC vs Eclipse Club, lunes, 16 de noviembre, 20:30",
      }),
    );
    await screen.findByText("Encounter detail");
    history.back();
    await screen.findByRole("tab", { name: "Calendario", selected: true });
    expect(router.state.location.search).toEqual(before);
    expect(screen.getByRole("combobox", { name: "Equipo" }).textContent).toContain("Atlas FC");
    expect(screen.getByRole("combobox", { name: "Ronda" }).textContent).toContain("Jornada 3");
    expect(
      screen
        .getByRole("button", { name: "lunes, 16 de noviembre: 1 enfrentamiento" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getAllByRole("link", { name: /^Abrir / })).toHaveLength(1);
  });

  it("writes a chosen view to search so it survives a remount", async () => {
    const { history, router } = mount("team=team-atlas");
    fireEvent.click(await screen.findByRole("tab", { name: "Jornadas" }));
    await waitFor(() =>
      expect(router.state.location.search).toMatchObject({ view: "rounds", team: "team-atlas" }),
    );
    const first = screen.getAllByRole("link", { name: /^Abrir / })[0];
    if (!first) throw new Error("Encounter expected");
    fireEvent.click(first);
    await screen.findByText("Encounter detail");
    history.back();
    await screen.findByRole("tab", { name: "Jornadas", selected: true });
    expect(screen.getAllByRole("link", { name: /^Abrir / })).toHaveLength(3);
  });

  it("keeps a bookmarked month selection while using the mobile Agenda fallback", async () => {
    const { router } = mount("view=month&team=team-atlas&month=2026-11&day=2026-11-16", false);
    await screen.findByRole("tab", { name: "Agenda", selected: true });
    expect(screen.queryByRole("tab", { name: "Calendario" })).toBeNull();
    expect(router.state.location.search).toMatchObject({
      view: "month",
      team: "team-atlas",
      month: "2026-11",
      day: "2026-11-16",
    });
  });
});
