import { describe, expect, it } from "vite-plus/test";
import {
  completeOrganizationOnboardingResponseSchema,
  createRosterInvitationResponseSchema,
  createTeamResponseSchema,
  listActivitiesResponseSchema,
} from "@futrob/api-contracts";
import { createApp } from "@/app.ts";
import { InMemoryProviderMatchRepository } from "@/adapters/game-data/persistence/in-memory.repository.ts";
import {
  AWAY_CAPTAIN,
  ENCOUNTER,
  HOME,
  HOME_CAPTAIN,
  OPERATOR,
  ORG,
  seedComposition,
  slot,
} from "@/di/official-selection.composition.fixture.ts";
import {
  INTERNAL_JOB_SECRET,
  buildApp,
  onboardingCompetition,
  serviceHeaders,
  stubFetch,
} from "@/http/http-app.harness.ts";
import { parseResponse } from "@/http/parse-response.ts";

const LEAGUE_RULES = {
  regularStage: {
    officialMatchesPerEncounter: 1,
    resolutionMode: "independent_matches",
    winPoints: 3,
    drawPoints: 1,
    lossPoints: 0,
    allowRescheduling: true,
    maxReschedulesPerTeam: 2,
    minimumRescheduleNoticeHours: 12,
    rescheduleRequiresOpponentApproval: true,
    rescheduleRequiresOrganizerApproval: false,
  },
  knockoutStage: null,
  maxRosterSize: 16,
};

type App = ReturnType<typeof buildApp>;

async function activities(app: App, path: string, actorId: string) {
  const response = await app.request(`/api/v1${path}`, { headers: serviceHeaders(actorId) });
  expect(response.status).toBe(200);
  return parseResponse(listActivitiesResponseSchema, response);
}

async function organizationWithTeams(app: App, organizer: string) {
  const created = await app.request("/api/v1/identity/onboarding/organization", {
    method: "POST",
    headers: serviceHeaders(organizer),
    body: JSON.stringify({
      name: "Feed Org",
      competition: onboardingCompetition,
      gameAccount: null,
    }),
  });
  const body = await parseResponse(completeOrganizationOnboardingResponseSchema, created);
  const organizationId = body.organizationId;
  const competitionId = body.competition.competition.id;
  await app.request(`/api/v1/organizations/${organizationId}/competitions/${competitionId}`, {
    method: "PATCH",
    headers: serviceHeaders(organizer),
    body: JSON.stringify({ ...onboardingCompetition, name: "Liga Feed", rules: LEAGUE_RULES }),
  });
  const teamIds: string[] = [];
  for (const name of ["Cuervos", "Halcones"]) {
    const team = await app.request(`/api/v1/organizations/${organizationId}/teams`, {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({ name, creationKey: `team:${name}` }),
    });
    const { id } = await parseResponse(createTeamResponseSchema, team);
    await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/participants`,
      {
        method: "POST",
        headers: serviceHeaders(organizer),
        body: JSON.stringify({ kind: "existing-team", teamId: id }),
      },
    );
    teamIds.push(id);
  }
  return { organizationId, competitionId, teamIds };
}

describe("apps/api http activities", () => {
  it("lists a publication for operators only and pages the organization feed", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-feed-organizer";
    const { organizationId, competitionId } = await organizationWithTeams(app, organizer);

    const published = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/publish`,
      { method: "POST", headers: serviceHeaders(organizer) },
    );
    expect(published.status).toBe(200);

    const feed = await activities(app, `/organizations/${organizationId}/activities`, organizer);
    expect(feed).toMatchObject({
      activities: [
        {
          kind: "competition_published",
          status: "closed",
          requiresAction: false,
          resourceType: "competition",
          resourceId: competitionId,
          subject: { competitionName: "Liga Feed" },
        },
      ],
      nextCursor: null,
    });
    const pending = await activities(
      app,
      `/organizations/${organizationId}/activities?status=open&requiresAction=true`,
      organizer,
    );
    expect(pending.activities).toEqual([]);

    const outsider = await app.request(`/api/v1/organizations/${organizationId}/activities`, {
      headers: serviceHeaders("actor-feed-outsider"),
    });
    expect(outsider.status).toBe(403);

    const tooMany = await app.request(
      `/api/v1/organizations/${organizationId}/activities?limit=51`,
      { headers: serviceHeaders(organizer) },
    );
    expect(tooMany.status).toBe(400);
    const badCursor = await app.request(
      `/api/v1/organizations/${organizationId}/activities?cursor=nope`,
      { headers: serviceHeaders(organizer) },
    );
    expect(badCursor.status).toBe(400);
    expect(await badCursor.json()).toMatchObject({ code: "notifications.invalid_cursor" });
  });

  it("asks only the invitee to answer a directed invitation and closes it on decline or accept", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-feed-invite-organizer";
    const invitee = "actor-feed-invitee";
    const { organizationId, competitionId, teamIds } = await organizationWithTeams(app, organizer);
    await app.request("/api/v1/identity/onboarding/player", {
      method: "POST",
      headers: serviceHeaders(invitee),
      body: JSON.stringify({
        gameAccount: { identifier: "feedinvitee", platform: "playstation", gameEdition: "FC 26" },
      }),
    });

    const created = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/teams/${teamIds[0]}/roster-invitations`,
      {
        method: "POST",
        headers: serviceHeaders(organizer),
        body: JSON.stringify({ role: "player", inviteeIdentifier: "feedinvitee" }),
      },
    );
    expect(created.status).toBe(201);
    const invitation = await parseResponse(createRosterInvitationResponseSchema, created);
    const link = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/teams/${teamIds[1]}/roster-invitations`,
      {
        method: "POST",
        headers: serviceHeaders(organizer),
        body: JSON.stringify({ role: "player" }),
      },
    );
    expect(link.status).toBe(201);

    const mine = "/players/me/activities?status=open&requiresAction=true";
    expect((await activities(app, mine, invitee)).activities).toMatchObject([
      {
        kind: "roster_invitation",
        audience: "actor",
        resourceId: invitation.invitationId,
        subject: { competitionName: "Liga Feed", teamName: "Cuervos" },
      },
    ]);
    expect((await activities(app, mine, "actor-feed-someone-else")).activities).toEqual([]);
    const watched = await activities(app, `/organizations/${organizationId}/activities`, organizer);
    expect(watched.activities.map((row) => [row.kind, row.requiresAction])).toEqual([
      ["roster_invitation", false],
    ]);

    const declined = await app.request(
      `/api/v1/roster-invitations/${invitation.invitationId}/respond`,
      {
        method: "POST",
        headers: serviceHeaders(invitee),
        body: JSON.stringify({ action: "decline" }),
      },
    );
    expect(declined.status).toBe(200);
    expect((await activities(app, mine, invitee)).activities).toEqual([]);
    const after = await activities(app, `/organizations/${organizationId}/activities`, organizer);
    expect(after.activities.map((row) => row.status)).toEqual(["closed"]);

    const second = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/teams/${teamIds[1]}/roster-invitations`,
      {
        method: "POST",
        headers: serviceHeaders(organizer),
        body: JSON.stringify({ role: "player", inviteeIdentifier: "feedinvitee" }),
      },
    );
    const { token } = await parseResponse(createRosterInvitationResponseSchema, second);
    expect((await activities(app, mine, invitee)).activities).toHaveLength(1);
    const accepted = await app.request("/api/v1/roster-invitations/accept", {
      method: "POST",
      headers: serviceHeaders(invitee),
      body: JSON.stringify({ token }),
    });
    expect(accepted.status).toBe(201);
    expect((await activities(app, mine, invitee)).activities).toEqual([]);
    const closed = await activities(app, `/organizations/${organizationId}/activities`, organizer);
    expect(closed.activities.map((row) => row.status)).toEqual(["closed", "closed"]);
  });

  it("lists a proposal for the rival captain, not for the proposer", async () => {
    const { modules } = await seedComposition({
      pool: undefined,
      matches: new InMemoryProviderMatchRepository(),
    });
    const app = createApp({
      modules,
      checkDbHealth: () => Promise.resolve("skipped"),
      internalJobSecret: INTERNAL_JOB_SECRET,
      correlationLogger: { info: () => {}, error: () => {} },
    });
    const proposed = await modules.officialSelection.propose.execute({
      actorId: HOME_CAPTAIN,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      actingTeamId: HOME,
      selections: slot("m-1"),
      expectedVersion: 0,
      commandKey: "propose",
    });
    expect(proposed.isOk()).toBe(true);

    const pending = "/players/me/activities?status=open&requiresAction=true";
    expect((await activities(app, pending, AWAY_CAPTAIN)).activities).toMatchObject([
      { kind: "selection_confirmation", audience: "team", resourceId: ENCOUNTER },
    ]);
    expect((await activities(app, pending, HOME_CAPTAIN)).activities).toEqual([]);
    expect(
      (await activities(app, `/organizations/${ORG}/activities`, OPERATOR)).activities,
    ).toMatchObject([{ kind: "selection_confirmation", requiresAction: false }]);
  });
});
