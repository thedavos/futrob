import { describe, expect, it } from "vite-plus/test";
import {
  buildApp,
  onboardingCompetition,
  serviceHeaders,
  stubFetch,
} from "@/http/http-app.harness.ts";

describe("apps/api http team-management", () => {
  it("returns a tenant-scoped management list and detail", async () => {
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
});
