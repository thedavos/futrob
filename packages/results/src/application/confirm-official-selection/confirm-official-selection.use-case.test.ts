import { describe, expect, it } from "vite-plus/test";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  type AuthorizationPort,
  type DomainEvent,
  type EventPublisherPort,
} from "@futrob/shared-kernel";
import type { ProviderMatch } from "@futrob/game-data";
import type { OfficialMatchSelection } from "../../domain/entities/official-match-selection.ts";
import type { OfficialResult } from "../../domain/entities/official-result.ts";
import type { EncounterReaderPort } from "../../domain/ports/encounter-reader.port.ts";
import type { ProviderMatchReaderPort } from "../../domain/ports/provider-match-reader.port.ts";
import type {
  OfficialMatchSelectionRepository,
  OfficialResultRepository,
} from "../../domain/ports/official-result.repository.ts";
import { ConfirmOfficialSelectionUseCase } from "./confirm-official-selection.use-case.ts";

const events: DomainEvent[] = [];
const publisher: EventPublisherPort = {
  publish: async (event) => {
    events.push(event);
  },
  publishMany: async (batch) => {
    events.push(...batch);
  },
};

const authorization: AuthorizationPort = {
  async decide(request) {
    return {
      allowed: true,
      permission: request.permission,
      scope: request.scope,
      reason: "allowed",
    };
  },
  async getEffectiveAccess(input) {
    return { actorId: input.actorId, scope: input.scope, roles: [], permissions: [] };
  },
};

const providerMatch: ProviderMatch = {
  id: "ea-clubs:m-1",
  provider: { key: "ea-clubs", externalMatchId: "m-1" },
  game: { edition: "fc26", platform: "common-gen5", mode: "friendlyMatch" },
  occurredAt: new Date("2026-07-01T19:00:00.000Z"),
  home: { externalClubId: "h", name: "Home", goals: 2 },
  away: { externalClubId: "a", name: "Away", goals: 1 },
  players: [
    {
      externalPlayerId: "922546779",
      displayName: "Vcaliari",
      externalClubId: "h",
      position: "midfielder",
      minutesPlayed: 90,
      goals: 1,
      assists: 0,
      shots: 3,
      passAttempts: 20,
      passesMade: 15,
      tackleAttempts: 5,
      tacklesMade: 2,
      saves: null,
      yellowCards: null,
      redCards: 0,
      isMvp: true,
      rating: 8.2,
    },
  ],
  metadata: {
    durationSeconds: null,
    wasDisconnected: false,
    winnerByForfeit: false,
    completeness: "complete",
  },
};

describe("ConfirmOfficialSelectionUseCase", () => {
  it("approves an official result snapshot and emits the event once per revision", async () => {
    events.length = 0;
    const selection: OfficialMatchSelection = {
      id: "sel-1",
      encounterId: asEncounterId("enc-1"),
      status: "awaiting_opponent_confirmation",
      slots: [
        {
          officialSlot: 1,
          providerMatchRef: { providerKey: "ea-clubs", externalId: "m-1" },
        },
      ],
      proposedByActorId: "actor-1",
      proposedAt: new Date("2026-07-01T20:00:00.000Z"),
    };
    const selections: OfficialMatchSelectionRepository = {
      async save(row) {
        Object.assign(selection, row);
        return selection;
      },
      async findLatestByEncounter() {
        return selection;
      },
    };
    const saved: OfficialResult[] = [];
    const results: OfficialResultRepository = {
      async save(result) {
        saved.push(result);
        return result;
      },
      async findApprovedByEncounter() {
        return saved.filter((row) => row.status === "approved").at(-1) ?? null;
      },
      async findLatestByEncounter() {
        return saved.at(-1) ?? null;
      },
      async findById(id) {
        return saved.find((row) => row.id === id) ?? null;
      },
      async listByCompetition(competitionId) {
        return saved.filter((row) => row.competitionId === competitionId);
      },
    };
    const providerMatches: ProviderMatchReaderPort = {
      async listCandidatesForEncounter() {
        return [providerMatch];
      },
      async getByExternalRef() {
        return providerMatch;
      },
    };
    const encounterReader: EncounterReaderPort = {
      async getById() {
        return {
          encounterId: asEncounterId("enc-1"),
          organizationId: asOrganizationId("org-1"),
          competitionId: asCompetitionId("competition-1"),
          homeTeamId: asTeamId("home"),
          awayTeamId: asTeamId("away"),
          scheduledStartAt: new Date("2026-07-01T20:00:00.000Z"),
          officialMatchCount: 1,
          homeExternalClubId: "h",
          awayExternalClubId: "a",
          providerKey: "ea-clubs",
        };
      },
    };

    const useCase = new ConfirmOfficialSelectionUseCase({
      encounterReader,
      selections,
      results,
      providerMatches,
      eventPublisher: publisher,
      authorization,
      ids: { generate: () => "result-1" },
      clock: { now: () => new Date("2026-07-01T22:00:00.000Z") },
    });

    const first = await useCase.execute({
      actorId: asActorId("actor-2"),
      organizationId: asOrganizationId("org-1"),
      encounterId: asEncounterId("enc-1"),
    });
    expect(first.isOk()).toBe(true);
    expect(first.isOk() && first.value.revision).toBe(1);
    expect(first.isOk() && first.value.slots[0]?.players[0]?.externalPlayerId).toBe("922546779");
    expect(events).toHaveLength(1);
    expect(events[0]?.eventName).toBe("results.official-result-approved");
    expect(selection.status).toBe("approved");

    const selectionForRetry: OfficialMatchSelection = {
      ...selection,
      status: "awaiting_opponent_confirmation",
    };
    const selectionsRetry: OfficialMatchSelectionRepository = {
      async save(row) {
        Object.assign(selection, row);
        return selection;
      },
      async findLatestByEncounter() {
        return selectionForRetry;
      },
    };
    const retryUseCase = new ConfirmOfficialSelectionUseCase({
      encounterReader,
      selections: selectionsRetry,
      results,
      providerMatches,
      eventPublisher: publisher,
      authorization,
      ids: { generate: () => "result-2" },
      clock: { now: () => new Date("2026-07-01T22:00:00.000Z") },
    });
    const second = await retryUseCase.execute({
      actorId: asActorId("actor-2"),
      organizationId: asOrganizationId("org-1"),
      encounterId: asEncounterId("enc-1"),
    });
    expect(second.isOk() && second.value.revision).toBe(2);
    expect(events).toHaveLength(2);
  });
});
