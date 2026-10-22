// @vitest-environment jsdom

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { CompetitionStandingsRoute } from "./competition-standings-page.tsx";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, render: _r, ...props }: { children?: ReactNode; render?: unknown }) => (
    <a {...props}>{children}</a>
  ),
}));

const base = "/api/v1/organizations/org-1";
const row = (position: number, teamId: string, points: number, goalDifference: number) => ({
  position,
  teamId,
  played: 2,
  wins: 1,
  draws: 1,
  losses: 0,
  goalsFor: 4,
  goalsAgainst: 4 - goalDifference,
  goalDifference,
  points,
});
const snapshot = {
  competitionId: "competition-1",
  organizationId: "org-1",
  formulaVersion: "points-gd-gf-v1",
  rows: [row(1, "t2", 4, 3), row(2, "t1", 2, -2)],
  sourceRevisionMax: 2,
  updatedAt: "2026-10-12T01:00:00.000Z",
};

type Routes = {
  access?: () => Response;
  standings?: () => Response;
  teams?: () => Response;
};

const allow = (allowed: boolean) => () =>
  Response.json({
    actorId: "a",
    scope: { organizationId: "org-1", competitionId: "competition-1" },
    roles: [],
    permissions: [{ permission: "statistics.read", allowed, decidedAt: "competition" }],
  });
const fail = (status: number, code: string) => () =>
  Response.json({ code, messageKey: `errors.${code}` }, { status });

function serve(routes: Routes) {
  const fetch = vi.fn(async (input: RequestInfo | URL) => {
    const path = new URL(String(input), "https://web.test").pathname;
    if (path === "/api/v1/authorization/effective-access") return (routes.access ?? allow(true))();
    if (path === `${base}/competitions/competition-1/standings`)
      return (routes.standings ?? (() => Response.json({ standings: snapshot })))();
    if (path === `${base}/teams`)
      return (
        routes.teams ??
        (() =>
          Response.json({
            teams: [
              {
                id: "t1",
                organizationId: "org-1",
                name: "Cuervos FC",
                createdAt: "2026-01-01T00:00:00.000Z",
              },
              {
                id: "t2",
                organizationId: "org-1",
                name: "Maderas FC",
                createdAt: "2026-01-01T00:00:00.000Z",
              },
            ],
          }))
      )();
    return fail(404, "api.not_found")();
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

function renderRoute(locale: "es" | "en" = "es") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider initialLocale={locale}>
        <CompetitionStandingsRoute competitionId="competition-1" organizationId="org-1" />
      </I18nProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Competition standings page", () => {
  it("shows the official table in server order with resolved team names", async () => {
    serve({});
    renderRoute();

    expect(await screen.findByText("Maderas FC")).toBeTruthy();
    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByText("Maderas FC")).toBeTruthy();
    expect(within(rows[0]!).getByText("+3")).toBeTruthy();
    expect(within(rows[1]!).getByText("Cuervos FC")).toBeTruthy();
    expect(within(rows[1]!).getByText("-2")).toBeTruthy();
    expect(screen.getByText("Fórmula points-gd-gf-v1")).toBeTruthy();
  });

  it("speaks English", async () => {
    serve({});
    renderRoute("en");
    expect(await screen.findByText("Formula points-gd-gf-v1")).toBeTruthy();
    expect(screen.getAllByText("GD").length).toBeGreaterThan(0);
  });

  it("explains no approved results instead of an error or empty table", async () => {
    serve({ standings: () => Response.json({ standings: null }) });
    renderRoute();
    expect(await screen.findByText("Aún no hay clasificación oficial")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("reports a load failure with retry, distinct from empty", async () => {
    serve({ standings: fail(500, "api.unexpected") });
    renderRoute();
    // The query retries a transient failure twice (1s + 2s backoff) before reporting it.
    expect(
      await screen.findByText("No pudimos cargar la clasificación.", {}, { timeout: 6000 }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
    expect(screen.queryByText("Aún no hay clasificación oficial")).toBeNull();
  }, 10_000);

  it("shows permission denial without requesting standings", async () => {
    const fetch = serve({ access: allow(false) });
    renderRoute();
    expect(await screen.findByText("No tienes acceso a la clasificación")).toBeTruthy();
    expect(fetch.mock.calls.some(([u]) => String(u).endsWith("/standings"))).toBe(false);
  });

  it("treats a server 403 as permission, not failure", async () => {
    serve({ standings: fail(403, "statistics.read_forbidden") });
    renderRoute();
    expect(await screen.findByText("No tienes acceso a la clasificación")).toBeTruthy();
  });

  it("keeps the figures when team names fail to load", async () => {
    serve({ teams: fail(500, "api.unexpected") });
    renderRoute();
    expect(await screen.findByText(/No pudimos cargar los nombres/)).toBeTruthy();
    expect(screen.getAllByText("Equipo sin nombre disponible")).toHaveLength(2);
    expect(screen.getByRole("table")).toBeTruthy();
  });
});
