import { describe, expect, it } from "vite-plus/test";
import {
  acceptScheduleChangeProposalRequestSchema,
  getMyNextEncounterResponseSchema,
  listEncounterCandidatesResponseSchema,
  createScheduleChangeRequestSchema,
  listScheduleChangeRequestsResponseSchema,
  scheduleChangeRequestSchema,
} from "./schemas.ts";

const encounter = {
  encounterId: "encounter-1",
  competition: {
    id: "competition-1",
    organizationId: "org-1",
    name: "Liga Futrob",
    timeZone: "America/Lima",
  },
  round: { number: 4, total: 10 },
  scheduledStartAt: "2026-09-07T02:00:00.000Z",
  officialMatchCount: 1 as const,
  home: {
    teamId: "team-home",
    name: "Cuervos FC1",
    externalClub: {
      providerKey: "ea-clubs" as const,
      externalClubId: "club-cuervos",
      name: "Cuervos FC1",
      platform: "common-gen5",
      gameEdition: "fc26",
      imageUrl: "https://cdn.example.com/cuervos.png",
    },
  },
  away: {
    teamId: "team-away",
    name: "MADERAS FC",
    externalClub: null,
  },
};

describe("getMyNextEncounterResponseSchema", () => {
  it("accepts a null encounter when nothing is scheduled", () => {
    expect(getMyNextEncounterResponseSchema.parse({ encounter: null })).toEqual({
      encounter: null,
    });
  });

  it("accepts a scheduled encounter with optional crests", () => {
    expect(getMyNextEncounterResponseSchema.parse({ encounter })).toEqual({ encounter });
  });

  it("accepts a scheduled encounter without a known round", () => {
    const withoutRound = { ...encounter, round: null };
    expect(getMyNextEncounterResponseSchema.parse({ encounter: withoutRound })).toEqual({
      encounter: withoutRound,
    });
  });
});

describe("listEncounterCandidatesResponseSchema", () => {
  it("validates ready, empty, connection, and provider mismatch outcomes", () => {
    const window = {
      from: "2026-09-14T02:00:00.000Z",
      to: "2026-09-15T14:00:00.000Z",
    };
    expect(
      listEncounterCandidatesResponseSchema.parse({
        status: "ready",
        window,
        candidates: [],
      }),
    ).toEqual({ status: "ready", window, candidates: [] });
    expect(
      listEncounterCandidatesResponseSchema.parse({
        status: "clubs_not_connected",
        sides: ["home", "away"],
      }),
    ).toEqual({ status: "clubs_not_connected", sides: ["home", "away"] });
    expect(listEncounterCandidatesResponseSchema.parse({ status: "provider_mismatch" })).toEqual({
      status: "provider_mismatch",
    });
  });

  it("validates a safe candidate projection without provider player payloads", () => {
    const parsed = listEncounterCandidatesResponseSchema.parse({
      status: "ready",
      window: {
        from: "2026-09-14T02:00:00.000Z",
        to: "2026-09-15T14:00:00.000Z",
      },
      candidates: [
        {
          reference: { providerKey: "ea-clubs", externalId: "match-1" },
          occurredAt: "2026-09-14T20:00:00.000Z",
          home: { externalClubId: "club-1", name: "One", goals: 2, imageUrl: null },
          away: { externalClubId: "club-2", name: "Two", goals: 1, imageUrl: null },
          game: { edition: "FC 26", platform: "common-gen5", mode: "clubs" },
          metadata: {
            durationSeconds: 720,
            wasDisconnected: false,
            winnerByForfeit: false,
            completeness: "complete",
          },
          playerObservationCount: 22,
          players: [{ raw: "must not cross the contract" }],
        },
      ],
    });

    expect(parsed.status).toBe("ready");
    if (parsed.status !== "ready") return;
    expect(parsed.candidates[0]).not.toHaveProperty("players");
    expect(parsed.candidates[0]?.playerObservationCount).toBe(22);
  });
});

const scheduleChangeRequest = {
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
      proposedStartAt: "2026-09-21T21:30:00.000Z",
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

describe("schedule change request contracts", () => {
  it("accepts create input and strips an empty client time zone", () => {
    expect(
      createScheduleChangeRequestSchema.parse({
        requestingTeamId: "team-home",
        scope: { type: "official_match", officialSlot: 2 },
        proposedWallTime: { year: 2026, month: 9, day: 21, hour: 16, minute: 30, second: 0 },
        reason: "Team travel conflict",
        idempotencyKey: " idem-1 ",
      }),
    ).toEqual({
      requestingTeamId: "team-home",
      scope: { type: "official_match", officialSlot: 2 },
      proposedWallTime: { year: 2026, month: 9, day: 21, hour: 16, minute: 30, second: 0 },
      reason: "Team travel conflict",
      idempotencyKey: "idem-1",
    });
  });

  it("rejects an empty idempotency key and serializes list history without the key", () => {
    expect(
      createScheduleChangeRequestSchema.safeParse({
        requestingTeamId: "team-home",
        scope: { type: "entire_encounter" },
        proposedWallTime: { year: 2026, month: 9, day: 21, hour: 16, minute: 30, second: 0 },
        reason: "Team travel conflict",
        idempotencyKey: "   ",
      }).success,
    ).toBe(false);
    expect(
      listScheduleChangeRequestsResponseSchema.parse({
        requests: [{ ...scheduleChangeRequest, status: "rejected", idempotencyKey: "secret" }],
      }),
    ).toEqual({ requests: [{ ...scheduleChangeRequest, status: "rejected" }] });
    expect(scheduleChangeRequestSchema.parse(scheduleChangeRequest)).not.toHaveProperty(
      "idempotencyKey",
    );
  });

  it("keeps the claimed capacity but drops any actor or role a command body carries", () => {
    expect(
      acceptScheduleChangeProposalRequestSchema.parse({
        expectedVersion: 2,
        commandKey: " accept-1 ",
        responder: { authority: "organizer", role: "superuser" },
        actorId: "actor-forged",
        role: "organizer",
      }),
    ).toEqual({
      expectedVersion: 2,
      commandKey: "accept-1",
      responder: { authority: "organizer" },
    });
    expect(
      acceptScheduleChangeProposalRequestSchema.safeParse({
        expectedVersion: 0,
        commandKey: "accept-1",
        responder: { authority: "organizer" },
      }).success,
    ).toBe(false);
  });
});
