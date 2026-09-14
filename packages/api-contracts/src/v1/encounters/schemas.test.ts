import { describe, expect, it } from "vite-plus/test";
import {
  getMyNextEncounterResponseSchema,
  listEncounterCandidatesResponseSchema,
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
