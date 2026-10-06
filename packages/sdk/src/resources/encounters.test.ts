import { describe, expect, it } from "vite-plus/test";
import { createFutrobClient } from "../client.ts";
import { FutrobApiError } from "../errors.ts";
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
  version: 1,
  currentProposalId: "proposal-1",
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
  decisions: [],
  application: null,
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

  it("reads one request by id with its history", async () => {
    const client = createFutrobClient({
      baseUrl: "https://api.example.com/api/v1",
      fetchImpl: mockFetch(async (input, init) => {
        expect(requestUrl(input)).toBe(
          "https://api.example.com/api/v1/encounters/encounter-1/schedule-change-requests/req%2F1",
        );
        expect(init?.method).toBe("GET");
        return Response.json({ ...requestDto, id: "req/1" });
      }),
    });

    await expect(
      client.encounters.getScheduleChangeRequest("encounter-1", "req/1"),
    ).resolves.toMatchObject({ id: "req/1", version: 1, currentProposalId: "proposal-1" });
  });

  it("counters and accepts the current proposal with the caller's key and version", async () => {
    const sent: { url: string; body: unknown }[] = [];
    const accepted = {
      request: {
        ...requestDto,
        status: "accepted" as const,
        version: 3,
        currentProposalId: "proposal-2",
        application: {
          id: "application-1",
          proposalId: "proposal-2",
          requestVersion: 3,
          appliedByActorId: "captain-1",
          previousEncounterStartAt: "2099-01-10T23:00:00.000Z",
          appliedEncounterStartAt: "2099-01-16T23:00:00.000Z",
          slots: [
            {
              officialSlot: 1,
              previousStartAt: "2099-01-10T23:00:00.000Z",
              appliedStartAt: "2099-01-16T23:00:00.000Z",
            },
          ],
          appliedAt: "2026-09-15T20:00:00.000Z",
        },
      },
      replayed: false,
    };
    const client = createFutrobClient({
      baseUrl: "https://api.example.com/api/v1",
      fetchImpl: mockFetch(async (input, init) => {
        expect(init?.method).toBe("POST");
        sent.push({ url: requestUrl(input), body: parseMockJsonBody(init) });
        return Response.json(accepted);
      }),
    });
    const target = { encounterId: "encounter-1", requestId: "req-1", proposalId: "proposal-2" };

    const result = await client.encounters.acceptScheduleChangeProposal(target, {
      expectedVersion: 2,
      commandKey: " accept-1 ",
      responder: { authority: "rival_team", teamId: "team-home" },
    });
    await client.encounters.counterScheduleChangeProposal(target, {
      expectedVersion: 2,
      commandKey: "counter-1",
      teamId: "team-away",
      proposedWallTime: { year: 2099, month: 1, day: 16, hour: 18, minute: 0, second: 0 },
      reason: "Rival travel conflict",
      timeZone: "America/Lima",
    });

    expect(result).toEqual(accepted);
    expect(sent).toEqual([
      {
        url: "https://api.example.com/api/v1/encounters/encounter-1/schedule-change-requests/req-1/proposals/proposal-2/accept",
        body: {
          expectedVersion: 2,
          commandKey: "accept-1",
          responder: { authority: "rival_team", teamId: "team-home" },
        },
      },
      {
        url: "https://api.example.com/api/v1/encounters/encounter-1/schedule-change-requests/req-1/proposals/proposal-2/counter",
        body: {
          expectedVersion: 2,
          commandKey: "counter-1",
          teamId: "team-away",
          proposedWallTime: { year: 2099, month: 1, day: 16, hour: 18, minute: 0, second: 0 },
          reason: "Rival travel conflict",
          timeZone: "America/Lima",
        },
      },
    ]);
  });

  it("surfaces a version conflict once, without retrying under another key", async () => {
    const attempts: unknown[] = [];
    const client = createFutrobClient({
      baseUrl: "https://api.example.com/api/v1",
      maxRetries: 3,
      fetchImpl: mockFetch(async (_input, init) => {
        attempts.push(parseMockJsonBody(init));
        return Response.json(
          {
            code: "scheduling.schedule_change_version_conflict",
            messageKey: "errors.scheduling.schedule_change_version_conflict",
          },
          { status: 409 },
        );
      }),
    });

    const rejection = client.encounters.rejectScheduleChangeProposal(
      { encounterId: "encounter-1", requestId: "req-1", proposalId: "proposal-1" },
      {
        expectedVersion: 1,
        commandKey: "reject-1",
        responder: { authority: "organizer" },
        reason: "Venue unavailable",
      },
    );

    await expect(rejection).rejects.toBeInstanceOf(FutrobApiError);
    await expect(rejection).rejects.toMatchObject({
      status: 409,
      code: "scheduling.schedule_change_version_conflict",
    });
    expect(attempts).toEqual([
      {
        expectedVersion: 1,
        commandKey: "reject-1",
        responder: { authority: "organizer" },
        reason: "Venue unavailable",
      },
    ]);
  });
});
