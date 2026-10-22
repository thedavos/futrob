// @vitest-environment jsdom

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
// Serves each response in turn, repeating the last.
const sequence =
  (...responses: Array<() => Response>) =>
  () =>
    (responses.length > 1 ? responses.shift()! : responses[0]!)();
// Standings retry a transient failure twice, so one failed refresh consumes three responses.
const transient = (...rest: Array<() => Response>) => [
  fail(500, "api.unexpected"),
  fail(500, "api.unexpected"),
  fail(500, "api.unexpected"),
  ...rest,
];
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
  return queryClient;
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

  it.each([
    ["a null snapshot", { standings: null }],
    ["a snapshot with zero rows", { standings: { ...snapshot, rows: [] } }],
  ])(
    "keeps the last empty result across a refresh failure for %s and retries",
    async (_name, empty) => {
      serve({
        standings: sequence(() => Response.json(empty), ...transient(() => Response.json(empty))),
      });
      const queryClient = renderRoute();
      expect(await screen.findByText("Aún no hay clasificación oficial")).toBeTruthy();
      expect(screen.queryByRole("alert")).toBeNull();

      await act(() => queryClient.refetchQueries({ queryKey: ["statistics"] }));
      expect(await screen.findByText(/No pudimos actualizar la clasificación/)).toBeTruthy();
      expect(screen.getByText("Aún no hay clasificación oficial")).toBeTruthy();

      fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
      await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
      expect(screen.getByText("Aún no hay clasificación oficial")).toBeTruthy();
    },
    15_000,
  );

  it("shows a newly approved table when retrying a failed refresh of an empty result", async () => {
    serve({
      standings: sequence(
        () => Response.json({ standings: null }),
        ...transient(() => Response.json({ standings: snapshot })),
      ),
    });
    const queryClient = renderRoute();
    expect(await screen.findByText("Aún no hay clasificación oficial")).toBeTruthy();
    await act(() => queryClient.refetchQueries({ queryKey: ["statistics"] }));
    fireEvent.click(await screen.findByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Maderas FC")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  }, 15_000);

  it("lets a refusal win over a cached empty result after a failed refresh", async () => {
    serve({
      standings: sequence(
        () => Response.json({ standings: null }),
        fail(403, "refused"),
        ...transient(() => Response.json({ standings: null })),
      ),
    });
    const queryClient = renderRoute();
    expect(await screen.findByText("Aún no hay clasificación oficial")).toBeTruthy();
    await act(() => queryClient.refetchQueries({ queryKey: ["statistics"] }));
    expect(await screen.findByText("No tienes acceso a la clasificación")).toBeTruthy();
    await act(() => queryClient.refetchQueries({ queryKey: ["statistics"] }));
    expect(screen.getByText("No tienes acceso a la clasificación")).toBeTruthy();
    expect(screen.queryByText("Aún no hay clasificación oficial")).toBeNull();
  }, 15_000);

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

  it("drops cached standings when a refetch is refused with 403, and recovers", async () => {
    serve({
      standings: sequence(
        () => Response.json({ standings: snapshot }),
        fail(403, "statistics.read_forbidden"),
        () => Response.json({ standings: snapshot }),
      ),
    });
    const queryClient = renderRoute();
    expect(await screen.findByText("Maderas FC")).toBeTruthy();

    await act(() => queryClient.refetchQueries({ queryKey: ["statistics"] }));
    expect(await screen.findByText("No tienes acceso a la clasificación")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByText("Maderas FC")).toBeNull();

    await act(() => queryClient.refetchQueries({ queryKey: ["statistics"] }));
    expect(await screen.findByText("Maderas FC")).toBeTruthy();
  });

  it("drops cached standings when a refetch returns 401", async () => {
    serve({
      standings: sequence(
        () => Response.json({ standings: snapshot }),
        fail(401, "auth.unauthenticated"),
      ),
    });
    const queryClient = renderRoute();
    expect(await screen.findByText("Maderas FC")).toBeTruthy();

    await act(() => queryClient.refetchQueries({ queryKey: ["statistics"] }));
    expect(
      await screen.findByText("No pudimos comprobar tu acceso a la clasificación."),
    ).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("keeps cached standings across a refresh failure and says the refresh failed", async () => {
    serve({
      standings: sequence(
        () => Response.json({ standings: snapshot }),
        ...transient(() => Response.json({ standings: snapshot })),
      ),
    });
    const queryClient = renderRoute();
    expect(await screen.findByText("Maderas FC")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();

    await act(() => queryClient.refetchQueries({ queryKey: ["statistics"] }));
    expect(screen.getByText("Maderas FC")).toBeTruthy();
    expect(screen.queryByText("No tienes acceso a la clasificación")).toBeNull();
    expect(await screen.findByText(/No pudimos actualizar la clasificación/)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(screen.getByText("Maderas FC")).toBeTruthy();
  }, 15_000);

  it.each([
    [403, "No tienes acceso a la clasificación"],
    [401, "No pudimos comprobar tu acceso a la clasificación."],
  ])(
    "keeps hiding standings after a %s refusal followed by a transient error, until a fresh success",
    async (status, message) => {
      serve({
        standings: sequence(
          () => Response.json({ standings: snapshot }),
          fail(status, "refused"),
          ...transient(() => Response.json({ standings: snapshot })),
        ),
      });
      const queryClient = renderRoute();
      expect(await screen.findByText("Maderas FC")).toBeTruthy();

      await act(() => queryClient.refetchQueries({ queryKey: ["statistics"] }));
      expect(await screen.findByText(message)).toBeTruthy();

      await act(() => queryClient.refetchQueries({ queryKey: ["statistics"] }));
      expect(screen.getByText(message)).toBeTruthy();
      expect(screen.queryByRole("table")).toBeNull();
      expect(screen.queryByText("Maderas FC")).toBeNull();

      await act(() => queryClient.refetchQueries({ queryKey: ["statistics"] }));
      expect(await screen.findByText("Maderas FC")).toBeTruthy();
    },
    20_000,
  );

  it("does not show cached team names after the name lookup is refused, and recovers", async () => {
    serve({
      teams: sequence(
        () =>
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
          }),
        fail(403, "teams.read_forbidden"),
        () =>
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
          }),
      ),
    });
    const queryClient = renderRoute();
    expect(await screen.findByText("Maderas FC")).toBeTruthy();

    await act(() => queryClient.refetchQueries({ queryKey: ["competitions"] }));
    expect(await screen.findByText(/No pudimos cargar los nombres/)).toBeTruthy();
    expect(screen.queryByText("Maderas FC")).toBeNull();
    expect(screen.queryByText("Cuervos FC")).toBeNull();
    expect(screen.getByRole("table")).toBeTruthy();

    await act(() => queryClient.refetchQueries({ queryKey: ["competitions"] }));
    expect(await screen.findByText("Maderas FC")).toBeTruthy();
  });

  it("keeps hiding cached names after a refusal followed by a transient error", async () => {
    const teamsOk = () =>
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
      });
    serve({
      teams: sequence(
        teamsOk,
        fail(403, "teams.read_forbidden"),
        fail(500, "api.unexpected"),
        teamsOk,
      ),
    });
    const queryClient = renderRoute();
    expect(await screen.findByText("Maderas FC")).toBeTruthy();

    await act(() => queryClient.refetchQueries({ queryKey: ["competitions"] }));
    expect(await screen.findByText(/No pudimos cargar los nombres/)).toBeTruthy();
    await act(() => queryClient.refetchQueries({ queryKey: ["competitions"] }));
    expect(screen.getByText(/No pudimos cargar los nombres/)).toBeTruthy();
    expect(screen.queryByText("Maderas FC")).toBeNull();
    expect(screen.queryByText("Cuervos FC")).toBeNull();

    await act(() => queryClient.refetchQueries({ queryKey: ["competitions"] }));
    expect(await screen.findByText("Maderas FC")).toBeTruthy();
  });

  it("keeps cached names across a refresh failure and says the refresh failed", async () => {
    const teamsOk = () =>
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
      });
    serve({ teams: sequence(teamsOk, fail(500, "api.unexpected"), teamsOk) });
    const queryClient = renderRoute();
    expect(await screen.findByText("Maderas FC")).toBeTruthy();

    await act(() => queryClient.refetchQueries({ queryKey: ["competitions"] }));
    expect(await screen.findByText(/No pudimos actualizar los nombres/)).toBeTruthy();
    expect(screen.getByText("Maderas FC")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });

  it("does not carry a refusal into another competition scope", async () => {
    serve({ standings: fail(403, "statistics.read_forbidden") });
    const queryClient = renderRoute();
    expect(await screen.findByText("No tienes acceso a la clasificación")).toBeTruthy();
    expect(
      queryClient.getQueryData([
        "statistics",
        "competition",
        "org-1",
        "competition-2",
        "standings",
      ]),
    ).toBeUndefined();
  });
});
