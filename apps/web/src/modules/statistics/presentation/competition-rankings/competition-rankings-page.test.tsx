// @vitest-environment jsdom

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { RankingKindDto } from "@futrob/api-contracts";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { CompetitionRankingsRoute } from "./competition-rankings-page.tsx";
import { rankingsFixture, teamDetailFixture } from "./competition-rankings.fixtures.ts";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children?: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

const BASE = "/api/v1/organizations/org-1/competitions/competition-1";

type Serve = {
  readonly allowed?: readonly string[];
  readonly rankings?: () => Response;
  readonly roster?: (teamId: string) => Response;
};

function serve({
  allowed = ["statistics.read", "teams.roster.read"],
  rankings = () => Response.json(rankingsFixture),
  roster = (teamId) => Response.json(teamDetailFixture(teamId)),
}: Serve = {}) {
  const fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), "https://web.test");
    if (url.pathname === "/api/v1/authorization/effective-access") {
      const permissions = (url.searchParams.get("permissions") ?? "").split(",");
      return Response.json({
        actorId: "actor-1",
        scope: { organizationId: "org-1", competitionId: "competition-1" },
        roles: [],
        permissions: permissions.map((permission) => ({
          permission,
          allowed: allowed.includes(permission),
          decidedAt: "competition",
        })),
      });
    }
    if (url.pathname === `${BASE}/rankings`) return rankings();
    const team = url.pathname.match(/team-management\/([^/]+)$/);
    if (team) return roster(decodeURIComponent(team[1]!));
    return failure(404, "api.not_found");
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const failure = (status: number, code: string) =>
  Response.json({ code, messageKey: `errors.${code}` }, { status });

function Harness({ initialKind }: { readonly initialKind: RankingKindDto }) {
  const [kind, setKind] = useState(initialKind);
  return (
    <CompetitionRankingsRoute
      competitionId="competition-1"
      onRankingKindChange={setKind}
      organizationId="org-1"
      rankingKind={kind}
    />
  );
}

function renderRoute(locale: "es" | "en" = "es", initialKind: RankingKindDto = "scorer") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider initialLocale={locale}>
        <Harness initialKind={initialKind} />
      </I18nProvider>
    </QueryClientProvider>,
  );
  return queryClient;
}

/** Refetches every active query and lets the result render. */
async function refetchAll(queryClient: QueryClient) {
  await act(async () => {
    await queryClient.refetchQueries({ type: "active" });
  });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Competition player rankings", () => {
  it("shows the scorer ranking with criterion, eligibility and resolved names", async () => {
    serve();
    renderRoute();

    expect(await screen.findByText("Lucía Pérez")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Goleadores" }).getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(screen.getByText("Más goles en partidos oficiales aprobados.")).toBeTruthy();
    expect(
      screen.getByText("Al menos 3 partidos o el 60 % de los minutos de su equipo."),
    ).toBeTruthy();

    const table = screen.getByRole("table", { name: "Ranking de goleadores" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell")[0]?.textContent)).toEqual([
      "1",
      "2",
      "3",
    ]);
    expect(within(rows[0]!).getByText("Cuervos FC")).toBeTruthy();
    expect(within(rows[0]!).getAllByRole("cell").at(-1)?.textContent).toBe("9");
    expect(within(rows[2]!).getByText("Sin equipo")).toBeTruthy();
    expect(within(rows[2]!).getByText("Jugador sin nombre visible")).toBeTruthy();
  });

  it("switches kind from the keyboard and formats the average rating", async () => {
    const user = userEvent.setup();
    serve();
    renderRoute("en");

    const scorers = await screen.findByRole("tab", { name: "Top scorers" });
    await screen.findByText("Lucía Pérez");
    scorers.focus();
    await user.keyboard("{ArrowRight}{ArrowRight}{Enter}");

    const table = await screen.findByRole("table", { name: "Average rating ranking" });
    expect(screen.getByRole("tab", { name: "Rating" }).getAttribute("aria-selected")).toBe("true");
    expect(within(table).getByRole("columnheader", { name: "Avg. rating" })).toBeTruthy();
    expect(within(table).getByText("8.25")).toBeTruthy();
  });

  it("explains a kind whose snapshot nobody qualifies for", async () => {
    serve();
    renderRoute("es", "mvp");

    expect(await screen.findByText("Nadie entra todavía en este ranking")).toBeTruthy();
    expect(screen.getByText("Más premios MVP en partidos oficiales aprobados.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("explains rankings that have not been computed yet", async () => {
    serve({ rankings: () => Response.json({ rankings: [] }) });
    renderRoute();

    expect(await screen.findByText("Aún no hay rankings")).toBeTruthy();
    expect(screen.queryByRole("tab")).toBeNull();
  });

  it("shows a permission state without requesting rankings when statistics.read is denied", async () => {
    const fetch = serve({ allowed: [] });
    renderRoute();

    expect(await screen.findByText("No tienes acceso a los rankings")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Volver a la competición" })).toBeTruthy();
    expect(fetch.mock.calls.some(([input]) => String(input).includes("/rankings"))).toBe(false);
  });

  it("treats an API refusal as a permission state, not an empty ranking", async () => {
    serve({ rankings: () => failure(403, "statistics.read_forbidden") });
    renderRoute();

    expect(await screen.findByText("No tienes acceso a los rankings")).toBeTruthy();
    expect(screen.queryByText("Aún no hay rankings")).toBeNull();
  });

  it("keeps rows without names when rosters are not readable", async () => {
    const fetch = serve({ allowed: ["statistics.read"] });
    renderRoute();

    expect(
      await screen.findByText(
        "Tu acceso no incluye las plantillas, así que no mostramos nombres de jugadores ni equipos.",
      ),
    ).toBeTruthy();
    expect(screen.getAllByText("Jugador sin nombre visible")).toHaveLength(3);
    expect(fetch.mock.calls.some(([input]) => String(input).includes("team-management"))).toBe(
      false,
    );
  });

  it("offers a retry for names and for a failed load", async () => {
    const user = userEvent.setup();
    let rosterFails = true;
    let rankingsFail = true;
    serve({
      rankings: () =>
        rankingsFail ? failure(503, "api.unavailable") : Response.json(rankingsFixture),
      roster: (teamId) =>
        rosterFails ? failure(503, "api.unavailable") : Response.json(teamDetailFixture(teamId)),
    });
    renderRoute();

    expect(await screen.findByText("No pudimos cargar los rankings.")).toBeTruthy();
    rankingsFail = false;
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(
      await screen.findByText("No pudimos cargar los nombres de jugadores y equipos."),
    ).toBeTruthy();
    rosterFails = false;
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Lucía Pérez")).toBeTruthy();
  });

  it("never brings back denied rankings when a refusal is followed by a failure", async () => {
    let next: () => Response = () => Response.json(rankingsFixture);
    serve({ rankings: () => next() });
    const queryClient = renderRoute();
    expect(await screen.findByText("Lucía Pérez")).toBeTruthy();

    next = () => failure(403, "statistics.read_forbidden");
    await refetchAll(queryClient);
    expect(await screen.findByText("No tienes acceso a los rankings")).toBeTruthy();

    next = () => failure(500, "api.internal_error");
    await refetchAll(queryClient);
    expect(screen.getByText("No tienes acceso a los rankings")).toBeTruthy();
    expect(screen.queryByText("Lucía Pérez")).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();

    next = () => failure(401, "auth.unauthenticated");
    await refetchAll(queryClient);
    expect(screen.getByText("No tienes acceso a los rankings")).toBeTruthy();
    expect(screen.queryByText("Lucía Pérez")).toBeNull();
  });

  it("keeps the last rankings only with an explicit refresh failure and retry", async () => {
    const user = userEvent.setup();
    let next: () => Response = () => Response.json(rankingsFixture);
    serve({ rankings: () => next() });
    const queryClient = renderRoute();
    expect(await screen.findByText("Lucía Pérez")).toBeTruthy();

    next = () => failure(503, "api.unavailable");
    await refetchAll(queryClient);
    expect(
      await screen.findByText(
        "No pudimos actualizar los rankings. Mostramos los últimos datos cargados.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Lucía Pérez")).toBeTruthy();

    next = () => Response.json(rankingsFixture);
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    await waitFor(() =>
      expect(
        screen.queryByText(
          "No pudimos actualizar los rankings. Mostramos los últimos datos cargados.",
        ),
      ).toBeNull(),
    );
    expect(screen.getByText("Lucía Pérez")).toBeTruthy();
  });

  it("keeps a cached empty result only with an explicit refresh failure", async () => {
    let next: () => Response = () => Response.json({ rankings: [] });
    serve({ rankings: () => next() });
    const queryClient = renderRoute();
    expect(await screen.findByText("Aún no hay rankings")).toBeTruthy();

    next = () => failure(503, "api.unavailable");
    await refetchAll(queryClient);
    expect(
      await screen.findByText(
        "No pudimos actualizar los rankings. Mostramos los últimos datos cargados.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Aún no hay rankings")).toBeTruthy();
  });

  it("drops roster names once a roster is refused, even if a later read fails", async () => {
    let roster: (teamId: string) => Response = (teamId) => Response.json(teamDetailFixture(teamId));
    serve({ roster: (teamId) => roster(teamId) });
    const queryClient = renderRoute();
    expect(await screen.findByText("Lucía Pérez")).toBeTruthy();

    roster = () => failure(403, "teams.roster_forbidden");
    await refetchAll(queryClient);
    await screen.findAllByText("Equipo sin nombre visible");
    expect(screen.queryByText("Lucía Pérez")).toBeNull();
    expect(screen.queryByText("Cuervos FC")).toBeNull();

    roster = () => failure(500, "api.internal_error");
    await refetchAll(queryClient);
    expect(screen.queryByText("Lucía Pérez")).toBeNull();
    expect(screen.queryByText("Cuervos FC")).toBeNull();
    expect(screen.getAllByText("Jugador sin nombre visible")).toHaveLength(3);
  });
});
