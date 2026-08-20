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
import type { EncounterReaderPort } from "../../domain/ports/encounter-reader.port.ts";
import type { OfficialMatchSelectionRepository } from "../../domain/ports/official-result.repository.ts";
import type { OfficialMatchSelection } from "../../domain/entities/official-match-selection.ts";
import {
  DuplicateProviderMatch,
  EncounterNotFound,
  InvalidSelection,
} from "../../domain/errors/select-official-matches.errors.ts";
import { SelectOfficialMatchesUseCase } from "./select-official-matches.use-case.ts";

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

function readerWith(
  snapshot: Awaited<ReturnType<EncounterReaderPort["getById"]>>,
): EncounterReaderPort {
  return {
    getById: async () => snapshot,
  };
}

class MemorySelections implements OfficialMatchSelectionRepository {
  rows: OfficialMatchSelection[] = [];
  async save(selection: OfficialMatchSelection) {
    this.rows = this.rows.filter((row) => row.id !== selection.id);
    this.rows.push(selection);
    return selection;
  }
  async findLatestByEncounter(encounterId: OfficialMatchSelection["encounterId"]) {
    return [...this.rows].reverse().find((row) => row.encounterId === encounterId) ?? null;
  }
}

const sharedDeps = {
  eventPublisher: publisher,
  authorization,
  ids: { generate: () => "sel-1" },
  clock: { now: () => new Date("2026-07-01T21:00:00.000Z") },
};

describe("SelectOfficialMatchesUseCase", () => {
  const baseInput = {
    actorId: asActorId("actor-1"),
    organizationId: asOrganizationId("org-1"),
    encounterId: asEncounterId("enc-1"),
  };

  it("fails when the encounter is missing", async () => {
    const useCase = new SelectOfficialMatchesUseCase({
      encounterReader: readerWith(null),
      selections: new MemorySelections(),
      ...sharedDeps,
    });

    const result = await useCase.execute({
      ...baseInput,
      selections: [
        {
          officialSlot: 1,
          providerMatchRef: { providerKey: "ea-clubs", externalId: "m-1" },
        },
      ],
    });

    expect(result.isOk()).toBe(false);
    expect(!result.isOk() && EncounterNotFound.is(result.error)).toBe(true);
  });

  it("fails when selection count does not match official slots", async () => {
    const useCase = new SelectOfficialMatchesUseCase({
      encounterReader: readerWith({
        encounterId: asEncounterId("enc-1"),
        organizationId: asOrganizationId("org-1"),
        competitionId: asCompetitionId("competition-1"),
        homeTeamId: asTeamId("home"),
        awayTeamId: asTeamId("away"),
        scheduledStartAt: new Date("2026-07-01T20:00:00.000Z"),
        officialMatchCount: 2,
        homeExternalClubId: "h",
        awayExternalClubId: "a",
        providerKey: "ea-clubs",
      }),
      selections: new MemorySelections(),
      ...sharedDeps,
    });

    const result = await useCase.execute({
      ...baseInput,
      selections: [
        {
          officialSlot: 1,
          providerMatchRef: { providerKey: "ea-clubs", externalId: "m-1" },
        },
      ],
    });

    expect(result.isOk()).toBe(false);
    expect(!result.isOk() && InvalidSelection.is(result.error)).toBe(true);
  });

  it("fails when the same provider match fills two slots", async () => {
    const useCase = new SelectOfficialMatchesUseCase({
      encounterReader: readerWith({
        encounterId: asEncounterId("enc-1"),
        organizationId: asOrganizationId("org-1"),
        competitionId: asCompetitionId("competition-1"),
        homeTeamId: asTeamId("home"),
        awayTeamId: asTeamId("away"),
        scheduledStartAt: new Date("2026-07-01T20:00:00.000Z"),
        officialMatchCount: 2,
        homeExternalClubId: "h",
        awayExternalClubId: "a",
        providerKey: "ea-clubs",
      }),
      selections: new MemorySelections(),
      ...sharedDeps,
    });

    const result = await useCase.execute({
      ...baseInput,
      selections: [
        {
          officialSlot: 1,
          providerMatchRef: { providerKey: "ea-clubs", externalId: "m-1" },
        },
        {
          officialSlot: 2,
          providerMatchRef: { providerKey: "ea-clubs", externalId: "m-1" },
        },
      ],
    });

    expect(result.isOk()).toBe(false);
    expect(!result.isOk() && DuplicateProviderMatch.is(result.error)).toBe(true);
  });

  it("persists an awaiting-confirmation selection when valid", async () => {
    events.length = 0;
    const selections = new MemorySelections();
    const useCase = new SelectOfficialMatchesUseCase({
      encounterReader: readerWith({
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
      }),
      selections,
      ...sharedDeps,
    });

    const result = await useCase.execute({
      ...baseInput,
      selections: [
        {
          officialSlot: 1,
          providerMatchRef: { providerKey: "ea-clubs", externalId: "m-1" },
        },
      ],
    });

    expect(result.isOk()).toBe(true);
    expect(result.isOk() && result.value).toEqual({
      id: "sel-1",
      encounterId: "enc-1",
      status: "awaiting_opponent_confirmation",
      proposedByActorId: "actor-1",
      proposedAt: new Date("2026-07-01T21:00:00.000Z"),
      slots: [
        {
          officialSlot: 1,
          providerMatchRef: { providerKey: "ea-clubs", externalId: "m-1" },
        },
      ],
    });
    expect(selections.rows).toHaveLength(1);
    expect(events[0]?.eventName).toBe("results.official-matches-selected");
  });
});
