import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type {
  ActivityEntryDto,
  CompetitionTeamManagementDetailResponse,
  GetMyTeamsResponse,
  MembershipSummaryDto,
  OrganizationMemberDto,
  PlayerTeamMembershipDto,
} from "@futrob/api-contracts";
import * as SecureStore from "expo-secure-store";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { MOBILE_PERMISSION } from "@/modules/authorization/permissions";
import { clearSession, saveSession } from "@/modules/identity/session-store";
import { profile, snapshot } from "@/modules/player-home/player-home.fixtures";
import { currentLocation } from "../../../test/expo-router";
import { installFakeApi, type FakeRoute } from "../../../test/fake-api";
import { cleanupApp, renderApp } from "../../../test/render-app";

const date = "2026-09-01T00:00:00.000Z";

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

function team(
  id: string,
  name: string,
  competitionId: string,
  active = false,
): PlayerTeamMembershipDto {
  return {
    membership: {
      id,
      organizationId: "org-1",
      competitionId,
      teamId: `team-${id}`,
      playerProfileId: "profile-1",
      gameAccountId: null,
      role: "captain",
      createdAt: date,
    },
    team: { id: `team-${id}`, organizationId: "org-1", name, createdAt: date },
    active,
  };
}

const myTeams: GetMyTeamsResponse = {
  teams: [
    team("rm-tigres", "Tigres FC", "competition-copa"),
    team("rm-cuervos", "Cuervos FC", "competition-liga", true),
  ],
  activeRosterMembershipId: "rm-cuervos",
};

const teamDetail: CompetitionTeamManagementDetailResponse = {
  team: { id: "team-rm-cuervos", organizationId: "org-1", name: "Cuervos FC", createdAt: date },
  entry: {
    id: "entry-1",
    organizationId: "org-1",
    competitionId: "competition-liga",
    teamId: "team-rm-cuervos",
    status: "approved",
    createdAt: date,
  },
  roster: { state: "open", memberCount: 2, maxSize: 8, lockedAt: null },
  externalClub: null,
  members: [
    {
      membership: { ...myTeams.teams[1]!.membership, id: "rm-cuervos" },
      presentation: {
        displayName: "Davos",
        avatarUrl: null,
        gameAccount: { platform: "playstation", gameEdition: "fc27" },
      },
    },
    {
      membership: { ...myTeams.teams[1]!.membership, id: "rm-lucia", role: "player" },
      presentation: { displayName: "Lucía", avatarUrl: null, gameAccount: null },
    },
  ],
};

const members: OrganizationMemberDto[] = [
  {
    actorId: "actor-1",
    displayName: "Ana",
    email: "ana@example.com",
    role: "organizer",
    joinedAt: date,
    access: { kind: "inherited" },
  },
  {
    actorId: "actor-2",
    displayName: "Bruno",
    email: null,
    role: "staff",
    joinedAt: date,
    access: { kind: "inherited" },
  },
];

function activity(id: string, overrides: Partial<ActivityEntryDto> = {}): ActivityEntryDto {
  return {
    id,
    organizationId: "org-1",
    competitionId: "competition-liga",
    audience: "team",
    kind: "selection_confirmation",
    status: "open",
    requiresAction: true,
    resourceType: "encounter",
    resourceId: "encounter-1",
    subject: {
      competitionName: "Liga Futrob",
      encounterLabel: "Cuervos FC vs Tigres FC",
      teamName: "Cuervos FC",
      outcome: null,
    },
    openedAt: date,
    closedAt: null,
    expiresAt: null,
    lastEventAt: date,
    ...overrides,
  };
}

const json = (data: unknown) => () => Response.json(data);

function access(allowed: readonly string[]) {
  return {
    actorId: "actor-1",
    scope: { organizationId: "org-1" },
    roles: [],
    permissions: allowed.map((permission) => ({
      permission,
      allowed: true,
      decidedAt: "organization",
    })),
  };
}

function problem(status: number, code: string) {
  return Response.json(
    { code, messageKey: code, requestId: "8ef98de4-a8ab-4e88-a864-b36857421667" },
    { status },
  );
}

/** A signed-in organizer; `org` and `team` are the permissions each scope grants. */
function api(
  { org = [] as readonly string[], team: teamPermissions = [] as readonly string[] } = {},
  routes: Record<string, FakeRoute> = {},
) {
  return installFakeApi({
    "/identity/onboarding": json({
      completed: true,
      completedAt: date,
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
    "/players/me/teams": json(myTeams),
    "/authorization/effective-access": (url) =>
      Response.json(access(url.searchParams.get("teamId") ? teamPermissions : org)),
    ...routes,
  });
}

function bodyOf(init: RequestInit | undefined): unknown {
  return JSON.parse(String(init?.body));
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
});

describe("«Más» destinations", () => {
  it("offers My teams and Activity in the personal space", async () => {
    api();
    const user = userEvent.setup();
    renderApp("/player/more");

    await user.click(await screen.findByRole("button", { name: "Mis equipos" }));
    expect(currentLocation()?.pathname).toBe("/player/teams");
  });

  it("shows organization members and settings only with their permissions", async () => {
    api({ org: [MOBILE_PERMISSION.organizationsMembershipsRead] });
    renderApp("/orgs/org-1/more");

    expect(await screen.findByRole("button", { name: "Miembros" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Actividad" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ajustes" })).toBeNull();
  });

  it("leads from a competition to the actor's Team", async () => {
    api();
    const user = userEvent.setup();
    renderApp("/orgs/org-1/competitions/competition-liga/more");

    await user.click(await screen.findByRole("button", { name: "Mi equipo" }));
    expect(currentLocation()?.pathname).toBe("/orgs/org-1/competitions/competition-liga/team");
  });
});

describe("My teams", () => {
  it("lists the active Team first and makes another Team active", async () => {
    let active = "rm-cuervos";
    const fake = api(
      {},
      {
        "/players/me/teams": () =>
          Response.json({
            activeRosterMembershipId: active,
            teams: myTeams.teams.map((item) => ({
              ...item,
              active: item.membership.id === active,
            })),
          }),
        "/players/me/active-team": (_url, init) => {
          active = (bodyOf(init) as { rosterMembershipId: string }).rosterMembershipId;
          return Response.json({ actorId: "actor-1", rosterMembershipId: active, updatedAt: date });
        },
      },
    );
    const user = userEvent.setup();
    renderApp("/player/teams");

    const list = within(await screen.findByLabelText("Mis equipos", { selector: "[role=list]" }));
    const rows = await list.findAllByRole("button");
    expect(rows.map((row) => row.getAttribute("aria-label"))).toEqual(["Cuervos FC", "Tigres FC"]);
    expect(rows[0]).toHaveAttribute("aria-selected", "true");

    await user.click(rows[1]!);
    const dialog = within(await screen.findByRole("dialog"));
    await user.click(dialog.getByRole("button", { name: "Usar como equipo activo" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(fake.requests.some((request) => request.path === "/players/me/active-team")).toBe(true);
    expect(await screen.findByRole("button", { name: "Tigres FC" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("opens a Team's roster from its actions", async () => {
    api();
    const user = userEvent.setup();
    renderApp("/player/teams");

    await user.click(await screen.findByRole("button", { name: "Tigres FC" }));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", { name: "Ver plantilla" }),
    );
    expect(currentLocation()?.pathname).toBe("/orgs/org-1/competitions/competition-copa/team");
  });

  it("says so when the actor has no Team yet", async () => {
    api({}, { "/players/me/teams": json({ teams: [], activeRosterMembershipId: null }) });
    renderApp("/player/teams");

    expect(await screen.findByText("Todavía no estás en ningún equipo")).toBeInTheDocument();
  });
});

describe("Team roster", () => {
  const detailPath =
    "/organizations/org-1/competitions/competition-liga/team-management/team-rm-cuervos";
  const rosterPath = "/organizations/org-1/competitions/competition-liga/teams/team-rm-cuervos";
  const captain = [
    MOBILE_PERMISSION.teamsRosterRead,
    MOBILE_PERMISSION.teamsRosterManage,
    MOBILE_PERMISSION.teamsRosterRolesManage,
    MOBILE_PERMISSION.teamsInvitationsManage,
  ];

  it("shows the roster and lets the captain change a role", async () => {
    let lucia = "player";
    api(
      { team: captain },
      {
        [detailPath]: () =>
          Response.json({
            ...teamDetail,
            members: teamDetail.members.map((member) =>
              member.membership.id === "rm-lucia"
                ? { ...member, membership: { ...member.membership, role: lucia } }
                : member,
            ),
          }),
        [`${rosterPath}/roster/rm-lucia`]: (_url, init) => {
          lucia = (bodyOf(init) as { role: string }).role;
          return Response.json({ ...teamDetail.members[1]!.membership, role: lucia });
        },
      },
    );
    const user = userEvent.setup();
    renderApp("/orgs/org-1/competitions/competition-liga/team");

    expect(await screen.findByRole("heading", { name: "Cuervos FC" })).toBeInTheDocument();
    expect(await screen.findByText("Plantilla · 2 de 8")).toBeInTheDocument();
    expect(screen.getByText("Capitán · FC27")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Lucía" }));
    const dialog = within(await screen.findByRole("dialog"));
    await user.click(dialog.getByRole("button", { name: "Subcapitán" }));

    expect(await screen.findByText("Subcapitán · Sin cuenta de juego")).toBeInTheDocument();
  });

  it("creates a roster invitation link with the chosen role", async () => {
    let requested: unknown;
    api(
      { team: captain },
      {
        [detailPath]: json(teamDetail),
        [`${rosterPath}/roster-invitations`]: (_url, init) => {
          requested = bodyOf(init);
          return Response.json({
            invitationId: "invitation-1",
            organizationId: "org-1",
            competitionId: "competition-liga",
            teamId: "team-rm-cuervos",
            role: "vice_captain",
            status: "pending",
            expiresAt: "2026-09-08T00:00:00.000Z",
            createdAt: date,
            token: "roster-token",
          });
        },
      },
    );
    const user = userEvent.setup();
    renderApp("/orgs/org-1/competitions/competition-liga/team");

    await user.click(await screen.findByRole("button", { name: "Invitar jugador" }));
    const dialog = within(await screen.findByRole("dialog"));
    await user.click(dialog.getByRole("button", { name: "Subcapitán" }));
    await user.click(dialog.getByRole("button", { name: "Crear enlace" }));

    expect(
      await dialog.findByDisplayValue(/\/roster-invitations\/accept\/roster-token$/),
    ).toBeInTheDocument();
    expect(requested).toMatchObject({ role: "vice_captain" });
    expect(dialog.getByRole("button", { name: "Compartir enlace" })).toBeInTheDocument();
  });

  it("explains why a full roster cannot invite", async () => {
    api(
      { team: captain },
      {
        [detailPath]: json({
          ...teamDetail,
          roster: { ...teamDetail.roster, memberCount: 8 },
        }),
      },
    );
    renderApp("/orgs/org-1/competitions/competition-liga/team");

    expect(await screen.findByText("La plantilla está completa.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Invitar jugador" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("shows a player without roster access a permission state, and no actions", async () => {
    const fake = api({ team: [] });
    renderApp("/orgs/org-1/competitions/competition-liga/team");

    expect(await screen.findByText("No puedes ver esta plantilla")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Invitar jugador" })).toBeNull();
    expect(fake.requests.some((request) => request.path === detailPath)).toBe(false);
  });

  it("says so when the actor plays no Team in the competition", async () => {
    api({ team: captain });
    renderApp("/orgs/org-1/competitions/competition-otra/team");

    expect(await screen.findByText("No juegas en esta competición")).toBeInTheDocument();
  });
});

describe("Organization members", () => {
  const manager = [
    MOBILE_PERMISSION.organizationsMembershipsRead,
    MOBILE_PERMISSION.organizationsInvitationsManage,
    MOBILE_PERMISSION.organizationsRolesManage,
  ];

  it("lists members and explains why the last organizer keeps the role", async () => {
    api(
      { org: manager },
      {
        "/organizations/org-1/members": json({ members }),
        "/organizations/org-1/members/actor-1/role": () =>
          problem(409, "authorization.last_organizer"),
      },
    );
    const user = userEvent.setup();
    renderApp("/orgs/org-1/members");

    await user.click(await screen.findByRole("button", { name: "Ana" }));
    const dialog = within(await screen.findByRole("dialog"));
    await user.click(dialog.getByRole("button", { name: "Staff" }));

    expect(
      await dialog.findByText("La organización necesita al menos un organizador."),
    ).toBeInTheDocument();
  });

  it("creates an invitation link for the chosen organization role", async () => {
    let requested: unknown;
    api(
      { org: manager },
      {
        "/organizations/org-1/members": json({ members }),
        "/organizations/org-1/invitations": (_url, init) => {
          requested = bodyOf(init);
          return Response.json({
            invitationId: "invitation-1",
            token: "org-token",
            expiresAt: "2026-09-08T00:00:00.000Z",
            redeemPolicy: "single",
            maxRedemptions: null,
          });
        },
      },
    );
    const user = userEvent.setup();
    renderApp("/orgs/org-1/members");

    await user.click(await screen.findByRole("button", { name: "Invitar miembro" }));
    const dialog = within(await screen.findByRole("dialog"));
    await user.click(dialog.getByRole("button", { name: "Staff" }));
    await user.click(dialog.getByRole("button", { name: "Crear enlace" }));

    expect(
      await dialog.findByDisplayValue(/\/invitations\/accept\/org-token$/),
    ).toBeInTheDocument();
    expect(requested).toEqual({ role: "staff" });
  });

  it("shows a read-only list without role or invitation actions", async () => {
    api(
      { org: [MOBILE_PERMISSION.organizationsMembershipsRead] },
      { "/organizations/org-1/members": json({ members }) },
    );
    renderApp("/orgs/org-1/members");

    expect(await screen.findByText("Ana")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ana" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Invitar miembro" })).toBeNull();
  });

  it("shows a permission state without memberships access", async () => {
    api({ org: [] });
    renderApp("/orgs/org-1/members");

    expect(await screen.findByText("No puedes ver los miembros")).toBeInTheDocument();
  });
});

describe("Organization settings", () => {
  const profilePath = "/organizations/org-1";
  const stored = {
    organizationId: "org-1",
    name: "Liga Norte",
    slug: "liga-norte",
    timeZone: "America/Lima",
    logo: { kind: "monogram" },
  };

  it("saves only the changed fields", async () => {
    let requested: unknown;
    api(
      { org: [MOBILE_PERMISSION.organizationsUpdate] },
      {
        [profilePath]: (_url, init) => {
          if (init?.method === "PATCH") {
            requested = bodyOf(init);
            return Response.json({ ...stored, name: "Liga Sur" });
          }
          return Response.json(stored);
        },
      },
    );
    const user = userEvent.setup();
    renderApp("/orgs/org-1/settings");

    const name = await screen.findByLabelText("Nombre");
    await user.clear(name);
    await user.type(name, "Liga Sur");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Cambios guardados.")).toBeInTheDocument();
    expect(requested).toEqual({ name: "Liga Sur" });
  });

  it("explains a taken address", async () => {
    api(
      { org: [MOBILE_PERMISSION.organizationsUpdate] },
      {
        [profilePath]: (_url, init) =>
          init?.method === "PATCH"
            ? problem(409, "organizations.slug_conflict")
            : Response.json(stored),
      },
    );
    const user = userEvent.setup();
    renderApp("/orgs/org-1/settings");

    const slug = await screen.findByLabelText("Dirección");
    await user.clear(slug);
    await user.type(slug, "liga-sur");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(await screen.findByText("Esa dirección ya está en uso.")).toBeInTheDocument();
  });

  it("shows a permission state to who may not update the organization", async () => {
    api({ org: [MOBILE_PERMISSION.organizationsRead] });
    renderApp("/orgs/org-1/settings");

    expect(await screen.findByText("No puedes cambiar los ajustes")).toBeInTheDocument();
  });
});

describe("Activity", () => {
  it("pages through the organization feed and opens a row's Team", async () => {
    api(
      {},
      {
        "/organizations/org-1/activities": (url) =>
          Response.json(
            url.searchParams.get("cursor") === "page-2"
              ? {
                  activities: [activity("a-2", { kind: "competition_published" })],
                  nextCursor: null,
                }
              : { activities: [activity("a-1")], nextCursor: "page-2" },
          ),
      },
    );
    const user = userEvent.setup();
    renderApp("/orgs/org-1/activity");

    expect(await screen.findByText("Confirmar selección")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cargar más" }));
    expect(await screen.findByText("Competición publicada")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cargar más" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Confirmar selección" }));
    expect(currentLocation()?.pathname).toBe("/orgs/org-1/competitions/competition-liga/team");
  });

  it("shows a permission state when the organization feed is for operators only", async () => {
    api({}, { "/organizations/org-1/activities": () => problem(403, "authorization.forbidden") });
    renderApp("/orgs/org-1/activity");

    expect(await screen.findByText("No puedes ver esta actividad")).toBeInTheDocument();
  });

  it("explains an empty personal feed", async () => {
    api({}, { "/players/me/activities": json({ activities: [], nextCursor: null }) });
    renderApp("/player/activity");

    expect(
      await screen.findByText(
        "Aquí verás tus invitaciones y la actividad de los equipos que representas.",
      ),
    ).toBeInTheDocument();
  });

  it("offers a retry when the feed fails", async () => {
    let fail = true;
    api(
      {},
      {
        "/players/me/activities": () =>
          fail
            ? problem(503, "api.unavailable")
            : Response.json({ activities: [activity("a-1")], nextCursor: null }),
      },
    );
    const user = userEvent.setup();
    renderApp("/player/activity");

    expect(await screen.findByText("No se pudo cargar la actividad")).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Confirmar selección")).toBeInTheDocument();
  });
});
