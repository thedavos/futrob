// @vitest-environment jsdom

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
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
  readonly roster?: (teamId: string) => Response | Promise<Response>;
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

/** A viewport `widthRem` wide: `(min-width: Nrem)` queries match up to that width. */
function stubViewport(widthRem: number) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: Number(/min-width: ([\d.]+)rem/.exec(query)?.[1] ?? Infinity) <= widthRem,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
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

// Phones by default; tests that need a tablet or a wide desktop widen it.
beforeEach(() => stubViewport(30));

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

  it("summarizes the leader, the margin and the field of the open kind", async () => {
    serve();
    renderRoute();

    const summary = await screen.findByRole("region", { name: "Resumen del ranking" });
    // Leader and best per-90 rate (9 goals in 450 minutes = 1,8).
    await waitFor(() =>
      expect(within(summary).getAllByText("Lucía Pérez · Cuervos FC")).toHaveLength(2),
    );
    expect(within(summary).getByText("+3")).toBeTruthy();
    expect(
      within(summary).getByText(
        "Sobre Mateo Fernández de la Torre · Club Atlético Halcones del Pacífico",
      ),
    ).toBeTruthy();
    // Three ranked players from two named Teams (one row has no Team).
    expect(within(summary).getByText("De 2 equipos")).toBeTruthy();
    expect(within(summary).getByText("1,8")).toBeTruthy();
    expect(screen.getByText("Oficial")).toBeTruthy();
  });

  it("opens one player's place in every ranking in a bottom sheet on phones", async () => {
    const user = userEvent.setup();
    serve();
    renderRoute();

    await screen.findByText("Lucía Pérez");
    await user.click(screen.getByText("Lucía Pérez"));

    const sheet = await screen.findByRole("dialog", { name: "Lucía Pérez" });
    const standings = within(sheet).getAllByRole("listitem");
    expect(standings.map((item) => item.getAttribute("data-ranking-standing"))).toEqual([
      "scorer",
      "assister",
      "rating",
      "mvp",
      "goalkeeper",
    ]);
    expect(standings[0]!.getAttribute("aria-current")).toBe("true");
    expect(within(standings[0]!).getByText("1.º de 3")).toBeTruthy();
    expect(within(standings[0]!).getByText("1,8 por 90 min")).toBeTruthy();
    expect(within(standings[1]!).getByText("2.º de 2")).toBeTruthy();
    expect(within(standings[2]!).queryByText(/por 90 min/)).toBeNull();
    expect(within(standings[3]!).getByText("No clasifica")).toBeTruthy();

    await user.click(within(sheet).getByRole("button", { name: "Cerrar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const row = screen.getByText("Lucía Pérez").closest("tr");
    expect(row?.getAttribute("aria-selected")).toBe("false");
  });

  it("opens the detail in a dialog on tablets, without a side panel", async () => {
    const user = userEvent.setup();
    stubViewport(48);
    serve();
    renderRoute();

    await screen.findByText("Mateo Fernández de la Torre");
    expect(screen.queryByRole("complementary")).toBeNull();
    await user.click(screen.getByText("Mateo Fernández de la Torre"));
    const dialog = await screen.findByRole("dialog", { name: "Mateo Fernández de la Torre" });
    expect(within(dialog).getByText("Club Atlético Halcones del Pacífico")).toBeTruthy();
    expect(within(dialog).getByText("1.º de 2")).toBeTruthy();
  });

  it("keeps the detail beside the table on wide screens across kinds, even empty ones", async () => {
    const user = userEvent.setup();
    stubViewport(80);
    // Goalkeepers not computed yet; MVP computed with nobody in it.
    serve({
      rankings: () =>
        Response.json({
          rankings: rankingsFixture.rankings.filter((snapshot) => snapshot.kind !== "goalkeeper"),
        }),
    });
    renderRoute();

    const prompt = await screen.findByRole("complementary", { name: "Detalle del jugador" });
    expect(within(prompt).getByText("Selecciona un jugador")).toBeTruthy();

    await screen.findByText("Lucía Pérez");
    await user.click(screen.getByText("Lucía Pérez"));
    expect(screen.getByRole("complementary", { name: "Lucía Pérez" })).toBeTruthy();
    expect(screen.queryByRole("dialog")).toBeNull();

    const currentKind = () =>
      within(screen.getByRole("complementary", { name: "Lucía Pérez" }))
        .getAllByRole("listitem")
        .find((item) => item.getAttribute("aria-current") === "true");

    await user.click(screen.getByRole("tab", { name: "Asistencias" }));
    expect(currentKind()?.getAttribute("data-ranking-standing")).toBe("assister");

    await user.click(screen.getByRole("tab", { name: "MVP" }));
    expect(screen.getByText("Nadie entra todavía en este ranking")).toBeTruthy();
    expect(within(currentKind()!).getByText("No clasifica")).toBeTruthy();

    await user.click(screen.getByRole("tab", { name: "Porteros" }));
    expect(screen.getByText("Aún no hay rankings")).toBeTruthy();
    expect(within(currentKind()!).getByText("Sin calcular")).toBeTruthy();
  });

  it("waits for names before searching instead of announcing no matches", async () => {
    const user = userEvent.setup();
    let release = () => undefined as void;
    const rostersReady = new Promise<void>((resolve) => {
      release = resolve;
    });
    serve({
      roster: async (teamId) => {
        await rostersReady;
        return Response.json(teamDetailFixture(teamId));
      },
    });
    renderRoute();

    await screen.findByRole("table", { name: "Ranking de goleadores" });
    await user.type(screen.getByRole("searchbox", { name: "Buscar jugador" }), "mateo");
    expect(screen.getByText("Cargando nombres para buscar…")).toBeTruthy();
    expect(screen.queryByText("Ningún jugador coincide")).toBeNull();
    expect(screen.getByRole("searchbox", { name: "Buscar jugador" })).toHaveProperty(
      "value",
      "mateo",
    );

    release();
    expect(await screen.findByText("1 de 3 jugadores")).toBeTruthy();
    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(1);
    expect(within(rows[0]!).getAllByRole("cell")[0]?.textContent).toBe("2");
    expect(within(rows[0]!).getByText("Mateo Fernández de la Torre")).toBeTruthy();
  });

  it("does not rate goalkeeper saves per 90 minutes", async () => {
    serve();
    renderRoute("es", "goalkeeper");

    const summary = await screen.findByRole("region", { name: "Resumen del ranking" });
    expect(within(summary).getByText("No aplica")).toBeTruthy();
    expect(
      within(summary).getByText("Los minutos incluyen partidos fuera de la portería."),
    ).toBeTruthy();
  });

  it("filters players by name without renumbering and offers to clear a search with no match", async () => {
    const user = userEvent.setup();
    serve();
    renderRoute();

    await screen.findByText("Lucía Pérez");
    const search = screen.getByRole("searchbox", { name: "Buscar jugador" });
    await user.type(search, "mateo");
    const table = screen.getByRole("table", { name: "Ranking de goleadores" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(1);
    expect(within(rows[0]!).getAllByRole("cell")[0]?.textContent).toBe("2");
    expect(screen.getByText("1 de 3 jugadores")).toBeTruthy();

    await user.clear(search);
    await user.type(search, "zzz");
    expect(screen.getByText("Ningún jugador coincide")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(4);
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

  it("asks each row's Team for its roster, without a competition-wide roster gate", async () => {
    // Roster access is decided per Team: competition scope grants statistics only.
    const fetch = serve({ allowed: ["statistics.read"] });
    renderRoute();

    expect(await screen.findByText("Lucía Pérez")).toBeTruthy();
    expect(screen.getByText("Club Atlético Halcones del Pacífico")).toBeTruthy();
    const rosterPaths = fetch.mock.calls
      .map(([input]) => new URL(String(input), "https://web.test").pathname)
      .filter((path) => path.includes("team-management"))
      .sort();
    expect(rosterPaths).toEqual([
      `${BASE}/team-management/team-cuervos`,
      `${BASE}/team-management/team-halcones`,
    ]);
    const accessCalls = fetch.mock.calls.filter(([input]) =>
      String(input).includes("effective-access"),
    );
    expect(accessCalls.some(([input]) => String(input).includes("teams.roster.read"))).toBe(false);
  });

  it("hides only the names of a Team whose roster is refused", async () => {
    serve({
      allowed: ["statistics.read"],
      roster: (teamId) =>
        teamId === "team-halcones"
          ? failure(403, "teams.roster_forbidden")
          : Response.json(teamDetailFixture(teamId)),
    });
    const queryClient = renderRoute();

    expect(await screen.findByText("Lucía Pérez")).toBeTruthy();
    expect(screen.getByText("Cuervos FC")).toBeTruthy();
    expect(
      screen.getByText(
        "Tu acceso no incluye algunas plantillas, así que no mostramos los nombres de esos equipos ni de sus jugadores.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("Club Atlético Halcones del Pacífico")).toBeNull();
    expect(screen.queryByText("Mateo Fernández de la Torre")).toBeNull();
    expect(screen.getAllByText("Equipo sin nombre visible")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();

    // Per-Team reads live under the rankings scope, apart from Team management's cache.
    const rosterKeys = queryClient
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey)
      .filter((key) => key.includes("roster"));
    expect(rosterKeys).toEqual(
      expect.arrayContaining([
        ["statistics", "competition-rankings", "org-1", "competition-1", "roster", "team-cuervos"],
        ["statistics", "competition-rankings", "org-1", "competition-1", "roster", "team-halcones"],
      ]),
    );
  });

  it("keeps rows without names when every roster is refused", async () => {
    serve({ allowed: ["statistics.read"], roster: () => failure(403, "teams.roster_forbidden") });
    renderRoute();

    expect(
      await screen.findByText(
        "Tu acceso no incluye las plantillas, así que no mostramos nombres de jugadores ni equipos.",
      ),
    ).toBeTruthy();
    expect(screen.getAllByText("Jugador sin nombre visible")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
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
