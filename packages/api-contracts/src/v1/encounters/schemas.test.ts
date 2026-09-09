import { describe, expect, it } from "vite-plus/test";
import { getMyNextEncounterResponseSchema } from "./schemas.ts";

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
