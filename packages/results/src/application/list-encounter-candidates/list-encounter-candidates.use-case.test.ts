import type { ProviderMatch } from "@futrob/game-data";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  type AuthorizationPort,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { CandidateDataUnavailable } from "../../domain/errors/encounter-candidates.errors.ts";
import type { EncounterReaderPort } from "../../domain/ports/encounter-reader.port.ts";
import type {
  CandidateMatchReadResult,
  ProviderMatchReaderPort,
} from "../../domain/ports/provider-match-reader.port.ts";
import { ListEncounterCandidatesUseCase } from "./list-encounter-candidates.use-case.ts";

const encounter = {
  encounterId: asEncounterId("encounter-1"),
  organizationId: asOrganizationId("organization-1"),
  competitionId: asCompetitionId("competition-1"),
  homeTeamId: asTeamId("team-home"),
  awayTeamId: asTeamId("team-away"),
  scheduledStartAt: new Date("2026-09-14T20:00:00.000Z"),
  officialMatchCount: 1 as const,
  homeExternalClubId: null,
  awayExternalClubId: null,
  providerKey: null,
};

const providerMatch: ProviderMatch = {
  id: "provider-match-1",
  provider: { key: "ea-clubs", externalMatchId: "external-match-1" },
  game: { edition: "FC 26", platform: "common-gen5", mode: "clubs" },
  occurredAt: new Date("2026-09-14T21:30:00.000Z"),
  home: {
    externalClubId: "club-away",
    name: "Away Club",
    goals: 2,
    imageUrl: "https://images.example/away.png",
  },
  away: {
    externalClubId: "club-home",
    name: "Home Club",
    goals: 3,
    imageUrl: null,
  },
  players: [
    {
      externalPlayerId: "player-1",
      displayName: "Player One",
      externalClubId: "club-home",
      position: "midfielder",
      minutesPlayed: 90,
      goals: 1,
      assists: 2,
      shots: 3,
      passAttempts: 20,
      passesMade: 18,
      tackleAttempts: 4,
      tacklesMade: 3,
      saves: 0,
      yellowCards: 0,
      redCards: 0,
      isMvp: true,
      rating: 8.7,
    },
  ],
  metadata: {
    durationSeconds: 720,
    wasDisconnected: false,
    winnerByForfeit: false,
    completeness: "complete",
  },
};

const baseInput = {
  actorId: asActorId("actor-1"),
  organizationId: encounter.organizationId,
  encounterId: encounter.encounterId,
};

function encounterReaderWith(
  value: Awaited<ReturnType<EncounterReaderPort["getById"]>>,
): EncounterReaderPort {
  return { getById: async () => value };
}

function authorizationWith(allowed: boolean): AuthorizationPort {
  return {
    async decide(request) {
      return {
        allowed,
        permission: request.permission,
        scope: request.scope,
        reason: allowed ? "allowed" : "denied",
      };
    },
    async getEffectiveAccess(input) {
      return { actorId: input.actorId, scope: input.scope, roles: [], permissions: [] };
    },
  };
}

function providerReaderWith(result: CandidateMatchReadResult): ProviderMatchReaderPort {
  return {
    listCandidatesForEncounter: async () => result,
    getByExternalRef: async () => null,
  };
}

function createUseCase(
  candidateResult: CandidateMatchReadResult,
  options: {
    encounterReader?: EncounterReaderPort;
    authorization?: AuthorizationPort;
  } = {},
) {
  return new ListEncounterCandidatesUseCase({
    encounterReader: options.encounterReader ?? encounterReaderWith(encounter),
    providerMatches: providerReaderWith(candidateResult),
    authorization: options.authorization ?? authorizationWith(true),
  });
}

describe("ListEncounterCandidatesUseCase", () => {
  it("returns safe candidate summaries and the inclusive compatibility window", async () => {
    const useCase = createUseCase({ status: "ready", matches: [providerMatch] });

    const result = await useCase.execute(baseInput);

    expect(result.isOk()).toBe(true);
    expect(result.isOk() && result.value).toEqual({
      status: "ready",
      window: {
        from: new Date("2026-09-14T02:00:00.000Z"),
        to: new Date("2026-09-15T14:00:00.000Z"),
      },
      candidates: [
        {
          reference: { providerKey: "ea-clubs", externalId: "external-match-1" },
          occurredAt: new Date("2026-09-14T21:30:00.000Z"),
          home: {
            externalClubId: "club-away",
            name: "Away Club",
            goals: 2,
            imageUrl: "https://images.example/away.png",
          },
          away: {
            externalClubId: "club-home",
            name: "Home Club",
            goals: 3,
            imageUrl: null,
          },
          game: { edition: "FC 26", platform: "common-gen5", mode: "clubs" },
          metadata: {
            durationSeconds: 720,
            wasDisconnected: false,
            winnerByForfeit: false,
            completeness: "complete",
          },
          playerObservationCount: 1,
        },
      ],
    });
  });

  it("distinguishes a ready empty list from connection states", async () => {
    const empty = await createUseCase({ status: "ready", matches: [] }).execute(baseInput);
    const notConnected = await createUseCase({
      status: "clubs_not_connected",
      sides: ["away"],
    }).execute(baseInput);
    const mismatch = await createUseCase({ status: "provider_mismatch" }).execute(baseInput);

    expect(empty.isOk() && empty.value).toEqual({
      status: "ready",
      window: {
        from: new Date("2026-09-14T02:00:00.000Z"),
        to: new Date("2026-09-15T14:00:00.000Z"),
      },
      candidates: [],
    });
    expect(notConnected.isOk() && notConnected.value).toEqual({
      status: "clubs_not_connected",
      sides: ["away"],
    });
    expect(mismatch.isOk() && mismatch.value).toEqual({ status: "provider_mismatch" });
  });

  it("maps candidate persistence failures to a stable safe error", async () => {
    const providerMatches: ProviderMatchReaderPort = {
      listCandidatesForEncounter: async () => {
        throw new Error("private provider failure details");
      },
      getByExternalRef: async () => null,
    };
    const useCase = new ListEncounterCandidatesUseCase({
      encounterReader: encounterReaderWith(encounter),
      providerMatches,
      authorization: authorizationWith(true),
    });

    const result = await useCase.execute(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result.isErr() && CandidateDataUnavailable.is(result.error)).toBe(true);
    expect(result.isErr() && { code: result.error.code, message: result.error.message }).toEqual({
      code: "results.candidate_data_unavailable",
      message: "Candidate data is temporarily unavailable",
    });
  });

  it("hides encounters from another organization before reading candidates", async () => {
    const result = await createUseCase(
      { status: "ready", matches: [providerMatch] },
      {
        encounterReader: encounterReaderWith({
          ...encounter,
          organizationId: asOrganizationId("organization-2"),
        }),
      },
    ).execute(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error.code).toBe("results.encounter_not_found");
  });

  it("rejects actors without official-selection proposal access", async () => {
    const result = await createUseCase(
      { status: "ready", matches: [providerMatch] },
      { authorization: authorizationWith(false) },
    ).execute(baseInput);

    expect(result.isErr()).toBe(true);
    expect(result.isErr() && result.error.code).toBe("results.official_selection_forbidden");
  });
});
