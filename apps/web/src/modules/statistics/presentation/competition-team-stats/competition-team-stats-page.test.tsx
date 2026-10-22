// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type {
  CompetitionTeamManagementListResponse,
  EffectiveAccessDto,
} from "@futrob/api-contracts";
import { STATISTICS_PERMISSION } from "@futrob/statistics";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { queryKeys } from "@/shared/presentation/query/query-keys.ts";
import {
  createTestQueryClient,
  QueryTestProvider,
} from "@/shared/presentation/query/query-test-utils.tsx";
import {
  DEFAULT_TEAM_STATS_SORT,
  DEFAULT_TEAM_STATS_VIEW,
} from "./competition-team-stats-model.ts";
import { CompetitionTeamStatsRoute } from "./competition-team-stats-page.tsx";
import { completeTeamStatsFixture } from "./competition-team-stats.fixtures.ts";

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

const STATS_PATH = "/api/v1/organizations/org-1/competitions/competition-1/team-statistics";
const TEAMS_PATH = "/api/v1/organizations/org-1/competitions/competition-1/team-management";
const ACCESS_PATH = "/api/v1/authorization/effective-access";

const access = (allowed: boolean): EffectiveAccessDto => ({
  actorId: "actor-1",
  scope: { organizationId: "org-1", competitionId: "competition-1" },
  roles: [],
  permissions: [{ permission: STATISTICS_PERMISSION.read, allowed, decidedAt: "organization" }],
});

const teamList: CompetitionTeamManagementListResponse = {
  items: completeTeamStatsFixture.map((stats, index) => ({
    team: {
      id: stats.teamId,
      organizationId: "org-1",
      name: ["Cuervos FC", "Maderas FC", "Halcones"][index] ?? stats.teamId,
      createdAt: "2026-09-01T00:00:00.000Z",
    },
    entry: {
      id: `entry-${index}`,
      organizationId: "org-1",
      competitionId: "competition-1",
      teamId: stats.teamId,
      status: "approved",
      createdAt: "2026-09-01T00:00:00.000Z",
    },
    roster: { state: "closed", memberCount: 8, maxSize: 11, lockedAt: null },
    externalClub: null,
  })),
  nextCursor: null,
};

const failure = (status: number, code: string) =>
  Response.json({ code, messageKey: `errors.${code}` }, { status });

function serve(routes: Partial<Record<string, () => Response>>) {
  const fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), "https://web.test");
    const respond = routes[url.pathname];
    return respond ? respond() : failure(404, "api.not_found");
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

const paths = (fetch: ReturnType<typeof serve>) =>
  fetch.mock.calls.map(([input]) => new URL(String(input), "https://web.test").pathname);

function renderPage(client?: QueryClient) {
  return render(
    <QueryTestProvider client={client}>
      <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
        <CompetitionTeamStatsRoute
          competitionId="competition-1"
          onSortChange={() => undefined}
          onViewChange={() => undefined}
          organizationId="org-1"
          sort={DEFAULT_TEAM_STATS_SORT}
          view={DEFAULT_TEAM_STATS_VIEW}
        />
      </I18nProvider>
    </QueryTestProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CompetitionTeamStatsRoute", () => {
  it("reads official team statistics through the BFF and labels rows with team names", async () => {
    const fetch = serve({
      [ACCESS_PATH]: () => Response.json(access(true)),
      [STATS_PATH]: () => Response.json({ teams: completeTeamStatsFixture }),
      [TEAMS_PATH]: () => Response.json(teamList),
    });
    renderPage();

    const table = await screen.findByRole("table");
    expect(await within(table).findByRole("rowheader", { name: "Cuervos FC" })).toBeTruthy();
    expect(screen.getByText("Equipos con estadísticas")).toBeTruthy();
    expect(paths(fetch)).toEqual(expect.arrayContaining([ACCESS_PATH, STATS_PATH, TEAMS_PATH]));
  });

  it("does not request statistics when EffectiveAccess denies statistics.read", async () => {
    const fetch = serve({ [ACCESS_PATH]: () => Response.json(access(false)) });
    renderPage();

    expect(await screen.findByText("No tienes acceso a estas estadísticas")).toBeTruthy();
    expect(paths(fetch)).not.toContain(STATS_PATH);
  });

  it("shows the server refusal as a permission state, not as an empty list", async () => {
    serve({
      [ACCESS_PATH]: () => Response.json(access(true)),
      [STATS_PATH]: () => failure(403, "statistics.read_forbidden"),
    });
    renderPage();

    expect(await screen.findByText("No tienes acceso a estas estadísticas")).toBeTruthy();
    expect(screen.queryByText("Aún no hay estadísticas oficiales")).toBeNull();
  });

  it("offers a retry when the statistics read fails", async () => {
    serve({
      [ACCESS_PATH]: () => Response.json(access(true)),
      [STATS_PATH]: () => failure(503, "product_api.unreachable"),
    });
    renderPage();

    expect(await screen.findByText("No pudimos cargar las estadísticas de equipos.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
  });

  it("keeps the figures when the team names read is refused", async () => {
    serve({
      [ACCESS_PATH]: () => Response.json(access(true)),
      [STATS_PATH]: () => Response.json({ teams: completeTeamStatsFixture }),
      [TEAMS_PATH]: () => failure(403, "competitions.participants_read_forbidden"),
    });
    renderPage();

    expect(
      await screen.findByText(
        "No tienes acceso a los nombres de los equipos. Las cifras siguen disponibles.",
      ),
    ).toBeTruthy();
    expect(screen.getAllByRole("rowheader")).toHaveLength(completeTeamStatsFixture.length);
  });

  it("tells a failed names load apart from a refused one", async () => {
    serve({
      [ACCESS_PATH]: () => Response.json(access(true)),
      [STATS_PATH]: () => Response.json({ teams: completeTeamStatsFixture }),
      [TEAMS_PATH]: () => failure(503, "product_api.unreachable"),
    });
    renderPage();

    expect(
      await screen.findByText(
        "No pudimos cargar los nombres de los equipos. Las cifras siguen disponibles.",
      ),
    ).toBeTruthy();
    expect(
      screen.queryByText(
        "No tienes acceso a los nombres de los equipos. Las cifras siguen disponibles.",
      ),
    ).toBeNull();
    expect(screen.getAllByRole("rowheader")).toHaveLength(completeTeamStatsFixture.length);
  });

  describe("refetch after cached success", () => {
    const REFRESH_FAILED =
      "No pudimos actualizar las estadísticas. Se muestran los últimos datos cargados.";
    const NAMES_DENIED =
      "No tienes acceso a los nombres de los equipos. Las cifras siguen disponibles.";
    const NAMES_REFRESH_FAILED =
      "No pudimos actualizar los nombres de los equipos. Se muestran los últimos cargados.";
    const EMPTY = "Aún no hay estadísticas oficiales";
    const INITIAL_ERROR = "No pudimos cargar las estadísticas de equipos.";
    const UNAVAILABLE = () => failure(503, "product_api.unreachable");
    const retryButton = () => screen.getByRole("button", { name: "Reintentar" });
    const FORBIDDEN = "No tienes acceso a estas estadísticas";
    const statsKey = queryKeys.statistics.competitionTeams("org-1", "competition-1");
    const namesKey = queryKeys.teams.competitionManagementTeamNames("org-1", "competition-1");

    /** Serves a mutable response per path so a test can change the server's answer. */
    function switchable(initial: Record<string, () => Response>) {
      const current = { ...initial };
      serve(Object.fromEntries(Object.keys(current).map((path) => [path, () => current[path]!()])));
      return current;
    }

    async function renderLoaded(
      routes: Record<string, () => Response>,
      settled: () => Promise<unknown> = () =>
        screen.findByRole("rowheader", { name: "Cuervos FC" }),
    ) {
      const client = createTestQueryClient();
      const current = switchable(routes);
      renderPage(client);
      await settled();
      return { client, current };
    }

    const loaded = () => ({
      [ACCESS_PATH]: () => Response.json(access(true)),
      [STATS_PATH]: () => Response.json({ teams: completeTeamStatsFixture }),
      [TEAMS_PATH]: () => Response.json(teamList),
    });

    it.each([
      [403, "statistics.read_forbidden"],
      [401, "auth.unauthenticated"],
    ])("hides cached figures when the statistics read is refused with %i", async (status, code) => {
      const { client, current } = await renderLoaded(loaded());

      current[STATS_PATH] = () => failure(status, code);
      await client.refetchQueries({ queryKey: statsKey });

      expect(await screen.findByText(FORBIDDEN)).toBeTruthy();
      expect(screen.queryByRole("table")).toBeNull();
      expect(screen.queryByText("Cuervos FC")).toBeNull();
      expect(screen.queryByText(REFRESH_FAILED)).toBeNull();
      expect(client.getQueryData(statsKey)).toEqual({ kind: "refused", refusal: "forbidden" });
    });

    it("keeps cached figures with a warning when a refresh fails for a recoverable reason", async () => {
      const { client, current } = await renderLoaded(loaded());

      current[STATS_PATH] = () => failure(503, "product_api.unreachable");
      await client.refetchQueries({ queryKey: statsKey });

      expect(await screen.findByText(REFRESH_FAILED)).toBeTruthy();
      expect(screen.getByRole("rowheader", { name: "Cuervos FC" })).toBeTruthy();
    });

    it("shows the figures again once the statistics read is allowed again", async () => {
      const { client, current } = await renderLoaded(loaded());

      current[STATS_PATH] = () => failure(403, "statistics.read_forbidden");
      await client.refetchQueries({ queryKey: statsKey });
      expect(await screen.findByText(FORBIDDEN)).toBeTruthy();

      current[STATS_PATH] = () => Response.json({ teams: completeTeamStatsFixture });
      await client.refetchQueries({ queryKey: statsKey });
      expect(await screen.findByRole("rowheader", { name: "Cuervos FC" })).toBeTruthy();
      expect(screen.queryByText(FORBIDDEN)).toBeNull();
    });

    it("hides cached figures when EffectiveAccess stops allowing statistics.read", async () => {
      const { client, current } = await renderLoaded(loaded());

      current[ACCESS_PATH] = () => Response.json(access(false));
      await client.refetchQueries({ queryKey: queryKeys.authorization.all });

      expect(await screen.findByText(FORBIDDEN)).toBeTruthy();
      expect(screen.queryByRole("table")).toBeNull();
    });

    it.each([
      [403, "competitions.participants_read_forbidden"],
      [401, "auth.unauthenticated"],
    ])(
      "drops cached names but keeps the figures when the names read is refused with %i",
      async (status, code) => {
        const { client, current } = await renderLoaded(loaded());

        current[TEAMS_PATH] = () => failure(status, code);
        await client.refetchQueries({ queryKey: namesKey });

        expect(await screen.findByText(NAMES_DENIED)).toBeTruthy();
        await waitFor(() => expect(screen.queryByText("Cuervos FC")).toBeNull());
        expect(screen.getByRole("table")).toBeTruthy();
        expect(screen.getAllByRole("rowheader")).toHaveLength(completeTeamStatsFixture.length);
        expect(client.getQueryData(namesKey)).toEqual({ kind: "denied" });
      },
    );

    it("shows the names again once the names read is allowed again", async () => {
      const { client, current } = await renderLoaded(loaded());

      current[TEAMS_PATH] = () => failure(403, "competitions.participants_read_forbidden");
      await client.refetchQueries({ queryKey: namesKey });
      expect(await screen.findByText(NAMES_DENIED)).toBeTruthy();

      current[TEAMS_PATH] = () => Response.json(teamList);
      await client.refetchQueries({ queryKey: namesKey });
      expect(await screen.findByRole("rowheader", { name: "Cuervos FC" })).toBeTruthy();
      expect(screen.queryByText(NAMES_DENIED)).toBeNull();
    });

    describe("cached successful empty statistics", () => {
      const loadedEmpty = () => ({
        ...loaded(),
        [STATS_PATH]: () => Response.json({ teams: [] }),
      });
      const renderEmpty = () => renderLoaded(loadedEmpty(), () => screen.findByText(EMPTY));

      it("keeps the empty state and warns with a working retry when a refresh fails", async () => {
        const { client, current } = await renderEmpty();

        current[STATS_PATH] = () => UNAVAILABLE();
        await client.refetchQueries({ queryKey: statsKey });

        expect(await screen.findByText(REFRESH_FAILED)).toBeTruthy();
        expect(screen.getByText(EMPTY)).toBeTruthy();
        expect(screen.queryByText(INITIAL_ERROR)).toBeNull();
        expect(client.getQueryState(statsKey)?.status).toBe("error");

        current[STATS_PATH] = () => Response.json({ teams: [] });
        fireEvent.click(retryButton());
        await waitFor(() => expect(screen.queryByText(REFRESH_FAILED)).toBeNull());
        expect(screen.getByText(EMPTY)).toBeTruthy();
      });

      it("renders the recovered rows when the retry returns figures", async () => {
        const { client, current } = await renderEmpty();

        current[STATS_PATH] = () => UNAVAILABLE();
        await client.refetchQueries({ queryKey: statsKey });
        await screen.findByText(REFRESH_FAILED);

        current[STATS_PATH] = () => Response.json({ teams: completeTeamStatsFixture });
        fireEvent.click(retryButton());

        expect(await screen.findByRole("rowheader", { name: "Cuervos FC" })).toBeTruthy();
        expect(screen.queryByText(REFRESH_FAILED)).toBeNull();
        expect(screen.queryByText(EMPTY)).toBeNull();
      });

      it("lets a later refusal win over the cached empty state and its warning", async () => {
        const { client, current } = await renderEmpty();

        current[STATS_PATH] = () => UNAVAILABLE();
        await client.refetchQueries({ queryKey: statsKey });
        await screen.findByText(REFRESH_FAILED);

        current[STATS_PATH] = () => failure(403, "statistics.read_forbidden");
        await client.refetchQueries({ queryKey: statsKey });
        expect(await screen.findByText(FORBIDDEN)).toBeTruthy();
        expect(screen.queryByText(EMPTY)).toBeNull();

        current[STATS_PATH] = () => UNAVAILABLE();
        await client.refetchQueries({ queryKey: statsKey });
        expect(screen.getByText(FORBIDDEN)).toBeTruthy();
        expect(screen.queryByText(REFRESH_FAILED)).toBeNull();
        expect(screen.queryByText(EMPTY)).toBeNull();
      });
    });

    describe("cached team names", () => {
      it("keeps cached names and offers a working retry when a refresh fails", async () => {
        const { client, current } = await renderLoaded(loaded());

        current[TEAMS_PATH] = () => UNAVAILABLE();
        await client.refetchQueries({ queryKey: namesKey });

        expect(await screen.findByText(NAMES_REFRESH_FAILED)).toBeTruthy();
        expect(client.getQueryState(namesKey)?.status).toBe("error");
        expect(screen.getByRole("rowheader", { name: "Cuervos FC" })).toBeTruthy();
        expect(screen.queryByText(NAMES_DENIED)).toBeNull();
        expect(screen.queryByText(REFRESH_FAILED)).toBeNull();

        current[TEAMS_PATH] = () => Response.json(teamList);
        fireEvent.click(retryButton());
        await waitFor(() => expect(screen.queryByText(NAMES_REFRESH_FAILED)).toBeNull());
        expect(screen.getByRole("rowheader", { name: "Cuervos FC" })).toBeTruthy();
      });

      it("warns about a failed refresh of a successful empty names list", async () => {
        const { client, current } = await renderLoaded(
          { ...loaded(), [TEAMS_PATH]: () => Response.json({ items: [], nextCursor: null }) },
          () => screen.findAllByText("Equipo sin nombre disponible"),
        );

        current[TEAMS_PATH] = () => UNAVAILABLE();
        await client.refetchQueries({ queryKey: namesKey });

        expect(await screen.findByText(NAMES_REFRESH_FAILED)).toBeTruthy();
        expect(screen.getAllByRole("rowheader")).toHaveLength(completeTeamStatsFixture.length);

        current[TEAMS_PATH] = () => Response.json(teamList);
        fireEvent.click(retryButton());
        expect(await screen.findByRole("rowheader", { name: "Cuervos FC" })).toBeTruthy();
        expect(screen.queryByText(NAMES_REFRESH_FAILED)).toBeNull();
      });

      it.each([
        [401, "auth.unauthenticated"],
        [403, "competitions.participants_read_forbidden"],
        [404, "api.not_found"],
      ])(
        "keeps names hidden after a %i refusal through a later 503 until a fresh success",
        async (status, code) => {
          const { client, current } = await renderLoaded(loaded());

          current[TEAMS_PATH] = () => failure(status, code);
          await client.refetchQueries({ queryKey: namesKey });
          expect(await screen.findByText(NAMES_DENIED)).toBeTruthy();

          current[TEAMS_PATH] = () => UNAVAILABLE();
          await client.refetchQueries({ queryKey: namesKey });
          await waitFor(() => expect(client.getQueryState(namesKey)?.status).toBe("error"));
          expect(screen.getByText(NAMES_DENIED)).toBeTruthy();
          expect(screen.queryByText(NAMES_REFRESH_FAILED)).toBeNull();
          expect(screen.queryByText("Cuervos FC")).toBeNull();
          expect(screen.getAllByRole("rowheader")).toHaveLength(completeTeamStatsFixture.length);

          current[TEAMS_PATH] = () => Response.json(teamList);
          fireEvent.click(retryButton());
          expect(await screen.findByRole("rowheader", { name: "Cuervos FC" })).toBeTruthy();
          expect(screen.queryByText(NAMES_DENIED)).toBeNull();
        },
      );
    });
  });
});
