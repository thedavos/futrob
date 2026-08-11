import { describe, expect, it } from "vite-plus/test";
import {
  buildApp,
  onboardingCompetition,
  serviceHeaders,
  stubFetch,
} from "@/http/http-app.harness.ts";

describe("apps/api http fixtures", () => {
  it("generates, replays, reads, and audits a schedule edit", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-fixture-organizer";
    const created = await app.request("/api/v1/identity/onboarding/organization", {
      method: "POST",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({
        name: "Fixture Org",
        competition: onboardingCompetition,
        gameAccount: null,
      }),
    });
    const createdBody = (await created.json()) as {
      organizationId: string;
      competition: { competition: { id: string } };
    };
    const { organizationId } = createdBody;
    const competitionId = createdBody.competition.competition.id;
    await app.request(`/api/v1/organizations/${organizationId}/competitions/${competitionId}`, {
      method: "PATCH",
      headers: serviceHeaders(organizer),
      body: JSON.stringify({
        ...onboardingCompetition,
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
    });
    for (const [name, creationKey] of [
      ["Alpha Fixture", "fixture-alpha"],
      ["Beta Fixture", "fixture-beta"],
      ["Gamma Fixture", "fixture-gamma"],
    ] as const) {
      await app.request(
        `/api/v1/organizations/${organizationId}/competitions/${competitionId}/participants`,
        {
          method: "POST",
          headers: serviceHeaders(organizer),
          body: JSON.stringify({ kind: "new-team", name, creationKey }),
        },
      );
    }
    await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/publish`,
      { method: "POST", headers: serviceHeaders(organizer) },
    );
    const generationBody = {
      generationVersion: 1,
      startsAt: "2026-09-01T01:00:00.000Z",
      roundIntervalDays: 7,
      homeAndAway: true,
    };
    const generate = () =>
      app.request(`/api/v1/organizations/${organizationId}/competitions/${competitionId}/fixture`, {
        method: "POST",
        headers: { ...serviceHeaders(organizer), "X-Request-ID": "fixture-generation-1" },
        body: JSON.stringify(generationBody),
      });
    const first = await generate();
    const replay = await generate();
    expect(first.status).toBe(200);
    expect(replay.status).toBe(200);
    const fixture = (await first.json()) as {
      id: string;
      revision: number;
      stages: Array<{
        rounds: Array<{
          encounters: Array<{
            id: string;
            home: { kind: string };
            away: { kind: string };
          }>;
        }>;
      }>;
    };
    expect(await replay.json()).toEqual(fixture);
    expect(
      fixture.stages[0]?.rounds.every((round) =>
        round.encounters.some(
          (encounter) => encounter.home.kind === "bye" || encounter.away.kind === "bye",
        ),
      ),
    ).toBe(true);

    const read = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/fixtures/${encodeURIComponent(fixture.id)}`,
      { headers: serviceHeaders(organizer) },
    );
    expect(read.status).toBe(200);
    expect(await read.json()).toEqual(fixture);

    const readableEncounter = fixture.stages[0]?.rounds[0]?.encounters.find(
      (encounter) => encounter.home.kind === "team" && encounter.away.kind === "team",
    );
    expect(readableEncounter).toBeDefined();
    if (!readableEncounter) return;
    const edited = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/fixtures/${encodeURIComponent(fixture.id)}/encounters/${encodeURIComponent(readableEncounter.id)}`,
      {
        method: "PATCH",
        headers: { ...serviceHeaders(organizer), "X-Request-ID": "fixture-edit-1" },
        body: JSON.stringify({
          scheduledStartAt: "2026-09-02T01:00:00.000Z",
          reason: "Broadcast window",
        }),
      },
    );
    expect(edited.status).toBe(200);
    const editedFixture = (await edited.json()) as typeof fixture;
    expect(editedFixture).toMatchObject({ id: fixture.id, revision: 2 });

    const conflictingReplay = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/fixtures/${encodeURIComponent(fixture.id)}/encounters/${encodeURIComponent(readableEncounter.id)}`,
      {
        method: "PATCH",
        headers: { ...serviceHeaders(organizer), "X-Request-ID": "fixture-edit-1" },
        body: JSON.stringify({
          scheduledStartAt: "2026-09-03T01:00:00.000Z",
          reason: "Conflicting retry",
        }),
      },
    );
    expect(conflictingReplay.status).toBe(200);
    expect(await conflictingReplay.json()).toEqual(editedFixture);

    const outsiderRead = await app.request(
      `/api/v1/organizations/${organizationId}/competitions/${competitionId}/fixtures/${encodeURIComponent(fixture.id)}`,
      { headers: serviceHeaders("fixture-outsider") },
    );
    expect(outsiderRead.status).toBe(404);
  });
});
