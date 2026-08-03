import { describe, expect, it } from "vite-plus/test";
import { asActorId, asEncounterId, asOrganizationId } from "@futrob/shared-kernel";
import type { EventPublisherPort } from "@futrob/shared-kernel";
import type { EncounterReaderPort } from "../../domain/ports/encounter-reader.port.ts";
import {
  DuplicateProviderMatch,
  EncounterNotFound,
  InvalidSelection,
} from "../../domain/errors/select-official-matches.errors.ts";
import { SelectOfficialMatchesUseCase } from "./select-official-matches.use-case.ts";

const publisher: EventPublisherPort = {
  publish: async () => undefined,
  publishMany: async () => undefined,
};

function readerWith(
  snapshot: Awaited<ReturnType<EncounterReaderPort["getById"]>>,
): EncounterReaderPort {
  return {
    getById: async () => snapshot,
  };
}

describe("SelectOfficialMatchesUseCase", () => {
  const baseInput = {
    actorId: asActorId("actor-1"),
    organizationId: asOrganizationId("org-1"),
    encounterId: asEncounterId("enc-1"),
  };

  it("fails when the encounter is missing", async () => {
    const useCase = new SelectOfficialMatchesUseCase({
      encounterReader: readerWith(null),
      eventPublisher: publisher,
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
    expect(!result.isOk() && result.error.code).toBe("results.encounter_not_found");
    expect(!result.isOk() && EncounterNotFound.is(result.error) && result.error.encounterId).toBe(
      "enc-1",
    );
  });

  it("fails when selection count does not match official slots", async () => {
    const useCase = new SelectOfficialMatchesUseCase({
      encounterReader: readerWith({
        encounterId: asEncounterId("enc-1"),
        homeTeamId: "home",
        awayTeamId: "away",
        scheduledStartAt: new Date("2026-07-01T20:00:00.000Z"),
        officialMatchCount: 2,
        homeExternalClubId: "h",
        awayExternalClubId: "a",
        providerKey: "ea-clubs",
      }),
      eventPublisher: publisher,
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
    expect(!result.isOk() && InvalidSelection.is(result.error) && result.error.expected).toBe(2);
    expect(!result.isOk() && InvalidSelection.is(result.error) && result.error.received).toBe(1);
  });

  it("fails when the same provider match fills two slots", async () => {
    const useCase = new SelectOfficialMatchesUseCase({
      encounterReader: readerWith({
        encounterId: asEncounterId("enc-1"),
        homeTeamId: "home",
        awayTeamId: "away",
        scheduledStartAt: new Date("2026-07-01T20:00:00.000Z"),
        officialMatchCount: 2,
        homeExternalClubId: "h",
        awayExternalClubId: "a",
        providerKey: "ea-clubs",
      }),
      eventPublisher: publisher,
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
    expect(!result.isOk() && result.error.code).toBe("results.duplicate_provider_match");
  });

  it("returns an awaiting-confirmation selection when valid", async () => {
    const useCase = new SelectOfficialMatchesUseCase({
      encounterReader: readerWith({
        encounterId: asEncounterId("enc-1"),
        homeTeamId: "home",
        awayTeamId: "away",
        scheduledStartAt: new Date("2026-07-01T20:00:00.000Z"),
        officialMatchCount: 1,
        homeExternalClubId: "h",
        awayExternalClubId: "a",
        providerKey: "ea-clubs",
      }),
      eventPublisher: publisher,
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
      id: "pending",
      encounterId: "enc-1",
      status: "awaiting_opponent_confirmation",
      proposedByActorId: "actor-1",
      proposedAt: expect.any(Date),
      slots: [
        {
          officialSlot: 1,
          providerMatchRef: { providerKey: "ea-clubs", externalId: "m-1" },
        },
      ],
    });
  });
});
