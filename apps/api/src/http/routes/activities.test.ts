import { describe, expect, it } from "vite-plus/test";
import {
  completeOrganizationOnboardingResponseSchema,
  createRosterInvitationResponseSchema,
  createTeamResponseSchema,
  listActivitiesResponseSchema,
} from "@futrob/api-contracts";
import { createApp } from "@/app.ts";
import { InMemoryProviderMatchRepository } from "@/adapters/game-data/persistence/in-memory.repository.ts";
import { asCompetitionId } from "@futrob/shared-kernel";
import {
  AWAY,
  AWAY_CAPTAIN,
  COMPETITION,
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
    rescheduleProposalExpiryHours: 12,
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
        { kind: "competition_entry", status: "closed", subject: { teamName: "Halcones" } },
        { kind: "competition_entry", status: "closed", subject: { teamName: "Cuervos" } },
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
      ["competition_entry", false],
      ["competition_entry", false],
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
    expect(after.activities.map((row) => [row.kind, row.status])).toEqual([
      ["roster_invitation", "closed"],
      ["competition_entry", "closed"],
      ["competition_entry", "closed"],
    ]);

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
    expect(
      closed.activities.filter((row) => row.kind === "roster_invitation").map((row) => row.status),
    ).toEqual(["closed", "closed"]);
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

  it("lists a Team's proposal only in the competition where the actor captains that Team", async () => {
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
    // Same Team in a second league, where the captain of the first only plays.
    const otherLeague = asCompetitionId("comp-other-league");
    await modules.teams.repositories.rosters.add({
      id: "roster-away-captain-other-league",
      organizationId: ORG,
      competitionId: otherLeague,
      teamId: AWAY,
      playerProfileId: `profile-${AWAY_CAPTAIN}`,
      gameAccountId: null,
      role: "player",
      createdAt: new Date("2026-09-14T21:00:00.000Z"),
    });
    for (const [competitionId, proposalId] of [
      [COMPETITION, "proposal-captained"],
      [otherLeague, "proposal-only-played"],
    ] as const) {
      const recorded = await modules.notifications.recordActivity.execute({
        organizationId: ORG,
        competitionId,
        kind: "selection_confirmation",
        source: { name: "proposal", id: proposalId },
        resource: { type: "encounter", id: `enc-${proposalId}` },
        actorId: HOME_CAPTAIN,
        recipients: [{ audience: "team", audienceId: AWAY, requiresAction: true }],
      });
      expect(recorded.isOk()).toBe(true);
    }

    const pending = await activities(
      app,
      "/players/me/activities?status=open&requiresAction=true",
      AWAY_CAPTAIN,
    );
    expect(pending.activities.map((row) => row.resourceId)).toEqual(["enc-proposal-captained"]);
  });
  it("asks the organizer to decide an application and tells the applicant Team the decision", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-feed-entry-organizer";
    const approved = "actor-feed-entry-approved";
    const rejected = "actor-feed-entry-rejected";
    const created = await app.request("/api/v1/identity/onboarding/organization", {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({
        name: "Entry Org",
        competition: onboardingCompetition,
        gameAccount: null,
      }),
    });
    const { organizationId, competition } = await parseResponse(
      completeOrganizationOnboardingResponseSchema,
      created,
    );
    const competitionId = competition.competition.id;
    const base = `/api/v1/organizations/${organizationId}/competitions/${competitionId}`;
    const configured = await app.request(base, {
      method: "PATCH",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({
        ...onboardingCompetition,
        name: "Liga Entradas",
        rules: LEAGUE_RULES,
        teams: { min: 2, max: 4 },
        schedule: { startsOn: "2026-10-12", endsOn: "2026-12-20" },
      }),
    });
    expect(configured.status).toBe(200);
    const opened = await app.request(`${base}/registration/open`, {
      method: "POST",
      headers: serviceHeaders(organizer),
    });
    expect(opened.status).toBe(200);

    const apply = async (actorId: string, teamName: string) => {
      const response = await app.request(
        `/api/v1/competitions/explore/${competitionId}/application`,
        {
          method: "POST",
          headers: serviceHeaders(actorId),
          body: JSON.stringify({ teamName, creationKey: `apply-${teamName}-key-0001` }),
        },
      );
      expect(response.status).toBe(201);
      return (await response.json()) as { entryId: string };
    };
    const first = await apply(approved, "Aprobados");
    const second = await apply(rejected, "Rechazados");

    const pending = `/organizations/${organizationId}/activities?status=open&requiresAction=true`;
    const waiting = await activities(app, pending, organizer);
    expect(waiting.activities.map((row) => row.resourceId)).toEqual([competitionId, competitionId]);
    expect(waiting.activities.map((row) => `${row.kind}:${row.subject.teamName}`).sort()).toEqual([
      "competition_entry:Aprobados",
      "competition_entry:Rechazados",
    ]);
    // The applicant waits; nothing is asked of them.
    const mineAll = "/players/me/activities";
    expect((await activities(app, mineAll, approved)).activities).toEqual([]);

    const decide = (entryId: string, decision: "approve" | "reject") =>
      app.request(`${base}/entries/${entryId}/${decision}`, {
        method: "POST",
        headers: serviceHeaders(organizer),
      });
    expect((await decide(first.entryId, "approve")).status).toBe(200);
    expect((await decide(second.entryId, "reject")).status).toBe(200);

    expect((await activities(app, pending, organizer)).activities).toEqual([]);
    const feed = await activities(app, `/organizations/${organizationId}/activities`, organizer);
    // Facts of the same instant have no order between them.
    expect(
      feed.activities.map((row) => `${row.kind}:${row.status}:${row.subject.outcome}`).sort(),
    ).toEqual([
      "competition_entry:closed:null",
      "competition_entry:closed:null",
      "organizer_decision:closed:entry_approved",
      "organizer_decision:closed:entry_rejected",
    ]);
    expect(await activities(app, mineAll, approved)).toMatchObject({
      activities: [
        {
          kind: "organizer_decision",
          audience: "team",
          status: "closed",
          requiresAction: false,
          subject: {
            competitionName: "Liga Entradas",
            teamName: "Aprobados",
            outcome: "entry_approved",
          },
        },
      ],
    });
    expect(await activities(app, mineAll, rejected)).toMatchObject({
      activities: [{ kind: "organizer_decision", subject: { outcome: "entry_rejected" } }],
    });
    // Deciding twice does not decide again, nor repeat the fact.
    expect((await decide(first.entryId, "approve")).status).toBe(409);
    expect(
      (await activities(app, `/organizations/${organizationId}/activities`, organizer)).activities,
    ).toHaveLength(4);
  });
});
