// @vitest-environment jsdom

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { EffectiveAccessDto, GetTeamPerformanceRankingResponse } from "@futrob/api-contracts";
import { STATISTICS_PERMISSION } from "@futrob/statistics";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import {
  TEAM_PERFORMANCE_TEAMS,
  teamPerformanceRankingFixture,
} from "./team-performance.fixtures.ts";
import { TeamPerformanceRoute } from "./team-performance-page.tsx";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    ...props
  }: {
    to: string;
    params: Record<string, string>;
    children?: ReactNode;
  }) => (
    <a
      href={to.replaceAll(/\$(\w+)/g, (_, key: string) => encodeURIComponent(params[key] ?? ""))}
      {...props}
    >
      {children}
    </a>
  ),
}));

const RANKING_PATH =
  "/api/v1/organizations/org-1/competitions/competition-1/team-performance-ranking";
const TEAMS_PATH = "/api/v1/organizations/org-1/teams";
const ACCESS_PATH = "/api/v1/authorization/effective-access";

const access = (allowed: boolean): EffectiveAccessDto => ({
  actorId: "actor-1",
  scope: { organizationId: "org-1", competitionId: "competition-1" },
  roles: [],
  permissions: [{ permission: STATISTICS_PERMISSION.read, allowed, decidedAt: "competition" }],
});

const failure = (status: number, code: string) =>
  Response.json({ code, messageKey: `errors.${code}` }, { status });

function serve(input: {
  readonly allowed?: boolean;
  readonly ranking?: Array<() => Response>;
  readonly teams?: () => Response;
}) {
  const ranking = [...(input.ranking ?? [])];
  const fetch = vi.fn(async (request: RequestInfo | URL) => {
    const url = new URL(String(request), "https://web.test");
    if (url.pathname === ACCESS_PATH) return Response.json(access(input.allowed ?? true));
    if (url.pathname === TEAMS_PATH) {
      return input.teams ? input.teams() : Response.json({ teams: TEAM_PERFORMANCE_TEAMS });
    }
    if (url.pathname === RANKING_PATH) {
      const next = ranking.length > 1 ? ranking.shift() : ranking[0];
      return next ? next() : failure(500, "api.unexpected");
    }
    return failure(404, "api.not_found");
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const rankingCalls = (fetch: ReturnType<typeof serve>) =>
  fetch.mock.calls.filter(([request]) => String(request).includes("team-performance-ranking"));

function renderWith(input: Parameters<typeof serve>[0]) {
  serve(input);
  return renderRoute();
}

function renderRoute(locale: "es" | "en" = "es") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider initialLocale={locale}>
        <TeamPerformanceRoute competitionId="competition-1" organizationId="org-1" />
      </I18nProvider>
    </QueryClientProvider>,
  );
  return queryClient;
}

/** Background refetch of the active queries whose key mentions `key`, as on window focus. */
const refetch = (queryClient: QueryClient, key: string) =>
  act(async () => {
    await queryClient.refetchQueries({
      predicate: (query) => JSON.stringify(query.queryKey).includes(key),
      type: "active",
    });
  });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("team performance page", () => {
  it("explains that the plan does not include the ranking on a 402", async () => {
    renderWith({
      ranking: [() => failure(402, "statistics.performance_ranking_not_in_plan")],
    });

    expect(await screen.findByText("El ranking de rendimiento es de Pro y Liga")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ver plan y uso" }).getAttribute("href")).toBe(
      "/orgs/org-1/settings/plan",
    );
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("shows the server ranking with names, scores and incomplete coverage", async () => {
    const body: GetTeamPerformanceRankingResponse = { ranking: teamPerformanceRankingFixture() };
    serve({ ranking: [() => Response.json(body)] });
    renderRoute();

    const table = await screen.findByRole("table");
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell")[1]?.textContent)).toEqual([
      "Cuervos FC",
      "Halcones",
      "Maderas FC",
      "Pumas del Sur",
      "Club Atlético Tiburones del Pacífico",
      "Equipo no disponible",
    ]);
    expect(within(rows[0]!).getByText("95")).toBeTruthy();
    expect(within(rows[3]!).getByText("Sin puntuación")).toBeTruthy();
    expect(within(rows[3]!).getByText("Falta: Eficiencia defensiva")).toBeTruthy();
    expect(within(rows[4]!).getByText("Muestra insuficiente: 2 de 3 enfrentamientos")).toBeTruthy();
    expect(within(rows[5]!).getByText("Sin partidos oficiales")).toBeTruthy();
    expect(
      screen.getByText(
        "Versiones: team-performance-v1 · team-performance-normalization-v1 · competition-all-form-5-min-3-v1",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Ver clasificación oficial/ }).getAttribute("href"),
    ).toBe("/orgs/org-1/competitions/competition-1/standings");
  });

  it("explains a ranking that has not been built instead of showing an empty table", async () => {
    serve({ ranking: [() => Response.json({ ranking: null })] });
    renderRoute("en");

    expect(await screen.findByRole("heading", { name: "No performance ranking yet" })).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("does not request the ranking when EffectiveAccess denies statistics", async () => {
    const fetch = serve({ allowed: false, ranking: [() => Response.json({ ranking: null })] });
    renderRoute();

    expect(
      await screen.findByRole("heading", { name: "No tienes acceso a este ranking" }),
    ).toBeTruthy();
    expect(rankingCalls(fetch)).toHaveLength(0);
  });

  it("treats a server refusal as a permission state, not as missing data", async () => {
    serve({ ranking: [() => failure(403, "statistics.read_forbidden")] });
    renderRoute();

    expect(
      await screen.findByRole("heading", { name: "No tienes acceso a este ranking" }),
    ).toBeTruthy();
  });

  it("offers a retry once automatic retries of a server failure are exhausted", async () => {
    const unavailable = () => failure(503, "api.unavailable");
    const fetch = serve({
      ranking: [
        unavailable,
        unavailable,
        unavailable,
        () => Response.json({ ranking: teamPerformanceRankingFixture() }),
      ],
    });
    renderRoute();

    await screen.findByText("No pudimos cargar el ranking de rendimiento.", undefined, {
      timeout: 8_000,
    });
    expect(rankingCalls(fetch)).toHaveLength(3);
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("table")).toBeTruthy();
    expect(rankingCalls(fetch)).toHaveLength(4);
  }, 15_000);

  it("keeps the ranking when team names cannot be loaded", async () => {
    serve({
      ranking: [() => Response.json({ ranking: teamPerformanceRankingFixture() })],
      teams: () => failure(403, "teams.read_forbidden"),
    });
    renderRoute();

    expect(await screen.findByRole("table")).toBeTruthy();
    expect(
      await screen.findByText(
        "No pudimos cargar los nombres de los equipos. El ranking sigue siendo válido.",
      ),
    ).toBeTruthy();
  });

  it("never brings a cached ranking back after a refusal followed by a server failure", async () => {
    const queryClient = renderWith({
      ranking: [
        () => Response.json({ ranking: teamPerformanceRankingFixture() }),
        () => failure(403, "statistics.read_forbidden"),
        () => failure(500, "api.unexpected"),
      ],
    });
    expect(await screen.findByRole("table")).toBeTruthy();

    await refetch(queryClient, "team-performance");
    expect(
      await screen.findByRole("heading", { name: "No tienes acceso a este ranking" }),
    ).toBeTruthy();

    await refetch(queryClient, "team-performance");
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByText("Cuervos FC")).toBeNull();
    expect(screen.getByRole("heading", { name: "No tienes acceso a este ranking" })).toBeTruthy();
  }, 15_000);

  it("keeps the last ranking with an explicit retry when only a refresh fails", async () => {
    const queryClient = renderWith({
      ranking: [
        () => Response.json({ ranking: teamPerformanceRankingFixture() }),
        () => failure(503, "api.unavailable"),
      ],
    });
    expect(await screen.findByRole("table")).toBeTruthy();

    await refetch(queryClient, "team-performance");
    expect(
      await screen.findByText(
        "No pudimos actualizar el ranking. Se muestran los últimos datos cargados.",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
  }, 15_000);

  it("flags a failed refresh of a ranking that is not built yet", async () => {
    const queryClient = renderWith({
      ranking: [() => Response.json({ ranking: null }), () => failure(503, "api.unavailable")],
    });
    expect(
      await screen.findByRole("heading", { name: "Aún no hay ranking de rendimiento" }),
    ).toBeTruthy();

    await refetch(queryClient, "team-performance");
    expect(
      await screen.findByText(
        "No pudimos actualizar el ranking. Se muestran los últimos datos cargados.",
      ),
    ).toBeTruthy();
  }, 15_000);

  it("drops cached team names once the teams read fails", async () => {
    const teams = [
      () => Response.json({ teams: TEAM_PERFORMANCE_TEAMS }),
      () => failure(403, "teams.read_forbidden"),
      () => failure(500, "api.unexpected"),
    ];
    const queryClient = renderWith({
      ranking: [() => Response.json({ ranking: teamPerformanceRankingFixture() })],
      teams: () => (teams.length > 1 ? teams.shift()! : teams[0]!)(),
    });
    expect(await screen.findByText("Cuervos FC")).toBeTruthy();

    await refetch(queryClient, "teams");
    await screen.findByText(
      "No pudimos cargar los nombres de los equipos. El ranking sigue siendo válido.",
    );
    await refetch(queryClient, "teams");
    await waitFor(() => expect(teams).toHaveLength(1));
    expect(screen.queryByText("Cuervos FC")).toBeNull();
    expect(screen.getAllByText("Equipo no disponible").length).toBeGreaterThan(1);
  });
});
