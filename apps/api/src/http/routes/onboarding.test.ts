import { describe, expect, it } from "vite-plus/test";
import clubInfoFixture from "@/adapters/game-data/ea-clubs/fixtures/club-info.json";
import {
  buildApp,
  createFetch,
  onboardingCompetition,
  serviceHeaders,
  stubFetch,
} from "@/http/http-app.harness.ts";

describe("apps/api http onboarding", () => {
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
      body: JSON.stringify({ path: "player", currentStep: "team" }),
    });
    expect(progress.status).toBe(200);
    expect(await progress.json()).toEqual({
      completed: false,
      completedAt: null,
      version: null,
      path: "player",
      currentStep: "club",
    });

    const resumed = await app.request("/api/v1/identity/onboarding", {
      headers: serviceHeaders(actor),
    });
    expect(await resumed.json()).toMatchObject({
      completed: false,
      path: "player",
      currentStep: "club",
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
});
