import { describe, expect, it } from "vite-plus/test";
import {
  completeOrganizationOnboardingResponseSchema,
  entryInvitationLinkResponseSchema,
  listActivitiesResponseSchema,
  publicEntryInvitationLinkSchema,
  sentEntryInvitationSchema,
} from "@futrob/api-contracts";
import {
  buildApp,
  INTERNAL_JOB_SECRET,
  onboardingCompetition,
  serviceHeaders,
  stubFetch,
} from "@/http/http-app.harness.ts";
import { parseResponse } from "@/http/parse-response.ts";

type App = ReturnType<typeof buildApp>;

async function competition(app: App, organizer: string, teams = { min: 2, max: 8 }) {
  const created = await app.request("/api/v1/identity/onboarding/organization", {
    method: "POST",
    headers: serviceHeaders(organizer),
    body: JSON.stringify({
      name: `Org ${organizer}`,
      competition: { ...onboardingCompetition, name: "Liga Interclubes", teams },
      gameAccount: null,
    }),
  });
  const body = await parseResponse(completeOrganizationOnboardingResponseSchema, created);
  const organizationId = body.organizationId;
  const competitionId = body.competition.competition.id;
  return {
    organizationId,
    competitionId,
    base: `/api/v1/organizations/${organizationId}/competitions/${competitionId}/entry-invitations`,
  };
}

async function player(app: App, actorId: string, gamertag: string) {
  const response = await app.request("/api/v1/players/me/game-accounts", {
    method: "POST",
    headers: serviceHeaders(actorId),
    body: JSON.stringify({ identifier: gamertag, platform: "playstation", gameEdition: "FC 26" }),
  });
  expect(response.status).toBe(201);
}

function post(app: App, path: string, actorId: string, body?: unknown) {
  return app.request(path, {
    method: "POST",
    headers: serviceHeaders(actorId),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("apps/api http entry invitations", () => {
  it("invites a player who accepts, names the team and becomes its approved captain", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-entry-organizer";
    const condor = "actor-entry-condor";
    const { organizationId, competitionId, base } = await competition(app, organizer);
    await player(app, condor, "Condor10");
    await player(app, "actor-entry-ricardo", "ricardo_9");

    const search = await app.request(`${base}/candidates?q=con`, {
      headers: serviceHeaders(organizer),
    });
    expect(await search.json()).toMatchObject({
      players: [
        {
          actorId: condor,
          gamertag: "Condor10",
          club: null,
          inCompetition: false,
          invitationPending: false,
        },
      ],
    });
    const tooShort = await app.request(`${base}/candidates?q=co`, {
      headers: serviceHeaders(organizer),
    });
    expect(tooShort.status).toBe(400);

    const sent = await post(app, base, organizer, {
      inviteeActorId: condor,
      inviteeLabel: "Condor10",
      message: "¡Hola! Nos gustaría contar con ustedes.",
    });
    expect(sent.status).toBe(201);
    const invitation = await parseResponse(sentEntryInvitationSchema, sent);

    const pendingFeed = await app.request(
      "/api/v1/players/me/activities?status=open&requiresAction=true",
      { headers: serviceHeaders(condor) },
    );
    expect(await parseResponse(listActivitiesResponseSchema, pendingFeed)).toMatchObject({
      activities: [
        {
          kind: "entry_invitation",
          resourceType: "entry_invitation",
          resourceId: invitation.id,
          subject: { competitionName: "Liga Interclubes" },
        },
      ],
    });
    const inbox = await app.request("/api/v1/players/me/entry-invitations", {
      headers: serviceHeaders(condor),
    });
    expect(await inbox.json()).toMatchObject({
      invitations: [
        {
          id: invitation.id,
          status: "pending",
          message: "¡Hola! Nos gustaría contar con ustedes.",
          competition: { id: competitionId, name: "Liga Interclubes" },
        },
      ],
    });

    const strangerPreview = await app.request(`/api/v1/entry-invitations/${invitation.id}`, {
      headers: serviceHeaders("actor-entry-ricardo"),
    });
    expect(strangerPreview.status).toBe(403);

    const acceptPath = `/api/v1/entry-invitations/${invitation.id}/accept`;
    const acceptBody = { teamName: "Cóndor FC", creationKey: "entry-accept-0001" };
    const accepted = await post(app, acceptPath, condor, acceptBody);
    expect(accepted.status).toBe(201);
    expect(await accepted.json()).toMatchObject({
      organizationId,
      competitionId,
      application: { status: "approved", teamName: "Cóndor FC" },
    });
    const retried = await post(app, acceptPath, condor, acceptBody);
    expect(retried.status).toBe(201);

    const participants = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/participants`,
      { headers: serviceHeaders(organizer) },
    );
    expect(await participants.json()).toMatchObject({
      participants: [{ status: "approved" }],
    });
    const mine = await app.request("/api/v1/competitions/mine", {
      headers: serviceHeaders(condor),
    });
    expect(await mine.json()).toMatchObject({
      competitions: [{ competition: { id: competitionId }, role: "captain" }],
    });
    const closedFeed = await app.request(
      "/api/v1/players/me/activities?status=open&requiresAction=true",
      { headers: serviceHeaders(condor) },
    );
    expect(await closedFeed.json()).toMatchObject({ activities: [] });

    const sentList = await app.request(base, { headers: serviceHeaders(organizer) });
    expect(await sentList.json()).toMatchObject({
      invitations: [{ id: invitation.id, status: "accepted", inviteeLabel: "Condor10" }],
    });
    const searchAfter = await app.request(`${base}/candidates?q=condor`, {
      headers: serviceHeaders(organizer),
    });
    expect(await searchAfter.json()).toMatchObject({ players: [{ inCompetition: true }] });
  });

  it("lets the invited player decline and the organizer revoke", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-entry-organizer-2";
    const { base } = await competition(app, organizer);
    await player(app, "actor-entry-decliner", "decliner");
    await player(app, "actor-entry-revoked", "revoked");

    const declined = await parseResponse(
      sentEntryInvitationSchema,
      await post(app, base, organizer, {
        inviteeActorId: "actor-entry-decliner",
        inviteeLabel: "decliner",
      }),
    );
    const decline = await post(
      app,
      `/api/v1/entry-invitations/${declined.id}/decline`,
      "actor-entry-decliner",
    );
    expect(decline.status).toBe(204);
    const acceptDeclined = await post(
      app,
      `/api/v1/entry-invitations/${declined.id}/accept`,
      "actor-entry-decliner",
      { teamName: "Tarde", creationKey: "entry-declined-0001" },
    );
    expect(acceptDeclined.status).toBe(409);
    expect(await acceptDeclined.json()).toMatchObject({
      code: "competitions.entry_invitation_already_decided",
    });

    const revoked = await parseResponse(
      sentEntryInvitationSchema,
      await post(app, base, organizer, {
        inviteeActorId: "actor-entry-revoked",
        inviteeLabel: "r",
      }),
    );
    const revoke = await app.request(`${base}/${revoked.id}`, {
      method: "DELETE",
      headers: serviceHeaders(organizer),
    });
    expect(revoke.status).toBe(204);
    const preview = await app.request(`/api/v1/entry-invitations/${revoked.id}`, {
      headers: serviceHeaders("actor-entry-revoked"),
    });
    expect(preview.status).toBe(400);
    expect(await preview.json()).toMatchObject({ code: "competitions.entry_invitation_revoked" });
  });

  it("rejects inviting someone without a player profile", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-entry-organizer-3";
    const { base } = await competition(app, organizer);

    const response = await post(app, base, organizer, {
      inviteeActorId: "actor-entry-ghost",
      inviteeLabel: "ghost",
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ code: "competitions.entry_invitee_not_found" });
  });

  it("shares one link that admits teams until the competition is full or it is regenerated", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-entry-organizer-4";
    const { base } = await competition(app, organizer, { min: 2, max: 2 });

    const link = await parseResponse(
      entryInvitationLinkResponseSchema,
      await post(app, `${base}/link`, organizer),
    );
    const again = await parseResponse(
      entryInvitationLinkResponseSchema,
      await post(app, `${base}/link`, organizer),
    );
    expect(again.link.code).toBe(link.link.code);
    expect(link.link.code).toMatch(/^[A-Za-z0-9_-]{12}$/);

    const linkPath = `/api/v1/entry-invitations/links/${link.link.code}`;
    const preview = await app.request(linkPath, { headers: serviceHeaders("actor-link-a") });
    expect(await preview.json()).toMatchObject({
      invitation: { channel: "link", status: "pending" },
      competition: { name: "Liga Interclubes", organizationName: `Org ${organizer}` },
      existing: null,
    });

    for (const [actor, team] of [
      ["actor-link-a", "Alfa"],
      ["actor-link-b", "Beta"],
    ] as const) {
      const joined = await post(app, `${linkPath}/accept`, actor, {
        teamName: team,
        creationKey: `link-accept-${team}`,
      });
      expect(joined.status).toBe(201);
    }
    const full = await post(app, `${linkPath}/accept`, "actor-link-c", {
      teamName: "Gamma",
      creationKey: "link-accept-Gamma",
    });
    expect(full.status).toBe(409);
    expect(await full.json()).toMatchObject({ code: "competitions.capacity_reached" });

    const regenerated = await parseResponse(
      entryInvitationLinkResponseSchema,
      await post(app, `${base}/link/regenerate`, organizer),
    );
    expect(regenerated.link.code).not.toBe(link.link.code);
    const oldLink = await app.request(linkPath, { headers: serviceHeaders("actor-link-c") });
    expect(oldLink.status).toBe(400);
    expect(await oldLink.json()).toMatchObject({ code: "competitions.entry_invitation_revoked" });
  });

  it("shows a link to a signed-out visitor until it is regenerated or the competition starts", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-entry-organizer-6";
    const { organizationId, competitionId, base } = await competition(app, organizer, {
      min: 2,
      max: 2,
    });
    const link = await parseResponse(
      entryInvitationLinkResponseSchema,
      await post(app, `${base}/link`, organizer),
    );
    const visit = (code: string) =>
      app.request(`/api/v1/internal/entry-invitations/links/${code}/public`, {
        headers: { Authorization: `Bearer ${INTERNAL_JOB_SECRET}` },
      });

    expect(
      await parseResponse(publicEntryInvitationLinkSchema, await visit(link.link.code)),
    ).toEqual({
      state: "open",
      competition: {
        name: "Liga Interclubes",
        organizationName: `Org ${organizer}`,
        platform: onboardingCompetition.platform,
        gameEdition: onboardingCompetition.gameEdition,
      },
    });
    expect(
      await parseResponse(publicEntryInvitationLinkSchema, await visit("unknown-code")),
    ).toEqual({ state: "unavailable", reason: "invalid" });
    const anonymous = await app.request(
      `/api/v1/internal/entry-invitations/links/${link.link.code}/public`,
    );
    expect(anonymous.status).toBe(401);

    for (const [actor, team] of [
      ["actor-public-a", "Alfa"],
      ["actor-public-b", "Beta"],
    ] as const) {
      const joined = await post(
        app,
        `/api/v1/entry-invitations/links/${link.link.code}/accept`,
        actor,
        {
          teamName: team,
          creationKey: `public-accept-${team}`,
        },
      );
      expect(joined.status).toBe(201);
    }
    const published = await post(
      app,
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/publish`,
      organizer,
    );
    expect(published.status).toBe(200);
    expect(
      await parseResponse(publicEntryInvitationLinkSchema, await visit(link.link.code)),
    ).toEqual({ state: "unavailable", reason: "closed" });
  });

  it("reports a regenerated link as invalid to a signed-out visitor", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-entry-organizer-7";
    const { base } = await competition(app, organizer);
    const link = await parseResponse(
      entryInvitationLinkResponseSchema,
      await post(app, `${base}/link`, organizer),
    );
    await post(app, `${base}/link/regenerate`, organizer);

    const visit = await app.request(
      `/api/v1/internal/entry-invitations/links/${link.link.code}/public`,
      { headers: { Authorization: `Bearer ${INTERNAL_JOB_SECRET}` } },
    );

    expect(await parseResponse(publicEntryInvitationLinkSchema, visit)).toEqual({
      state: "unavailable",
      reason: "invalid",
    });
  });

  it("offers every EA club the player declared as a name for the team", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-entry-organizer-8";
    const captain = "actor-entry-two-clubs";
    const { base } = await competition(app, organizer);
    await app.request("/api/v1/identity/onboarding/player", {
      method: "POST",
      headers: serviceHeaders(captain),
      body: JSON.stringify({ gameAccount: null }),
    });
    for (const [externalClubId, name] of [
      ["10754", "Fera Enjaulada"],
      ["20001", "Cóndor FC"],
    ] as const) {
      const declared = await post(app, "/api/v1/players/me/external-club", captain, {
        providerKey: "ea-clubs",
        externalClubId,
        platform: "common-gen5",
        gameEdition: "fc26",
        name,
        imageUrl: null,
      });
      expect(declared.status).toBeLessThan(300);
    }
    const link = await parseResponse(
      entryInvitationLinkResponseSchema,
      await post(app, `${base}/link`, organizer),
    );

    const preview = await app.request(`/api/v1/entry-invitations/links/${link.link.code}`, {
      headers: serviceHeaders(captain),
    });

    expect(await preview.json()).toMatchObject({
      suggestedTeamNames: expect.arrayContaining(["Fera Enjaulada", "Cóndor FC"]),
    });
  });

  it("keeps invitations to the competition's operators", async () => {
    const app = buildApp(stubFetch);
    const { base } = await competition(app, "actor-entry-organizer-5");

    const link = await post(app, `${base}/link`, "actor-entry-outsider");
    const search = await app.request(`${base}/candidates?q=abc`, {
      headers: serviceHeaders("actor-entry-outsider"),
    });

    expect(link.status).toBe(403);
    expect(search.status).toBe(403);
  });
});
