// @vitest-environment jsdom

import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { EffectiveAccessDto, GetMyTeamsResponse } from "@futrob/api-contracts";
import { TEAM_PERMISSION } from "@futrob/teams";
import { I18nProvider } from "@/shared/presentation/i18n/i18n-provider.tsx";
import { QueryTestProvider } from "@/shared/presentation/query/query-test-utils.tsx";
import { teamManagementFixture } from "../competition-teams-view.fixtures.ts";
import { CaptainRosterPage } from "./captain-roster-page.tsx";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    params,
    children,
    ...props
  }: {
    to: string;
    params?: Record<string, string>;
    children?: ReactNode;
  }) => (
    <a
      href={to.replaceAll(/\$(\w+)/g, (_, key: string) => encodeURIComponent(params?.[key] ?? ""))}
      {...props}
    >
      {children}
    </a>
  ),
}));

const createdAt = "2026-08-11T00:00:00.000Z";
const TEAMS_PATH = "/api/v1/players/me/teams";
const ACCESS_PATH = "/api/v1/authorization/effective-access";
const DETAIL_PATH = "/api/v1/organizations/org-1/competitions/competition-1/team-management/team-1";

const PLAYER = [TEAM_PERMISSION.rosterRead];
const CAPTAIN = [
  TEAM_PERMISSION.rosterRead,
  TEAM_PERMISSION.rosterManage,
  TEAM_PERMISSION.rosterRolesManage,
  TEAM_PERMISSION.invitationsManage,
  TEAM_PERMISSION.externalClubManage,
];

function myTeams(competitionId = "competition-1"): GetMyTeamsResponse {
  return {
    activeRosterMembershipId: "member-1",
    teams: [
      {
        active: true,
        team: { id: "team-1", organizationId: "org-1", name: "Cuervos FC", createdAt },
        membership: {
          id: "member-1",
          organizationId: "org-1",
          competitionId,
          teamId: "team-1",
          playerProfileId: "player-1",
          gameAccountId: null,
          role: "player",
          createdAt,
        },
      },
    ],
  };
}

function serve(input: { readonly teams: GetMyTeamsResponse; readonly granted: readonly string[] }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const path = url.startsWith("http") ? new URL(url).pathname : url.split("?")[0];
      if (path === TEAMS_PATH) return Response.json(input.teams);
      if (path === ACCESS_PATH) {
        const query = new URL(url, "http://localhost").searchParams;
        const inTeamScope = query.get("teamId") === "team-1";
        const requested = (query.get("permissions") ?? "").split(",").filter(Boolean);
        const body: EffectiveAccessDto = {
          actorId: "actor-1",
          scope: {},
          roles: [],
          permissions: requested.map((permission) => ({
            permission,
            allowed: inTeamScope && input.granted.includes(permission),
            decidedAt: "team",
          })),
        };
        return Response.json(body);
      }
      if (path === DETAIL_PATH) return Response.json(teamManagementFixture());
      return Response.json({ code: "api.not_found" }, { status: 404 });
    }),
  );
}

function renderPage(
  page: "captain.roster" | "competitionPlayer.team",
  organizationId: string | null,
) {
  render(
    <QueryTestProvider>
      <I18nProvider initialLocale="es" persistLocale={async () => undefined}>
        <CaptainRosterPage
          competitionId="competition-1"
          organizationId={organizationId}
          page={page}
        />
      </I18nProvider>
    </QueryTestProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Mi equipo", () => {
  it.each([null, "org-1"] as const)(
    "shows the roster without management controls for a player in organization scope %s",
    async (organizationId) => {
      serve({ teams: myTeams(), granted: PLAYER });
      renderPage("competitionPlayer.team", organizationId);

      expect(await screen.findByRole("heading", { level: 1, name: "Mi equipo" })).toBeTruthy();
      expect(await screen.findByText("Dani Capitán")).toBeTruthy();
      expect(
        screen.getByText("Consulta la plantilla y el club de tu equipo en esta competición."),
      ).toBeTruthy();
      expect(screen.getByText("Vale Nueve")).toBeTruthy();
      expect(screen.getByText("Cuervos EA")).toBeTruthy();
      expect(screen.getByText("Capitán")).toBeTruthy();
      expect(screen.queryByRole("link", { name: "Invitar jugador" })).toBeNull();
      expect(screen.queryByRole("button", { name: "Cerrar plantilla" })).toBeNull();
      expect(screen.queryByLabelText("Rol de Vale Nueve")).toBeNull();
    },
  );

  it("keeps management controls when the same page is opened by a captain", async () => {
    serve({ teams: myTeams(), granted: CAPTAIN });
    renderPage("competitionPlayer.team", "org-1");

    expect(await screen.findByRole("heading", { level: 1, name: "Mi equipo" })).toBeTruthy();
    expect(await screen.findByRole("link", { name: "Invitar jugador" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cerrar plantilla" })).toBeTruthy();
    expect(screen.getByLabelText("Rol de Vale Nueve")).toBeTruthy();
  });

  it("explains a missing roster instead of the management table", async () => {
    serve({ teams: myTeams("other-competition"), granted: PLAYER });
    renderPage("competitionPlayer.team", null);

    expect(await screen.findByText("No tienes equipo en esta competición")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Revisar mis invitaciones" })).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("denies consultation without sending the reader back to this page", async () => {
    serve({ teams: myTeams(), granted: [] });
    renderPage("competitionPlayer.team", "org-1");

    expect(
      await screen.findByText("No puedes consultar la plantilla de este equipo."),
    ).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Ir a Mi equipo" })).toBeNull();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("still sends someone who cannot manage the roster to Mi equipo", async () => {
    serve({ teams: myTeams(), granted: PLAYER });
    renderPage("captain.roster", null);

    expect(
      await screen.findByText("Solo el capitán y el subcapitán pueden gestionar la plantilla."),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1, name: "Plantilla" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ir a Mi equipo" })).toBeTruthy();
  });
});
