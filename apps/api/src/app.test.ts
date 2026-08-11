import { describe, expect, it } from "vite-plus/test";
import type { CompetitionRulesDto } from "@futrob/api-contracts";
import searchClubsFixture from "@/adapters/game-data/ea-clubs/fixtures/search-clubs.json";
import clubInfoFixture from "@/adapters/game-data/ea-clubs/fixtures/club-info.json";
import { createApp } from "@/app.ts";
import type { CorrelationLogEntry } from "@/context/request-correlation.ts";
import { createModules } from "@/di/create-modules.ts";

const INTERNAL_JOB_SECRET = "test-internal-secret";
const correlationLogEntries: CorrelationLogEntry[] = [];

function createFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    return handler(url, init);
  }) as typeof fetch;
}

function buildApp(fetcher: typeof fetch) {
  const modules = createModules({
    fetcher,
    eaClubsBaseUrl: "https://proclubs.ea.com/api/fc",
    pool: undefined,
  });
  return createApp({
    modules,
    checkDbHealth: () => Promise.resolve("skipped"),
    internalJobSecret: INTERNAL_JOB_SECRET,
    correlationLogger: {
      info: (entry) => correlationLogEntries.push(entry),
      error: (entry) => correlationLogEntries.push(entry),
    },
  });
}

function serviceHeaders(actorId = "actor-test-1"): Record<string, string> {
  return {
    Authorization: `Bearer ${INTERNAL_JOB_SECRET}`,
    "X-Futrob-Actor-Id": actorId,
    "Content-Type": "application/json",
  };
}

const stubFetch = createFetch(() => Response.json([]));
const onboardingCompetition = {
  name: "Copa Inicial",
  gameEdition: "FC 26",
  platform: "playstation",
  region: "south-america",
  timeZone: "America/Lima",
  format: "league",
};

describe("apps/api", () => {
  it("GET /api/v1/meta/ping returns the ping contract", async () => {
    const app = buildApp(stubFetch);

    const res = await app.request("/api/v1/meta/ping");

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, service: "futrob", apiVersion: "v1" });
  });

  it("responds to CORS preflight from the local web origin", async () => {
    const app = buildApp(stubFetch);

    const res = await app.request("/api/v1/game-data/clubs/search", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "X-Request-ID",
      },
    });

    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
    expect(res.headers.get("access-control-allow-headers")).toContain("X-Request-ID");
    expect(res.headers.get("access-control-expose-headers")).toContain("X-Request-ID");
  });

  it("GET /api/v1/meta/health reports db skipped without DATABASE_URL", async () => {
    const app = buildApp(stubFetch);

    const res = await app.request("/api/v1/meta/health");

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, db: "skipped" });
  });

  it("GET /api/v1/openapi.json serves the contract document", async () => {
    const app = buildApp(stubFetch);

    const res = await app.request("/api/v1/openapi.json");

    expect(res.status).toBe(200);
    const doc = (await res.json()) as { openapi: string };
    expect(doc.openapi).toBe("3.1.0");
  });

  it("rejects direct game-data requests without service authentication before provider egress", async () => {
    const requestId = "2c574fb9-091d-433f-b9f4-cc6e1b86f860";
    let providerCalls = 0;
    const app = buildApp(
      createFetch(() => {
        providerCalls += 1;
        return Response.json(searchClubsFixture);
      }),
    );

    const paths = [
      "/api/v1/game-data/clubs/search?query=Fera",
      "/api/v1/game-data/clubs/10754",
      "/api/v1/game-data/clubs/10754/matches",
    ];
    for (const path of paths) {
      const res = await app.request(path, { headers: { "X-Request-ID": requestId } });
      expect(res.status).toBe(401);
      expect(res.headers.get("x-request-id")).toBe(requestId);
      expect(await res.json()).toMatchObject({ code: "api.unauthorized", requestId });
    }
    expect(providerCalls).toBe(0);
  });

  it("rejects an incorrect game-data service secret before provider egress", async () => {
    const requestId = "47565055-641b-4e30-b5cf-0978fc9b3647";
    let providerCalls = 0;
    const app = buildApp(
      createFetch(() => {
        providerCalls += 1;
        return Response.json(searchClubsFixture);
      }),
    );

    const res = await app.request("/api/v1/game-data/clubs/search?query=Fera", {
      headers: {
        ...serviceHeaders(),
        Authorization: "Bearer incorrect-secret",
        "X-Request-ID": requestId,
      },
    });

    expect(res.status).toBe(401);
    expect(res.headers.get("x-request-id")).toBe(requestId);
    expect(await res.json()).toMatchObject({ code: "api.unauthorized", requestId });
    expect(providerCalls).toBe(0);
  });

  it("rejects a game-data request without an actor before provider egress", async () => {
    const requestId = "4e22bf7a-59bd-4732-9b09-4c634cfab65a";
    let providerCalls = 0;
    const app = buildApp(
      createFetch(() => {
        providerCalls += 1;
        return Response.json(searchClubsFixture);
      }),
    );

    const res = await app.request("/api/v1/game-data/clubs/search?query=Fera", {
      headers: {
        Authorization: `Bearer ${INTERNAL_JOB_SECRET}`,
        "X-Request-ID": requestId,
      },
    });

    expect(res.status).toBe(401);
    expect(res.headers.get("x-request-id")).toBe(requestId);
    expect(await res.json()).toMatchObject({ code: "api.missing_actor", requestId });
    expect(providerCalls).toBe(0);
  });

  it("GET /api/v1/game-data/clubs/search maps EA results to DTOs", async () => {
    const requestId = "2d81f9de-55a8-4f4b-9962-86f63145def0";
    const app = buildApp(
      createFetch((url) => {
        expect(url).toContain("/allTimeLeaderboard/search");
        expect(url).toContain("clubName=Fera");
        return Response.json(searchClubsFixture);
      }),
    );

    const res = await app.request("/api/v1/game-data/clubs/search?query=Fera", {
      headers: { ...serviceHeaders(), "X-Request-ID": requestId },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBe(requestId);
    const body = (await res.json()) as { clubs: Array<{ externalClubId: string; name: string }> };
    expect(body.clubs[0]?.externalClubId).toBe("10754");
    expect(body.clubs[0]?.name).toBe("Fera Enjaulada");
    expect(correlationLogEntries).toContainEqual(
      expect.objectContaining({
        event: "provider.request.completed",
        provider: "ea-clubs",
        requestId,
        status: 200,
      }),
    );
  });

  it("GET /api/v1/game-data/clubs/search rejects a missing query with 400", async () => {
    const app = buildApp(stubFetch);

    const res = await app.request("/api/v1/game-data/clubs/search", {
      headers: { ...serviceHeaders(), "X-Request-ID": "not-a-safe-request-id" },
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string; requestId?: string };
    expect(body).toMatchObject({ code: "api.validation_error" });
    expect(body.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(res.headers.get("x-request-id")).toBe(body.requestId);
    expect(body.requestId).not.toBe("not-a-safe-request-id");
  });

  it("GET /api/v1/game-data/clubs/search surfaces EA HTTP failures as 502", async () => {
    const requestId = "2f0bb3a7-a7fb-446a-a6c7-81747db676b6";
    const app = buildApp(createFetch(() => new Response("nope", { status: 503 })));

    const res = await app.request("/api/v1/game-data/clubs/search?query=Fera", {
      headers: { ...serviceHeaders(), "X-Request-ID": requestId },
    });

    expect(res.status).toBe(502);
    expect(res.headers.get("x-request-id")).toBe(requestId);
    expect((await res.json()) as { code: string }).toMatchObject({
      code: "game_data.ea_clubs_http_error",
      requestId,
    });
  });

  it("includes request correlation on onboarding authentication errors", async () => {
    const requestId = "c0d7d9f3-e73b-4ccf-8780-7f647356f506";
    const app = buildApp(stubFetch);

    const res = await app.request("/api/v1/identity/onboarding", {
      headers: { "X-Request-ID": requestId },
    });

    expect(res.status).toBe(401);
    expect(res.headers.get("x-request-id")).toBe(requestId);
    expect(await res.json()).toMatchObject({ code: "api.unauthorized", requestId });
  });

  it("organization resources do not complete onboarding implicitly", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-organizer";
    const staff = "actor-staff";

    const created = await app.request("/api/v1/organizations", {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({ name: "Liga Test" }),
    });
    expect(created.status).toBe(201);
    const createdBody = (await created.json()) as { organizationId: string };
    expect(createdBody.organizationId).toBeTruthy();

    const mine = await app.request("/api/v1/organizations/mine", {
      headers: serviceHeaders(organizer),
    });
    expect(mine.status).toBe(200);
    expect(await mine.json()).toMatchObject({
      memberships: [
        {
          organizationId: createdBody.organizationId,
          organizationName: "Liga Test",
          role: "organizer",
        },
      ],
    });

    const destination = await app.request("/api/v1/organizations/post-auth-destination", {
      headers: serviceHeaders(organizer),
    });
    expect(destination.status).toBe(200);
    expect(await destination.json()).toMatchObject({
      destination: { kind: "onboarding" },
    });

    const invite = await app.request(
      `/api/v1/organizations/${createdBody.organizationId}/invitations`,
      {
        method: "POST",
        headers: serviceHeaders(organizer),
        body: JSON.stringify({ role: "staff" }),
      },
    );
    expect(invite.status).toBe(201);
    const inviteBody = (await invite.json()) as { token: string };

    const accepted = await app.request("/api/v1/organizations/invitations/accept", {
      method: "POST",
      headers: serviceHeaders(staff),
      body: JSON.stringify({ token: inviteBody.token }),
    });
    expect(accepted.status).toBe(200);
    expect(await accepted.json()).toMatchObject({
      organizationId: createdBody.organizationId,
      role: "staff",
    });

    const staffOnboarding = await app.request("/api/v1/identity/onboarding", {
      headers: serviceHeaders(staff),
    });
    expect(await staffOnboarding.json()).toMatchObject({
      completed: false,
      path: null,
    });
  });

  it("organization invitations: a multi redeemPolicy invitation admits up to maxRedemptions distinct actors", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-multi-organizer";

    const created = await app.request("/api/v1/organizations", {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({ name: "Liga Multi" }),
    });
    expect(created.status).toBe(201);
    const { organizationId } = (await created.json()) as { organizationId: string };

    const invite = await app.request(`/api/v1/organizations/${organizationId}/invitations`, {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({ role: "staff", redeemPolicy: "multi", maxRedemptions: 2 }),
    });
    expect(invite.status).toBe(201);
    const inviteBody = (await invite.json()) as {
      token: string;
      redeemPolicy: string;
      maxRedemptions: number | null;
    };
    expect(inviteBody).toMatchObject({ redeemPolicy: "multi", maxRedemptions: 2 });

    const acceptAs = (actorId: string) =>
      app.request("/api/v1/organizations/invitations/accept", {
        method: "POST",
        headers: serviceHeaders(actorId),
        body: JSON.stringify({ token: inviteBody.token }),
      });

    const first = await acceptAs("actor-multi-staff-1");
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ organizationId, role: "staff" });

    const second = await acceptAs("actor-multi-staff-2");
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({ organizationId, role: "staff" });

    const third = await acceptAs("actor-multi-staff-3");
    expect(third.status).toBe(409);
    expect(await third.json()).toMatchObject({ code: "organizations.invitation_exhausted" });

    const firstAgain = await acceptAs("actor-multi-staff-1");
    expect(firstAgain.status).toBe(200);
    expect(await firstAgain.json()).toMatchObject({ organizationId, role: "staff" });
  });

  it("onboarding: retries organization completion without duplicating it", async () => {
    const app = buildApp(stubFetch);
    const actor = "actor-idempotent-organizer";
    const request = () =>
      app.request("/api/v1/identity/onboarding/organization", {
        method: "POST",
        headers: serviceHeaders(actor),
        body: JSON.stringify({
          name: "Liga Única",
          competition: onboardingCompetition,
          gameAccount: {
            identifier: "OrganizerEA",
            platform: "xbox",
            gameEdition: "FC 27",
          },
        }),
      });

    const first = await request();
    const retried = await request();
    const firstBody = (await first.json()) as {
      organizationId: string;
      competition: { competition: { id: string } };
    };
    const retriedBody = (await retried.json()) as { organizationId: string };
    expect(retriedBody.organizationId).toBe(firstBody.organizationId);
    expect(retriedBody).toMatchObject({
      competition: { competition: { name: "Copa Inicial", status: "draft" } },
      destination: { kind: "competition-setup" },
      gameAccount: {
        identifier: "OrganizerEA",
        platform: "xbox",
        gameEdition: "FC 27",
      },
    });

    const draft = await app.request(
      `/api/v1/organizations/${firstBody.organizationId}/competitions/${firstBody.competition.competition.id}`,
      { headers: serviceHeaders(actor) },
    );
    expect(draft.status).toBe(200);
    expect(await draft.json()).toMatchObject({
      competition: { name: "Copa Inicial", organizationId: firstBody.organizationId },
      rules: { version: 1, awayGoalsEnabled: false },
    });

    const forbidden = await app.request(
      `/api/v1/organizations/${firstBody.organizationId}/competitions/${firstBody.competition.competition.id}`,
      { headers: serviceHeaders("actor-outsider") },
    );
    expect(forbidden.status).toBe(403);

    const mine = await app.request("/api/v1/organizations/mine", {
      headers: serviceHeaders(actor),
    });
    const mineBody = (await mine.json()) as { memberships: unknown[] };
    expect(mineBody.memberships).toHaveLength(1);

    const profile = await app.request("/api/v1/players/me", {
      headers: serviceHeaders(actor),
    });
    const profileBody = (await profile.json()) as { gameAccounts: unknown[] };
    expect(profileBody.gameAccounts).toHaveLength(1);

    const status = await app.request("/api/v1/identity/onboarding", {
      headers: serviceHeaders(actor),
    });
    expect(await status.json()).toMatchObject({
      completed: true,
      path: "organization",
      version: 3,
    });
  });

  it("organizations: checks and enforces globally unique normalized names", async () => {
    const app = buildApp(stubFetch);
    const firstActor = "actor-name-owner";

    const initiallyAvailable = await app.request("/api/v1/organizations/name-availability", {
      method: "POST",
      headers: serviceHeaders(firstActor),
      body: JSON.stringify({ name: "Liga Global" }),
    });
    expect(await initiallyAvailable.json()).toEqual({ available: true });

    const created = await app.request("/api/v1/organizations", {
      method: "POST",
      headers: serviceHeaders(firstActor),
      body: JSON.stringify({ name: "Liga  Global" }),
    });
    expect(created.status).toBe(201);

    const unavailable = await app.request("/api/v1/organizations/name-availability", {
      method: "POST",
      headers: serviceHeaders("actor-name-contender"),
      body: JSON.stringify({ name: "  LIGA GLOBAL  " }),
    });
    expect(await unavailable.json()).toEqual({ available: false });

    const duplicate = await app.request("/api/v1/organizations", {
      method: "POST",
      headers: serviceHeaders("actor-name-contender"),
      body: JSON.stringify({ name: "liga global" }),
    });
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toMatchObject({ code: "organizations.name_conflict" });
  });

  it("onboarding: requires completion before personal destination and persists progress", async () => {
    const app = buildApp(stubFetch);
    const actor = "actor-personal";

    const initialStatus = await app.request("/api/v1/identity/onboarding", {
      headers: serviceHeaders(actor),
    });
    expect(initialStatus.status).toBe(200);
    expect(await initialStatus.json()).toEqual({
      completed: false,
      completedAt: null,
      version: null,
      path: null,
      currentStep: "intention",
    });

    const progress = await app.request("/api/v1/identity/onboarding", {
      method: "PATCH",
      headers: serviceHeaders(actor),
      body: JSON.stringify({ path: "player", currentStep: "game-account" }),
    });
    expect(progress.status).toBe(200);
    expect(await progress.json()).toEqual({
      completed: false,
      completedAt: null,
      version: null,
      path: "player",
      currentStep: "game-account",
    });

    const resumed = await app.request("/api/v1/identity/onboarding", {
      headers: serviceHeaders(actor),
    });
    expect(await resumed.json()).toMatchObject({
      completed: false,
      path: "player",
      currentStep: "game-account",
    });

    const initialDestination = await app.request("/api/v1/organizations/post-auth-destination", {
      headers: serviceHeaders(actor),
    });
    expect(await initialDestination.json()).toMatchObject({
      destination: { kind: "onboarding" },
    });

    const completed = await app.request("/api/v1/identity/onboarding/player", {
      method: "POST",
      headers: serviceHeaders(actor),
      body: JSON.stringify({ gameAccount: null }),
    });
    expect(completed.status).toBe(200);
    expect(await completed.json()).toMatchObject({
      destination: "personal",
      gameAccount: null,
      externalClub: null,
    });

    const personalDestination = await app.request("/api/v1/organizations/post-auth-destination", {
      headers: serviceHeaders(actor),
    });
    expect(await personalDestination.json()).toMatchObject({
      destination: { kind: "personal" },
    });
  });

  it("onboarding: completes the player path with an idempotent EA game account", async () => {
    const app = buildApp(stubFetch);
    const actor = "actor-player-profile";
    const body = JSON.stringify({
      gameAccount: {
        identifier: "Gamer23",
        platform: "nintendo-switch-2",
        gameEdition: "FC 26",
      },
    });

    const completed = await app.request("/api/v1/identity/onboarding/player", {
      method: "POST",
      headers: serviceHeaders(actor),
      body,
    });
    expect(completed.status).toBe(200);
    expect(await completed.json()).toMatchObject({
      destination: "personal",
      gameAccount: {
        identifier: "Gamer23",
        platform: "nintendo-switch-2",
        gameEdition: "FC 26",
      },
    });

    const retried = await app.request("/api/v1/identity/onboarding/player", {
      method: "POST",
      headers: serviceHeaders(actor),
      body,
    });
    expect(retried.status).toBe(200);

    const profile = await app.request("/api/v1/players/me", {
      headers: serviceHeaders(actor),
    });
    const profileBody = (await profile.json()) as { gameAccounts: unknown[] };
    expect(profileBody.gameAccounts).toHaveLength(1);

    const status = await app.request("/api/v1/identity/onboarding", {
      headers: serviceHeaders(actor),
    });
    expect(await status.json()).toMatchObject({ completed: true, path: "player" });
  });

  it("onboarding: re-resolves a player club association and ignores forged names", async () => {
    const app = buildApp(
      createFetch((url) => {
        expect(url).toContain("/clubs/info");
        expect(url).toContain("clubIds=10754");
        return Response.json(clubInfoFixture);
      }),
    );
    const actor = "actor-player-club";

    const completed = await app.request("/api/v1/identity/onboarding/player", {
      method: "POST",
      headers: serviceHeaders(actor),
      body: JSON.stringify({
        gameAccount: null,
        externalClub: {
          providerKey: "ea-clubs",
          externalClubId: "10754",
          platform: "common-gen5",
          gameEdition: "fc26",
        },
      }),
    });
    expect(completed.status).toBe(200);
    expect(await completed.json()).toMatchObject({
      destination: "personal",
      externalClub: {
        externalClubId: "10754",
        externalClubName: "Fera Enjaulada",
        platform: "common-gen5",
        gameEdition: "fc26",
        imageUrl:
          "https://eafc26.content.easports.com/fc/fltOnlineAssets/26E4D4D6-8DBB-4A9A-BD99-9C47D3AA341D/2026/fcweb/crests/256x256/l99160122.png",
      },
    });

    const profile = await app.request("/api/v1/players/me", {
      headers: serviceHeaders(actor),
    });
    expect(await profile.json()).toMatchObject({
      externalClub: {
        externalClubId: "10754",
        externalClubName: "Fera Enjaulada",
        imageUrl:
          "https://eafc26.content.easports.com/fc/fltOnlineAssets/26E4D4D6-8DBB-4A9A-BD99-9C47D3AA341D/2026/fcweb/crests/256x256/l99160122.png",
      },
    });
  });

  it("onboarding: does not complete when the external club cannot be resolved", async () => {
    const app = buildApp(createFetch(() => Response.json({})));
    const actor = "actor-player-missing-club";

    const completed = await app.request("/api/v1/identity/onboarding/player", {
      method: "POST",
      headers: serviceHeaders(actor),
      body: JSON.stringify({
        externalClub: {
          providerKey: "ea-clubs",
          externalClubId: "missing-club",
          platform: "ps5",
          gameEdition: "fc26",
        },
      }),
    });
    expect(completed.status).toBe(404);
    expect(await completed.json()).toMatchObject({
      code: "game_data.external_club_not_found",
    });

    const status = await app.request("/api/v1/identity/onboarding", {
      headers: serviceHeaders(actor),
    });
    expect(await status.json()).toMatchObject({ completed: false });
  });

  it("onboarding: accepts an invitation and completes the invitation path", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-inviting-organizer";
    const player = "actor-invited-player";

    const created = await app.request("/api/v1/identity/onboarding/organization", {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({
        name: "Liga Invitación",
        competition: onboardingCompetition,
        gameAccount: null,
      }),
    });
    const { organizationId, competition } = (await created.json()) as {
      organizationId: string;
      competition: { competition: { id: string } };
    };
    const competitionId = competition.competition.id;
    const organizationInvitation = await app.request(
      `/api/v1/organizations/${organizationId}/invitations`,
      {
        method: "POST",
        headers: serviceHeaders(organizer),
        body: JSON.stringify({ role: "staff" }),
      },
    );
    const organizationToken = (await organizationInvitation.json()) as { token: string };
    const rejectedOrganizationInvitation = await app.request(
      "/api/v1/identity/onboarding/invitation",
      {
        method: "POST",
        headers: serviceHeaders("actor-with-organization-invite"),
        body: JSON.stringify({ token: organizationToken.token }),
      },
    );
    expect(rejectedOrganizationInvitation.status).toBe(400);
    expect(await rejectedOrganizationInvitation.json()).toMatchObject({
      code: "organizations.invitation_invalid",
    });

    const invitation = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/invitations`,
      {
        method: "POST",
        headers: serviceHeaders(organizer),
        body: JSON.stringify({ role: "player" }),
      },
    );
    expect(invitation.status).toBe(201);
    const { token } = (await invitation.json()) as { token: string };

    const completed = await app.request("/api/v1/identity/onboarding/invitation", {
      method: "POST",
      headers: serviceHeaders(player),
      body: JSON.stringify({ token }),
    });
    expect(completed.status).toBe(200);
    expect(await completed.json()).toMatchObject({
      organizationId,
      role: "member",
      competitionRole: "player",
      competitionId,
      competitionName: "Copa Inicial",
      profile: { id: expect.any(String) },
      gameAccount: null,
      destination: { kind: "competition", organizationId, competitionId },
    });

    const profile = await app.request("/api/v1/players/me", {
      headers: serviceHeaders(player),
    });
    expect(await profile.json()).toMatchObject({
      profile: { id: expect.any(String) },
      gameAccounts: [],
    });

    const status = await app.request("/api/v1/identity/onboarding", {
      headers: serviceHeaders(player),
    });
    expect(await status.json()).toMatchObject({ completed: true, path: "invitation" });

    const acceptedAgain = await app.request("/api/v1/competitions/invitations/accept", {
      method: "POST",
      headers: serviceHeaders(player),
      body: JSON.stringify({ token }),
    });
    expect(acceptedAgain.status).toBe(200);
    expect(await acceptedAgain.json()).toMatchObject({
      competitionId,
      competitionName: "Copa Inicial",
      destination: { kind: "competition", organizationId, competitionId },
    });
  });

  it("onboarding: rejects a lost invitation claim without completing the path", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-claim-organizer";
    const winner = "actor-claim-winner";
    const loser = "actor-claim-loser";

    const created = await app.request("/api/v1/identity/onboarding/organization", {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({
        name: "Liga Claim Race",
        competition: onboardingCompetition,
        gameAccount: null,
      }),
    });
    const { organizationId, competition } = (await created.json()) as {
      organizationId: string;
      competition: { competition: { id: string } };
    };
    const competitionId = competition.competition.id;

    const invitation = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/invitations`,
      {
        method: "POST",
        headers: serviceHeaders(organizer),
        body: JSON.stringify({ role: "player" }),
      },
    );
    expect(invitation.status).toBe(201);
    const { token } = (await invitation.json()) as { token: string };

    const won = await app.request("/api/v1/identity/onboarding/invitation", {
      method: "POST",
      headers: serviceHeaders(winner),
      body: JSON.stringify({ token }),
    });
    expect(won.status).toBe(200);

    const lost = await app.request("/api/v1/identity/onboarding/invitation", {
      method: "POST",
      headers: serviceHeaders(loser),
      body: JSON.stringify({ token }),
    });
    expect(lost.status).toBe(400);
    expect(await lost.json()).toMatchObject({
      code: "organizations.invitation_invalid",
    });

    const loserStatus = await app.request("/api/v1/identity/onboarding", {
      headers: serviceHeaders(loser),
    });
    expect(await loserStatus.json()).toMatchObject({ completed: false });

    const loserProfile = await app.request("/api/v1/players/me", {
      headers: serviceHeaders(loser),
    });
    expect(loserProfile.status).toBe(200);
    expect(await loserProfile.json()).toMatchObject({
      profile: null,
      gameAccounts: [],
    });
  });

  it("onboarding: rejects missing and expired invitations with typed codes", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-typed-invite-organizer";
    const missingActor = "actor-typed-invite-missing";
    const expiredActor = "actor-typed-invite-expired";

    const missing = await app.request("/api/v1/identity/onboarding/invitation", {
      method: "POST",
      headers: serviceHeaders(missingActor),
      body: JSON.stringify({ token: "does-not-exist" }),
    });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({
      code: "organizations.invitation_not_found",
    });
    expect(
      await (
        await app.request("/api/v1/identity/onboarding", {
          headers: serviceHeaders(missingActor),
        })
      ).json(),
    ).toMatchObject({ completed: false });

    const created = await app.request("/api/v1/identity/onboarding/organization", {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({
        name: "Liga Expirada",
        competition: onboardingCompetition,
        gameAccount: null,
      }),
    });
    const { organizationId, competition } = (await created.json()) as {
      organizationId: string;
      competition: { competition: { id: string } };
    };
    const invitation = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competition.competition.id}/invitations`,
      {
        method: "POST",
        headers: serviceHeaders(organizer),
        body: JSON.stringify({ role: "player", expiresInMs: 1 }),
      },
    );
    expect(invitation.status).toBe(201);
    const { token } = (await invitation.json()) as { token: string };
    await new Promise((resolve) => setTimeout(resolve, 5));

    const expired = await app.request("/api/v1/identity/onboarding/invitation", {
      method: "POST",
      headers: serviceHeaders(expiredActor),
      body: JSON.stringify({ token }),
    });
    expect(expired.status).toBe(400);
    expect(await expired.json()).toMatchObject({
      code: "organizations.invitation_expired",
    });
    expect(
      await (
        await app.request("/api/v1/identity/onboarding", {
          headers: serviceHeaders(expiredActor),
        })
      ).json(),
    ).toMatchObject({ completed: false });
  });

  it("onboarding: rejects a different path after completion without creating side effects", async () => {
    const app = buildApp(stubFetch);
    const actor = "actor-completed-player";
    await app.request("/api/v1/identity/onboarding/player", {
      method: "POST",
      headers: serviceHeaders(actor),
      body: JSON.stringify({ gameAccount: null }),
    });

    const conflicting = await app.request("/api/v1/identity/onboarding/organization", {
      method: "POST",
      headers: serviceHeaders(actor),
      body: JSON.stringify({
        name: "No debe existir",
        competition: onboardingCompetition,
        gameAccount: null,
      }),
    });
    expect(conflicting.status).toBe(409);
    expect(await conflicting.json()).toMatchObject({
      code: "identity.onboarding_path_conflict",
    });

    const mine = await app.request("/api/v1/organizations/mine", {
      headers: serviceHeaders(actor),
    });
    expect(await mine.json()).toEqual({ memberships: [] });
  });

  it("organizations routes reject missing service auth", async () => {
    const app = buildApp(stubFetch);

    const res = await app.request("/api/v1/organizations/mine");

    expect(res.status).toBe(401);
  });

  it("competitions: resumes draft, manages approved participants, publishes and locks structure", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-setup-organizer";
    const outsider = "actor-setup-outsider";
    const created = await app.request("/api/v1/identity/onboarding/organization", {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({
        name: "Setup Org",
        competition: onboardingCompetition,
        gameAccount: null,
      }),
    });
    const body = (await created.json()) as {
      organizationId: string;
      competition: { competition: { id: string }; rules: CompetitionRulesDto };
    };
    const organizationId = body.organizationId;
    const competitionId = body.competition.competition.id;

    const patchDraft = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}`,
      {
        method: "PATCH",
        headers: serviceHeaders(organizer),
        body: JSON.stringify({
          ...onboardingCompetition,
          name: "Liga reanudada",
          rules: {
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
          },
        }),
      },
    );
    expect(patchDraft.status).toBe(200);
    expect(await patchDraft.json()).toMatchObject({
      competition: { name: "Liga reanudada", status: "draft" },
      rules: { maxRosterSize: 16 },
    });

    const participantIds: string[] = [];
    for (const [name, creationKey] of [
      ["Alpha", "setup-alpha"],
      ["Beta", "setup-beta"],
    ] as const) {
      const added = await app.request(
        `/api/v1/organizations/${organizationId}/competitions/${competitionId}/participants`,
        {
          method: "POST",
          headers: serviceHeaders(organizer),
          body: JSON.stringify({ kind: "new-team", name, creationKey }),
        },
      );
      expect(added.status).toBe(201);
      const entry = (await added.json()) as { id: string; status: string };
      expect(entry.status).toBe("approved");
      participantIds.push(entry.id);
    }

    const teams = await app.request(`/api/v1/organizations/${organizationId}/teams`, {
      headers: serviceHeaders(organizer),
    });
    expect(await teams.json()).toMatchObject({ teams: [{ name: "Alpha" }, { name: "Beta" }] });
    const forbidden = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/participants`,
      { headers: serviceHeaders(outsider) },
    );
    expect(forbidden.status).toBe(403);

    const published = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/publish`,
      { method: "POST", headers: serviceHeaders(organizer) },
    );
    expect(published.status).toBe(200);
    expect(await published.json()).toMatchObject({ competition: { status: "published" } });

    const removeAfterPublish = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/participants/${participantIds[0]}`,
      { method: "DELETE", headers: serviceHeaders(organizer) },
    );
    expect(removeAfterPublish.status).toBe(409);
    expect(await removeAfterPublish.json()).toMatchObject({ code: "competitions.not_editable" });
  });

  it("teams: creates entry, roster across competitions, active preference, and rejects same-competition conflict", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-roster-org";
    const player = "actor-roster-player";

    const orgCreated = await app.request("/api/v1/identity/onboarding/organization", {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({
        name: "Roster Org",
        competition: onboardingCompetition,
        gameAccount: null,
      }),
    });
    expect(orgCreated.status).toBe(200);
    const orgBody = (await orgCreated.json()) as {
      organizationId: string;
      competition: { competition: { id: string } };
    };
    const organizationId = orgBody.organizationId;
    const competitionA = orgBody.competition.competition.id;

    await app.request("/api/v1/identity/onboarding/player", {
      method: "POST",
      headers: serviceHeaders(player),
      body: JSON.stringify({
        gameAccount: {
          identifier: "gamer23",
          platform: "nintendo-switch-1",
          gameEdition: "FC 26",
        },
      }),
    });
    const profileRes = await app.request("/api/v1/players/me", {
      headers: serviceHeaders(player),
    });
    const profileBody = (await profileRes.json()) as {
      profile: { id: string };
      gameAccounts: Array<{ id: string }>;
    };

    const teamA = await app.request(`/api/v1/organizations/${organizationId}/teams`, {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({ name: "Alpha", creationKey: "team:alpha" }),
    });
    expect(teamA.status).toBe(201);
    const teamABody = (await teamA.json()) as { id: string };

    const teamB = await app.request(`/api/v1/organizations/${organizationId}/teams`, {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({ name: "Beta", creationKey: "team:beta" }),
    });
    const teamBBody = (await teamB.json()) as { id: string };

    const entryA = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionA}/participants`,
      {
        method: "POST",
        headers: serviceHeaders(organizer),
        body: JSON.stringify({ kind: "existing-team", teamId: teamABody.id }),
      },
    );
    expect(entryA.status).toBe(201);

    const rosterA = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionA}/teams/${teamABody.id}/roster`,
      {
        method: "POST",
        headers: serviceHeaders(organizer),
        body: JSON.stringify({
          playerProfileId: profileBody.profile.id,
          gameAccountId: profileBody.gameAccounts[0]?.id,
          role: "player",
        }),
      },
    );
    expect(rosterA.status).toBe(201);
    const rosterABody = (await rosterA.json()) as { id: string };

    const conflict = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionA}/teams/${teamBBody.id}/roster`,
      {
        method: "POST",
        headers: serviceHeaders(organizer),
        body: JSON.stringify({
          playerProfileId: profileBody.profile.id,
          role: "player",
        }),
      },
    );
    // Team B is not a participant yet; the contextual resolver rejects the chain.
    const entryB = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionA}/participants`,
      {
        method: "POST",
        headers: serviceHeaders(organizer),
        body: JSON.stringify({ kind: "existing-team", teamId: teamBBody.id }),
      },
    );
    expect(entryB.status).toBe(201);
    const conflictAfterEntry = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionA}/teams/${teamBBody.id}/roster`,
      {
        method: "POST",
        headers: serviceHeaders(organizer),
        body: JSON.stringify({
          playerProfileId: profileBody.profile.id,
          role: "player",
        }),
      },
    );
    expect(conflict.status).toBe(403);
    expect(conflictAfterEntry.status).toBe(409);
    expect(await conflictAfterEntry.json()).toMatchObject({
      code: "teams.roster_competition_conflict",
    });

    const active = await app.request("/api/v1/players/me/active-team", {
      method: "PUT",
      headers: serviceHeaders(player),
      body: JSON.stringify({ rosterMembershipId: rosterABody.id }),
    });
    expect(active.status).toBe(200);

    const mine = await app.request("/api/v1/players/me/teams", {
      headers: serviceHeaders(player),
    });
    expect(mine.status).toBe(200);
    expect(await mine.json()).toMatchObject({
      activeRosterMembershipId: rosterABody.id,
      teams: [{ team: { id: teamABody.id }, active: true }],
    });

    const forbidden = await app.request(`/api/v1/organizations/${organizationId}/teams`, {
      method: "POST",
      headers: serviceHeaders(player),
      body: JSON.stringify({ name: "No" }),
    });
    expect(forbidden.status).toBe(403);

    const club = await app.request(
      `/api/v1/organizations/${organizationId}/teams/${teamABody.id}/external-club`,
      {
        method: "PUT",
        headers: serviceHeaders(organizer),
        body: JSON.stringify({
          providerKey: "ea-clubs",
          externalClubId: "club-1",
          externalClubName: "Alpha Club",
          platform: "ps5",
          gameEdition: "FC 26",
        }),
      },
    );
    expect(club.status).toBe(200);
    expect(await club.json()).toEqual({
      teamId: teamABody.id,
      providerKey: "ea-clubs",
      externalClubId: "club-1",
      externalClubName: "Alpha Club",
      platform: "ps5",
      gameEdition: "FC 26",
    });

    const listed = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionA}/teams/${teamABody.id}/roster`,
      { headers: serviceHeaders(organizer) },
    );
    expect(listed.status).toBe(200);
    expect(await listed.json()).toMatchObject({
      memberships: [{ id: rosterABody.id, role: "player" }],
    });

    const closed = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionA}/teams/${teamABody.id}/roster/close`,
      { method: "POST", headers: serviceHeaders(organizer) },
    );
    expect(closed.status).toBe(200);
    expect(await closed.json()).toMatchObject({
      teamId: teamABody.id,
      lockedAt: expect.any(String),
    });

    await app.request("/api/v1/identity/onboarding/player", {
      method: "POST",
      headers: serviceHeaders("actor-roster-locked"),
      body: JSON.stringify({
        gameAccount: {
          identifier: "locked23",
          platform: "nintendo-switch-1",
          gameEdition: "FC 26",
        },
      }),
    });
    const lockedProfile = await app.request("/api/v1/players/me", {
      headers: serviceHeaders("actor-roster-locked"),
    });
    const lockedProfileBody = (await lockedProfile.json()) as { profile: { id: string } };
    const addWhileLocked = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionA}/teams/${teamABody.id}/roster`,
      {
        method: "POST",
        headers: serviceHeaders(organizer),
        body: JSON.stringify({
          playerProfileId: lockedProfileBody.profile.id,
          role: "player",
        }),
      },
    );
    expect(addWhileLocked.status).toBe(409);
    expect(await addWhileLocked.json()).toMatchObject({ code: "teams.roster_locked" });
  });

  it("teams: returns a tenant-scoped management list and detail", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-team-management-organizer";
    const player = "actor-team-management-player";

    const orgCreated = await app.request("/api/v1/identity/onboarding/organization", {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({
        name: "Management Org",
        competition: onboardingCompetition,
        gameAccount: null,
      }),
    });
    const orgBody = (await orgCreated.json()) as {
      organizationId: string;
      competition: { competition: { id: string } };
    };
    const organizationId = orgBody.organizationId;
    const competitionId = orgBody.competition.competition.id;

    const playerOnboarding = await app.request("/api/v1/identity/onboarding/player", {
      method: "POST",
      headers: serviceHeaders(player),
      body: JSON.stringify({
        gameAccount: {
          identifier: "Capitana10",
          platform: "playstation",
          gameEdition: "FC 26",
        },
      }),
    });
    expect(playerOnboarding.status).toBe(200);
    const profile = (await (
      await app.request("/api/v1/players/me", { headers: serviceHeaders(player) })
    ).json()) as { profile: { id: string }; gameAccounts: Array<{ id: string }> };

    const participant = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/participants`,
      {
        method: "POST",
        headers: serviceHeaders(organizer),
        body: JSON.stringify({
          kind: "new-team",
          name: "Barranco FC",
          creationKey: "management:barranco",
        }),
      },
    );
    expect(participant.status).toBe(201);
    const entry = (await participant.json()) as { id: string; teamId: string };

    const added = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/teams/${entry.teamId}/roster`,
      {
        method: "POST",
        headers: serviceHeaders(organizer),
        body: JSON.stringify({
          playerProfileId: profile.profile.id,
          gameAccountId: profile.gameAccounts[0]?.id,
          role: "captain",
        }),
      },
    );
    expect(added.status).toBe(201);

    const list = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/team-management?limit=1`,
      { headers: serviceHeaders(organizer) },
    );
    expect(list.status).toBe(200);
    expect(await list.json()).toMatchObject({
      items: [
        {
          team: { id: entry.teamId, name: "Barranco FC" },
          entry: { id: entry.id, status: "approved" },
          roster: { state: "open", memberCount: 1, maxSize: 11, lockedAt: null },
          externalClub: null,
        },
      ],
      nextCursor: null,
    });

    const detail = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/team-management/${entry.teamId}`,
      { headers: serviceHeaders(organizer) },
    );
    expect(detail.status).toBe(200);
    expect(await detail.json()).toMatchObject({
      members: [
        {
          membership: { role: "captain" },
          presentation: { displayName: "Capitana10", avatarUrl: null },
        },
      ],
    });

    const outsider = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/team-management`,
      { headers: serviceHeaders("actor-team-management-outsider") },
    );
    expect(outsider.status).toBe(403);
  });

  it("teams: creates and accepts a roster invitation", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-roster-invite-org";
    const player = "actor-roster-invite-player";

    const orgCreated = await app.request("/api/v1/identity/onboarding/organization", {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({
        name: "Roster Invite Org",
        competition: onboardingCompetition,
        gameAccount: null,
      }),
    });
    expect(orgCreated.status).toBe(200);
    const orgBody = (await orgCreated.json()) as {
      organizationId: string;
      competition: { competition: { id: string } };
    };
    const organizationId = orgBody.organizationId;
    const competitionId = orgBody.competition.competition.id;

    const teamRes = await app.request(`/api/v1/organizations/${organizationId}/teams`, {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({ name: "Invite FC", creationKey: "team:invite" }),
    });
    expect(teamRes.status).toBe(201);
    const teamBody = (await teamRes.json()) as { id: string };

    const entry = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/participants`,
      {
        method: "POST",
        headers: serviceHeaders(organizer),
        body: JSON.stringify({ kind: "existing-team", teamId: teamBody.id }),
      },
    );
    expect(entry.status).toBe(201);

    const invitation = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/teams/${teamBody.id}/roster-invitations`,
      {
        method: "POST",
        headers: serviceHeaders(organizer),
        body: JSON.stringify({ role: "player" }),
      },
    );
    expect(invitation.status).toBe(201);
    const { token } = (await invitation.json()) as { token: string };

    const accepted = await app.request("/api/v1/roster-invitations/accept", {
      method: "POST",
      headers: serviceHeaders(player),
      body: JSON.stringify({ token }),
    });
    expect(accepted.status).toBe(201);
    const membership = (await accepted.json()) as { teamId: string; role: string };
    expect(membership).toMatchObject({ teamId: teamBody.id, role: "player" });

    const discoverable = await app.request("/api/v1/competitions/mine", {
      headers: serviceHeaders(player),
    });
    expect(discoverable.status).toBe(200);
    expect(await discoverable.json()).toMatchObject({
      competitions: [
        {
          competition: { id: competitionId, organizationId },
          role: "player",
        },
      ],
    });

    const acceptedAgain = await app.request("/api/v1/roster-invitations/accept", {
      method: "POST",
      headers: serviceHeaders(player),
      body: JSON.stringify({ token }),
    });
    expect(acceptedAgain.status).toBe(201);
    expect(await acceptedAgain.json()).toEqual(membership);

    const roster = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/teams/${teamBody.id}/roster`,
      { headers: serviceHeaders(organizer) },
    );
    expect(await roster.json()).toMatchObject({
      memberships: [{ teamId: teamBody.id, role: "player" }],
    });
  });

  it("authorization: resolves grants without crossing tenant scopes", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-auth-organizer";
    const member = "actor-auth-member";
    const otherOrganizer = "actor-auth-other-organizer";

    const created = await app.request("/api/v1/organizations", {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({ name: "Authorization Org" }),
    });
    const { organizationId } = (await created.json()) as { organizationId: string };
    const invitation = await app.request(`/api/v1/organizations/${organizationId}/invitations`, {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({ role: "member" }),
    });
    const { token } = (await invitation.json()) as { token: string };
    await app.request("/api/v1/organizations/invitations/accept", {
      method: "POST",
      headers: serviceHeaders(member),
      body: JSON.stringify({ token }),
    });

    const denied = await app.request(
      `/api/v1/authorization/effective-access?organizationId=${organizationId}&permissions=organizations.update`,
      { headers: serviceHeaders(member) },
    );
    expect(await denied.json()).toMatchObject({
      permissions: [{ permission: "organizations.update", allowed: false }],
    });

    const granted = await app.request("/api/v1/authorization/grants", {
      method: "PUT",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({
        targetActorId: member,
        organizationId,
        permission: "organizations.update",
        effect: "allow",
        scopeType: "organization",
        scopeId: organizationId,
      }),
    });
    expect(granted.status).toBe(200);
    const grant = (await granted.json()) as { id: string };
    const listed = await app.request(
      `/api/v1/authorization/grants?organizationId=${organizationId}&scopeType=organization&scopeId=${organizationId}&targetActorId=${member}`,
      { headers: serviceHeaders(organizer) },
    );
    expect(await listed.json()).toMatchObject({
      grants: [{ id: grant.id, actorId: member, permission: "organizations.update" }],
    });

    const allowed = await app.request(
      `/api/v1/authorization/effective-access?organizationId=${organizationId}&permissions=organizations.update`,
      { headers: serviceHeaders(member) },
    );
    expect(await allowed.json()).toMatchObject({
      permissions: [{ permission: "organizations.update", allowed: true }],
    });

    const other = await app.request("/api/v1/organizations", {
      method: "POST",
      headers: serviceHeaders(otherOrganizer),
      body: JSON.stringify({ name: "Other Authorization Org" }),
    });
    const otherOrganizationId = ((await other.json()) as { organizationId: string }).organizationId;
    const crossTenantDelete = await app.request(
      `/api/v1/authorization/grants/${grant.id}?organizationId=${otherOrganizationId}`,
      { method: "DELETE", headers: serviceHeaders(otherOrganizer) },
    );
    expect(crossTenantDelete.status).toBe(404);
  });
});
