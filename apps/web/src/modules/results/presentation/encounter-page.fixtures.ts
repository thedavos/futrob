import type {
  EncounterCandidateDto,
  EncounterViewDto,
  ListEncounterCandidatesResponse,
} from "@futrob/api-contracts";

const club = (externalClubId: string, name: string) => ({
  providerKey: "ea-clubs" as const,
  externalClubId,
  name,
  platform: "common-gen5",
  gameEdition: "FC 26",
  imageUrl: null,
});

export function encounterView(overrides: Partial<EncounterViewDto> = {}): EncounterViewDto {
  return {
    encounterId: "encounter-1",
    competition: {
      id: "competition-1",
      organizationId: "org-1",
      name: "Liga Futrob",
      timeZone: "America/Lima",
    },
    round: { number: 4, total: 9 },
    scheduledStartAt: "2026-09-15T01:00:00.000Z",
    officialMatchCount: 2,
    home: {
      teamId: "team-home",
      name: "Cuervos FC",
      externalClub: club("club-cuervos", "Cuervos EA"),
    },
    away: {
      teamId: "team-away",
      name: "Maderas FC",
      externalClub: club("club-maderas", "Maderas EA"),
    },
    resolutionMode: "aggregate_score",
    officialMatches: [
      { officialSlot: 1, scheduledStartAt: "2026-09-15T01:00:00.000Z" },
      { officialSlot: 2, scheduledStartAt: "2026-09-17T01:30:00.000Z" },
    ],
    ...overrides,
  };
}

export function candidate(
  externalId: string,
  occurredAt: string,
  home: readonly [string, string, number],
  away: readonly [string, string, number],
  metadata: Partial<EncounterCandidateDto["metadata"]> = {},
): EncounterCandidateDto {
  const side = ([externalClubId, name, goals]: readonly [string, string, number]) => ({
    externalClubId,
    name,
    goals,
    imageUrl: null,
  });
  return {
    reference: { providerKey: "ea-clubs", externalId },
    occurredAt,
    home: side(home),
    away: side(away),
    game: { edition: "FC 26", platform: "common-gen5", mode: "clubs" },
    metadata: {
      durationSeconds: 720,
      wasDisconnected: false,
      winnerByForfeit: false,
      completeness: "complete",
      ...metadata,
    },
    playerObservationCount: 22,
  };
}

export const m1 = candidate(
  "m-1",
  "2026-09-15T01:05:00.000Z",
  ["club-cuervos", "Cuervos EA", 1],
  ["club-maderas", "Maderas EA", 0],
);
/** Played with Maderas as the EA home side: 2–0 for Maderas. */
export const m2 = candidate(
  "m-2",
  "2026-09-17T01:40:00.000Z",
  ["club-maderas", "Maderas EA", 2],
  ["club-cuervos", "Cuervos EA", 0],
);
export const m3 = candidate(
  "m-3",
  "2026-09-15T01:50:00.000Z",
  ["club-cuervos", "Cuervos EA", 3],
  ["club-maderas", "Maderas EA", 3],
);
/** A disconnect cut it short and EA returned partial data. */
export const m4 = candidate(
  "m-4",
  "2026-09-17T02:10:00.000Z",
  ["club-cuervos", "Cuervos EA", 0],
  ["club-maderas", "Maderas EA", 1],
  { durationSeconds: null, wasDisconnected: true, completeness: "partial" },
);

export const readyCandidates = (
  candidates: EncounterCandidateDto[],
): ListEncounterCandidatesResponse => ({
  status: "ready",
  window: { from: "2026-09-14T19:00:00.000Z", to: "2026-09-17T07:30:00.000Z" },
  candidates,
});
