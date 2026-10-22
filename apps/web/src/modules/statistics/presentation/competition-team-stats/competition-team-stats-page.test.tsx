// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type {
  CompetitionTeamManagementListResponse,
  EffectiveAccessDto,
} from "@futrob/api-contracts";
import { STATISTICS_PERMISSION } from "@futrob/statistics";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
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

function renderPage() {
  return render(
    <QueryTestProvider>
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

  it("keeps the figures when team names fail to load", async () => {
    serve({
      [ACCESS_PATH]: () => Response.json(access(true)),
      [STATS_PATH]: () => Response.json({ teams: completeTeamStatsFixture }),
      [TEAMS_PATH]: () => failure(403, "competitions.participants_read_forbidden"),
    });
    renderPage();

    expect(
      await screen.findByText(
        "No pudimos cargar los nombres de los equipos. Las cifras siguen disponibles.",
      ),
    ).toBeTruthy();
    expect(screen.getAllByRole("rowheader")).toHaveLength(completeTeamStatsFixture.length);
  });
});
