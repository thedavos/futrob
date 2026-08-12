import { describe, expect, it } from "vite-plus/test";
import {
  buildApp,
  onboardingCompetition,
  serviceHeaders,
  stubFetch,
} from "@/http/http-app.harness.ts";

describe("apps/api http teams", () => {
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
});
