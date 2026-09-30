import { describe, expect, it } from "vite-plus/test";
import { createFutrobClient } from "../client.ts";
import { mockFetch, parseMockJsonBody, requestUrl } from "../testing/mock-fetch.ts";

const requestDto = {
  id: "req-1",
  organizationId: "org-1",
  competitionId: "competition-1",
  encounterId: "encounter-1",
  requestingTeamId: "team-home",
  initiatedByActorId: "captain-1",
  scope: { type: "entire_encounter" as const },
  status: "open" as const,
  proposals: [
    {
      id: "proposal-1",
      proposedStartAt: "2099-01-15T23:00:00.000Z",
      proposedByActorId: "captain-1",
      proposedByTeamId: "team-home",
      reason: "Team travel conflict",
      createdAt: "2026-09-14T20:00:00.000Z",
    },
  ],
  createdAt: "2026-09-14T20:00:00.000Z",
  updatedAt: "2026-09-14T20:00:00.000Z",
};

const createBody = {
  requestingTeamId: "team-home",
  scope: { type: "entire_encounter" as const },
  proposedWallTime: { year: 2099, month: 1, day: 15, hour: 18, minute: 0, second: 0 },
  reason: "Team travel conflict",
  idempotencyKey: "idem-1",
};

describe("createFutrobClient encounters schedule-change-requests", () => {
  it("creates a request through the shared contract", async () => {
    const client = createFutrobClient({
      baseUrl: "https://api.example.com/api/v1",
      fetchImpl: mockFetch(async (input, init) => {
        expect(requestUrl(input)).toBe(
          "https://api.example.com/api/v1/encounters/encounter-1/schedule-change-requests",
        );
        expect(init?.method).toBe("POST");
        expect(parseMockJsonBody(init)).toEqual(createBody);
        return Response.json(requestDto);
      }),
    });

    await expect(
      client.encounters.createScheduleChangeRequest("encounter-1", createBody),
    ).resolves.toEqual(requestDto);
  });

  it("lists closed history and rejects an idempotency key leaking into the response", async () => {
    const client = createFutrobClient({
      baseUrl: "https://api.example.com/api/v1",
      fetchImpl: mockFetch(async (input, init) => {
        expect(requestUrl(input)).toBe(
          "https://api.example.com/api/v1/encounters/encounter-1/schedule-change-requests",
        );
        expect(init?.method).toBe("GET");
        return Response.json({
          requests: [{ ...requestDto, status: "rejected", idempotencyKey: "secret" }],
        });
      }),
    });

    const listed = await client.encounters.listScheduleChangeRequests("encounter-1");
    expect(listed.requests).toEqual([{ ...requestDto, status: "rejected" }]);
    expect(listed.requests[0]).not.toHaveProperty("idempotencyKey");
  });
});
