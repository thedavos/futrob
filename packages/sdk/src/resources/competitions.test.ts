import { describe, expect, it } from "vite-plus/test";
import { createFutrobClient } from "../client.ts";

describe("context discovery SDK resources", () => {
  it("lists actor-accessible competitions", async () => {
    let requestedUrl = "";
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: (async (input) => {
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
                createdAt: "2026-08-07T12:00:00.000Z",
                updatedAt: "2026-08-07T12:00:00.000Z",
              },
              role: "vice_captain",
            },
          ],
        });
      }) as typeof fetch,
    });

    const result = await client.competitions.listMine();

    expect(result.competitions[0]?.role).toBe("vice_captain");
    expect(requestedUrl).toBe("https://app.example.com/api/v1/competitions/mine");
  });

  it("loads the persisted encounter scheduling snapshot", async () => {
    let requestedUrl = "";
    const client = createFutrobClient({
      baseUrl: "https://app.example.com/api/v1",
      fetchImpl: (async (input) => {
        requestedUrl = requestUrl(input);
        return Response.json({
          encounterId: "encounter-1",
          organizationId: "org-1",
          competitionId: "competition-1",
          homeTeamId: "team-a",
          awayTeamId: "team-b",
          scheduledStartAt: "2026-08-07T12:00:00.000Z",
          officialMatchCount: 2,
          homeExternalClubId: null,
          awayExternalClubId: null,
          providerKey: null,
        });
      }) as typeof fetch,
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
      fetchImpl: (async (_input, init) => {
        method = init?.method;
        if (typeof init?.body !== "string") throw new Error("Expected a JSON request body");
        body = JSON.parse(init.body);
        return Response.json({
          encounterId: "encounter-1",
          organizationId: "org-1",
          competitionId: "competition-1",
          homeTeamId: "team-a",
          awayTeamId: "team-b",
          scheduledStartAt: "2026-08-07T12:00:00.000Z",
          officialMatchCount: 2,
          homeExternalClubId: null,
          awayExternalClubId: null,
          providerKey: null,
        });
      }) as typeof fetch,
    });

    await client.encounters.upsertScheduleSnapshot("encounter-1", {
      organizationId: "org-1",
      competitionId: "competition-1",
      homeTeamId: "team-a",
      awayTeamId: "team-b",
      scheduledStartAt: "2026-08-07T12:00:00.000Z",
      officialMatchCount: 2,
    });

    expect(method).toBe("PUT");
    expect(body).toMatchObject({ competitionId: "competition-1", homeTeamId: "team-a" });
  });
});

function requestUrl(input: string | URL | Request): string {
  return typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
}
