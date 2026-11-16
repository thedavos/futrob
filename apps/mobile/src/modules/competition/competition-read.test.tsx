import { AppState, type AppStateStatus } from "react-native";
import { createMobileQueryClient } from "@/modules/query/create-query-client";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  CompetitionTeamManagementDetailResponse,
  GetCurrentCompetitionFixtureResponse,
  MembershipSummaryDto,
} from "@futrob/api-contracts";
import * as SecureStore from "expo-secure-store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { MOBILE_PERMISSION } from "@/modules/authorization/permissions";
import { clearSession, saveSession } from "@/modules/identity/session-store";
import { profile, snapshot } from "@/modules/player-home/player-home.fixtures";
import { currentLocation, setTestScreenFocused } from "../../../test/expo-router";
import { installFakeApi, type FakeRoute } from "../../../test/fake-api";
import { cleanupApp, renderApp } from "../../../test/render-app";

const competitions = (() => {
  const source = snapshot().competitions;
  if (source.kind !== "ready") throw new Error("Fixture competitions must be ready");
  return source.data;
})();

const membership: MembershipSummaryDto = {
  organizationId: "org-1",
  organizationName: "Liga Norte",
  organizationSlug: "liga-norte",
  organizationLogo: { kind: "monogram" },
  role: "organizer",
};

const COMPETITION = "/organizations/org-1/competitions/competition-liga";
const ROOT = "/orgs/org-1/competitions/competition-liga";
const at = "2026-10-01T18:00:00.000Z";

const json = (data: unknown) => () => Response.json(data);

const team = (id: string, name: string) => ({
  team: { id, organizationId: "org-1", name, createdAt: at },
  entry: {
    id: `entry-${id}`,
    organizationId: "org-1",
    competitionId: "competition-liga",
    teamId: id,
    status: "approved" as const,
    createdAt: at,
  },
  roster: { state: "open" as const, memberCount: 1, maxSize: 23, lockedAt: null },
  externalClub: null,
});

const rayo: CompetitionTeamManagementDetailResponse = {
  ...team("t1", "Rayo"),
  members: [
    {
      membership: {
        id: "m1",
        organizationId: "org-1",
        competitionId: "competition-liga",
        teamId: "t1",
        playerProfileId: "p1",
        gameAccountId: null,
        role: "captain",
        createdAt: at,
      },
      presentation: { displayName: "Ana", avatarUrl: null, gameAccount: null },
    },
  ],
};

const fixture: GetCurrentCompetitionFixtureResponse = {
  fixture: {
    id: "plan-1",
    revision: 1,
    status: "active",
    generationKey: "gen-1",
    organizationId: "org-1",
    competitionId: "competition-liga",
    rulesVersion: 1,
    generationVersion: 1,
    format: "league",
    timeZone: "America/Lima",
    homeAndAway: false,
    seed: ["t1", "t2"],
    stages: [
      {
        id: "league",
        kind: "league",
        order: 1,
        rounds: [
          {
            id: "md-1",
            stageId: "league",
            number: 1,
            scheduledStartAt: at,
            encounters: [
              {
                id: "e-1",
                stageId: "league",
                roundId: "md-1",
                order: 1,
                home: { kind: "team", teamId: "t1" },
                away: { kind: "team", teamId: "t2" },
                scheduledStartAt: "2026-10-02T21:30:00.000Z",
                officialMatchCount: 1,
                series: null,
              },
            ],
          },
        ],
      },
    ],
  },
  teams: [
    { teamId: "t1", name: "Rayo" },
    { teamId: "t2", name: "Norte" },
  ],
};

function competitionApi(allowed: readonly string[], routes: Record<string, FakeRoute> = {}) {
  return installFakeApi({
    "/identity/onboarding": json({
      completed: true,
      completedAt: "2026-09-01T00:00:00.000Z",
      version: 1,
      path: "organization",
      currentStep: null,
    }),
    "/identity/account/deletion": json({ deletion: { status: "active" }, blockers: [] }),
    "/organizations/post-auth-destination": json({
      destination: { kind: "organization", organizationId: "org-1" },
      memberships: [membership],
    }),
    "/organizations/mine": json({ memberships: [membership] }),
    "/competitions/mine": json(competitions),
    "/players/me": json(profile),
    "/authorization/effective-access": json({
      actorId: "actor-1",
      scope: { organizationId: "org-1", competitionId: "competition-liga" },
      roles: [],
      permissions: allowed.map((permission) => ({
        permission,
        allowed: true,
        decidedAt: "competition",
      })),
    }),
    ...routes,
  });
}

beforeEach(async () => {
  await saveSession({
    token: "session-token",
    user: { id: "actor-1", name: "Ana", email: "ana@example.com" },
  });
});

afterEach(async () => {
  cleanupApp();
  await clearSession();
  await SecureStore.deleteItemAsync("futrob.mobile.language");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("competition read views", () => {
  it.each(["fixture", "bracket"])("shows the rescheduled encounter kickoff in %s", async (view) => {
    competitionApi([MOBILE_PERMISSION.competitionsRead], {
      [`${COMPETITION}/fixture`]: json({
        ...fixture,
        fixture: {
          ...fixture.fixture,
          stages: fixture.fixture!.stages.map((stage) => ({ ...stage, kind: "knockout" })),
        },
      }),
    });
    renderApp(`${ROOT}/${view}`);

    expect(await screen.findByText("Rayo vs Norte")).toBeTruthy();
    expect(screen.getByText(/^Final ·/)).toBeTruthy();
    expect(screen.getByText(/2 oct 2026, 16:30/)).toBeTruthy();
  });

  it("says there is no schedule yet instead of an empty list", async () => {
    competitionApi([MOBILE_PERMISSION.competitionsRead], {
      [`${COMPETITION}/fixture`]: json({ fixture: null, teams: [] }),
    });
    renderApp(`${ROOT}/fixture`);

    expect(await screen.findByText("Aún no hay calendario")).toBeTruthy();
  });

  it("refuses the standings without statistics.read and never asks for them", async () => {
    const api = competitionApi([MOBILE_PERMISSION.competitionsRead]);
    renderApp(`${ROOT}/standings`);

    expect(await screen.findByText("No tienes acceso a la clasificación")).toBeTruthy();
    expect(api.requests.some((request) => request.path.endsWith("/standings"))).toBe(false);
  });

  it("opens a team's roster from the teams list", async () => {
    const user = userEvent.setup();
    competitionApi([MOBILE_PERMISSION.competitionsRead, MOBILE_PERMISSION.teamsRead], {
      [`${COMPETITION}/team-management`]: json({ items: [team("t1", "Rayo")], nextCursor: null }),
      [`${COMPETITION}/team-management/t1`]: json(rayo),
    });
    renderApp(`${ROOT}/teams`);

    await user.click(await screen.findByRole("button", { name: "Rayo" }));

    expect(currentLocation()?.pathname).toBe(`${ROOT}/teams/t1`);
    expect(await screen.findByText("Ana")).toBeTruthy();
    expect(screen.getByText("Capitán")).toBeTruthy();
  });
});

for (const trigger of ["screen focus", "app active"] as const) {
  it(`refreshes stale competition data on ${trigger} without remounting`, async () => {
    const appStateListeners = new Set<(state: AppStateStatus) => void>();
    const appStateChanged = (state: AppStateStatus) => {
      for (const listener of [...appStateListeners]) listener(state);
    };
    vi.spyOn(AppState, "addEventListener").mockImplementation((_event, listener) => {
      appStateListeners.add(listener);
      return {
        remove: () => {
          appStateListeners.delete(listener);
        },
      };
    });
    const api = competitionApi([MOBILE_PERMISSION.competitionsRead], {
      [`${COMPETITION}/fixture`]: json(fixture),
    });
    const client = createMobileQueryClient();
    renderApp(`${ROOT}/fixture`, { queryClient: client });
    expect(await screen.findByText("Rayo vs Norte")).toBeTruthy();
    await act(async () => {
      setTestScreenFocused(false);
      appStateChanged("background");
      await client.invalidateQueries({ refetchType: "none" });
    });
    api.routes[`${COMPETITION}/fixture`] = json({
      ...fixture,
      teams: [
        { teamId: "t1", name: "Sur" },
        { teamId: "t2", name: "Norte" },
      ],
    });
    await act(async () => {
      if (trigger === "screen focus") setTestScreenFocused(true);
      else appStateChanged("active");
    });
    expect(await screen.findByText("Sur vs Norte")).toBeTruthy();
    expect(api.requests.filter((request) => request.path.endsWith("/fixture"))).toHaveLength(2);
    await waitFor(() => expect(client.isFetching()).toBe(0));
    client.clear();
  });
}
