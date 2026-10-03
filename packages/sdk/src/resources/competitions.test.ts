import { describe, expect, it } from "vite-plus/test";
import { createFutrobClient } from "../client.ts";
import { mockFetch, parseMockJsonBody, requestUrl } from "../testing/mock-fetch.ts";

describe("context discovery SDK resources", () => {
  it("lists actor-accessible competitions", async () => {
    let requestedUrl = "";
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input) => {
        requestedUrl = requestUrl(input);
        return Response.json({
          competitions: [
            {
              competition: {
                id: "competition-1",
                organizationId: "org-1",
                name: "Liga",
                status: "published",
                modality: "fc-clubs",
                gameEdition: "FC 26",
                platform: "pc",
                region: "south-america",
                timeZone: "America/Lima",
                format: "league",
                teams: { min: 2, max: null },
                schedule: { startsOn: null, endsOn: null },
                cover: { kind: "preset", preset: "cup" },
                createdAt: "2026-08-07T12:00:00.000Z",
                updatedAt: "2026-08-07T12:00:00.000Z",
              },
              role: "vice_captain",
            },
          ],
        });
      }),
    });

    const result = await client.competitions.listMine();

    expect(result.competitions[0]?.role).toBe("vice_captain");
    expect(requestedUrl).toBe("https://app.example.com/api/v1/competitions/mine");
  });

  it("explores published competitions with typed filters", async () => {
    let requestedUrl = "";
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input) => {
        requestedUrl = requestUrl(input);
        return Response.json({
          items: [
            {
              competition: {
                id: "competition-1",
                organizationId: "org-1",
                name: "Liga Norte",
                status: "published",
                modality: "fc-clubs",
                gameEdition: "FC 26",
                platform: "pc",
                region: "south-america",
                timeZone: "America/Lima",
                format: "league",
                teams: { min: 2, max: null },
                schedule: { startsOn: null, endsOn: null },
                cover: { kind: "preset", preset: "cup" },
                createdAt: "2026-08-07T12:00:00.000Z",
                updatedAt: "2026-08-07T12:00:00.000Z",
              },
              organization: { id: "org-1", name: "Liga Andina" },
              approvedTeamCount: 4,
            },
          ],
          total: 1,
          nextCursor: null,
        });
      }),
    });

    const result = await client.competitions.explore({
      q: "Norte",
      format: "league",
      status: "published",
    });

    expect(result.items[0]?.organization.name).toBe("Liga Andina");
    expect(result.items[0]?.approvedTeamCount).toBe(4);
    expect(requestedUrl).toBe(
      "https://app.example.com/api/v1/competitions/explore?q=Norte&format=league&status=published&sort=updated-desc&limit=24",
    );
  });

  it("loads one discoverable competition", async () => {
    let requestedUrl = "";
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input) => {
        requestedUrl = requestUrl(input);
        return Response.json({
          competition: {
            id: "competition-1",
            organizationId: "org-1",
            name: "Liga Norte",
            status: "published",
            modality: "fc-clubs",
            gameEdition: "FC 26",
            platform: "pc",
            region: "south-america",
            timeZone: "America/Lima",
            format: "league",
            teams: { min: 2, max: null },
            schedule: { startsOn: null, endsOn: null },
            cover: { kind: "preset", preset: "cup" },
            createdAt: "2026-08-07T12:00:00.000Z",
            updatedAt: "2026-08-07T12:00:00.000Z",
          },
          organization: { id: "org-1", name: "Liga Andina" },
          approvedTeamCount: 4,
        });
      }),
    });

    const result = await client.competitions.getExplore("competition-1");

    expect(result.competition.name).toBe("Liga Norte");
    expect(requestedUrl).toBe("https://app.example.com/api/v1/competitions/explore/competition-1");
  });

  it("applies to a competition and reads the actor's application", async () => {
    const calls: { url: string; method: string; body: unknown }[] = [];
    const application = {
      entryId: "entry-1",
      status: "pending",
      teamId: "team-1",
      teamName: "Los Postulantes",
      createdAt: "2026-09-27T12:00:00.000Z",
    };
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input, init) => {
        calls.push({
          url: requestUrl(input),
          method: init?.method ?? "GET",
          body: init?.body ? parseMockJsonBody(init) : null,
        });
        return init?.method === "POST"
          ? Response.json(application, { status: 201 })
          : Response.json({ application });
      }),
    });

    const applied = await client.competitions.apply("competition-1", {
      teamName: "Los Postulantes",
      creationKey: "apply-key-0001",
    });
    const mine = await client.competitions.getMyApplication("competition-1");

    expect(applied.status).toBe("pending");
    expect(mine.application?.teamName).toBe("Los Postulantes");
    expect(calls).toEqual([
      {
        url: "https://app.example.com/api/v1/competitions/explore/competition-1/application",
        method: "POST",
        body: { teamName: "Los Postulantes", creationKey: "apply-key-0001" },
      },
      {
        url: "https://app.example.com/api/v1/competitions/explore/competition-1/application",
        method: "GET",
        body: null,
      },
    ]);
  });

  it("loads the persisted encounter scheduling snapshot", async () => {
    let requestedUrl = "";
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input) => {
        requestedUrl = requestUrl(input);
        return Response.json({
          encounterId: "encounter-1",
          organizationId: "org-1",
          competitionId: "competition-1",
          stageId: "stage-1",
          homeTeamId: "team-a",
          awayTeamId: "team-b",
          scheduledStartAt: "2026-08-07T12:00:00.000Z",
          officialMatchCount: 2,
          homeExternalClubId: null,
          awayExternalClubId: null,
          providerKey: null,
        });
      }),
    });

    const result = await client.encounters.getScheduleSnapshot("encounter-1");

    expect(result.officialMatchCount).toBe(2);
    expect(requestedUrl).toBe(
      "https://app.example.com/api/v1/encounters/encounter-1/schedule-snapshot",
    );
  });

  it("publishes an encounter scheduling snapshot", async () => {
    let method: string | undefined;
    let body: unknown;
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (_input, init) => {
        method = init?.method;
        body = parseMockJsonBody(init);
        return Response.json({
          encounterId: "encounter-1",
          organizationId: "org-1",
          competitionId: "competition-1",
          stageId: "stage-1",
          homeTeamId: "team-a",
          awayTeamId: "team-b",
          scheduledStartAt: "2026-08-07T12:00:00.000Z",
          officialMatchCount: 2,
          homeExternalClubId: null,
          awayExternalClubId: null,
          providerKey: null,
        });
      }),
    });

    await client.encounters.upsertScheduleSnapshot("encounter-1", {
      organizationId: "org-1",
      competitionId: "competition-1",
      stageId: "stage-1",
      homeTeamId: "team-a",
      awayTeamId: "team-b",
      scheduledStartAt: "2026-08-07T12:00:00.000Z",
      officialMatchCount: 2,
    });

    expect(method).toBe("PUT");
    expect(body).toMatchObject({ competitionId: "competition-1", homeTeamId: "team-a" });
  });

  it("generates a competition fixture through the typed resource", async () => {
    let requestedUrl = "";
    let method: string | undefined;
    let body: unknown;
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (input, init) => {
        requestedUrl = requestUrl(input);
        method = init?.method;
        body = parseMockJsonBody(init);
        return Response.json(fixturePlan());
      }),
    });

    const result = await client.encounters.generateFixture("org-1", "competition-1", {
      generationVersion: 1,
      startsAt: "2026-09-01T01:00:00.000Z",
      roundIntervalDays: 7,
      homeAndAway: false,
    });

    expect(result.id).toBe("fixture-1");
    expect(method).toBe("POST");
    expect(body).toMatchObject({ generationVersion: 1, roundIntervalDays: 7 });
    expect(requestedUrl).toBe(
      "https://app.example.com/api/v1/organizations/org-1/competitions/competition-1/fixture",
    );
  });

  it("sends a stable request ID when editing a fixture encounter", async () => {
    let method: string | undefined;
    let body: unknown;
    let requestId: string | null = null;
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: mockFetch(async (_input, init) => {
        method = init?.method;
        requestId = new Headers(init?.headers).get("X-Request-ID");
        body = parseMockJsonBody(init);
        return Response.json(fixturePlan());
      }),
    });

    const stableId = "1f8c914e-a307-42aa-b2ea-ec6cfefaba83";
    await client.encounters.editFixtureEncounter(
      "org-1",
      "competition-1",
      "fixture-1",
      "encounter-1",
      {
        scheduledStartAt: "2026-09-02T01:00:00.000Z",
        reason: "Broadcast window",
        requestId: stableId,
      },
    );

    expect(method).toBe("PATCH");
    expect(requestId).toBe(stableId);
    expect(body).toMatchObject({ requestId: stableId, reason: "Broadcast window" });
  });
});

function fixturePlan() {
  return {
    id: "fixture-1",
    revision: 1,
    status: "active",
    generationKey: "competition-1:rules:1:generation:1",
    organizationId: "org-1",
    competitionId: "competition-1",
    rulesVersion: 1,
    generationVersion: 1,
    format: "league",
    timeZone: "America/Lima",
    homeAndAway: false,
    seed: ["team-a", "team-b"],
    stages: [
      {
        id: "stage-1",
        kind: "league",
        order: 1,
        rounds: [
          {
            id: "round-1",
            stageId: "stage-1",
            number: 1,
            scheduledStartAt: "2026-09-01T01:00:00.000Z",
            encounters: [
              {
                id: "encounter-1",
                stageId: "stage-1",
                roundId: "round-1",
                order: 1,
                home: { kind: "team", teamId: "team-a" },
                away: { kind: "team", teamId: "team-b" },
                scheduledStartAt: "2026-09-01T01:00:00.000Z",
                officialMatchCount: 1,
                series: {
                  id: "series-1",
                  resolutionMode: "independent_matches",
                  officialMatches: [{ id: "official-match-1", slot: 1 }],
                },
              },
            ],
          },
        ],
      },
    ],
  };
}
