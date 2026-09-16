import { describe, expect, it } from "vite-plus/test";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  type DomainEvent,
  type EventPublisherPort,
} from "@futrob/shared-kernel";
import {
  asEncounterStageId,
  type EncounterReaderPort,
} from "../../domain/ports/encounter-reader.port.ts";
import {
  CandidateNotAssociated,
  DuplicateProviderMatch,
  EncounterNotFound,
  InvalidSelection,
} from "../../domain/errors/select-official-matches.errors.ts";
import { SelectOfficialMatchesUseCase } from "./select-official-matches.use-case.ts";
import {
  KICKOFF_PLUS_24H,
  MemoryEncounterCandidateAssociations,
  MemorySelections,
  MutableEncounterReader,
  WindowedProviderMatchReader,
  allowAll,
  delegatingAssociations,
  encounterSnapshot,
  fixedClock,
  providerMatch,
} from "../encounter-candidates.test-support.ts";
import { AssociateEncounterCandidatesUseCase } from "../associate-encounter-candidates/associate-encounter-candidates.use-case.ts";
import { RecalculateEncounterCandidatesUseCase } from "../recalculate-encounter-candidates/recalculate-encounter-candidates.use-case.ts";
import { encounterCandidateAssociationId } from "../../domain/policies/reconcile-candidate-associations.ts";

const events: DomainEvent[] = [];
const publisher: EventPublisherPort = {
  publish: async (event) => {
    events.push(event);
  },
  publishMany: async (batch) => {
    events.push(...batch);
  },
};

function readerWith(
  snapshot: Awaited<ReturnType<EncounterReaderPort["getById"]>>,
): EncounterReaderPort {
  return {
    getById: async () => snapshot,
  };
}

async function associationsWith(
  encounter: NonNullable<Awaited<ReturnType<EncounterReaderPort["getById"]>>>,
  externalId: string,
) {
  const associations = new MemoryEncounterCandidateAssociations();
  const providerMatchRef = { providerKey: "ea-clubs" as const, externalId };
  await associations.replaceForEncounter(
    encounter.organizationId,
    encounter.encounterId,
    [
      {
        id: encounterCandidateAssociationId(
          encounter.organizationId,
          encounter.encounterId,
          providerMatchRef,
        ),
        organizationId: encounter.organizationId,
        encounterId: encounter.encounterId,
        providerMatchRef,
        eligible: true,
        associatedAt: new Date("2026-07-01T20:00:00.000Z"),
        lastEvaluatedAt: new Date("2026-07-01T20:00:00.000Z"),
      },
    ],
    0,
  );
  return associations;
}

const sharedDeps = {
  eventPublisher: publisher,
  authorization: allowAll,
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
      associations: new MemoryEncounterCandidateAssociations(),
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
    const snapshot = {
      encounterId: asEncounterId("enc-1"),
      organizationId: asOrganizationId("org-1"),
      competitionId: asCompetitionId("competition-1"),
      stageId: asEncounterStageId("stage-1"),
      homeTeamId: asTeamId("home"),
      awayTeamId: asTeamId("away"),
      scheduledStartAt: new Date("2026-07-01T20:00:00.000Z"),
      officialMatchCount: 2 as const,
      homeExternalClubId: "h",
      awayExternalClubId: "a",
      providerKey: "ea-clubs",
    };
    const useCase = new SelectOfficialMatchesUseCase({
      encounterReader: readerWith(snapshot),
      selections: new MemorySelections(),
      associations: await associationsWith(snapshot, "m-1"),
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
    const snapshot = {
      encounterId: asEncounterId("enc-1"),
      organizationId: asOrganizationId("org-1"),
      competitionId: asCompetitionId("competition-1"),
      stageId: asEncounterStageId("stage-1"),
      homeTeamId: asTeamId("home"),
      awayTeamId: asTeamId("away"),
      scheduledStartAt: new Date("2026-07-01T20:00:00.000Z"),
      officialMatchCount: 2 as const,
      homeExternalClubId: "h",
      awayExternalClubId: "a",
      providerKey: "ea-clubs",
    };
    const useCase = new SelectOfficialMatchesUseCase({
      encounterReader: readerWith(snapshot),
      selections: new MemorySelections(),
      associations: await associationsWith(snapshot, "m-1"),
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
    const snapshot = {
      encounterId: asEncounterId("enc-1"),
      organizationId: asOrganizationId("org-1"),
      competitionId: asCompetitionId("competition-1"),
      stageId: asEncounterStageId("stage-1"),
      homeTeamId: asTeamId("home"),
      awayTeamId: asTeamId("away"),
      scheduledStartAt: new Date("2026-07-01T20:00:00.000Z"),
      officialMatchCount: 1 as const,
      homeExternalClubId: "h",
      awayExternalClubId: "a",
      providerKey: "ea-clubs",
    };
    const selections = new MemorySelections();
    const useCase = new SelectOfficialMatchesUseCase({
      encounterReader: readerWith(snapshot),
      selections,
      associations: await associationsWith(snapshot, "m-1"),
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

  it("select-requires-associated-candidate", async () => {
    const snapshot = encounterSnapshot();
    const associations = new MemoryEncounterCandidateAssociations();
    const selections = new MemorySelections();
    const encounterReader = new MutableEncounterReader(snapshot);
    const persistDeps = {
      encounterReader,
      providerMatches: new WindowedProviderMatchReader([
        providerMatch("match-t", "2026-09-14T20:00:00.000Z"),
        providerMatch("match-t24", "2026-09-15T20:00:00.000Z"),
        providerMatch("match-out", "2026-09-14T10:00:00.000Z"),
      ]),
      associations,
      clock: fixedClock,
    };
    const associate = new AssociateEncounterCandidatesUseCase(persistDeps);
    const recalc = new RecalculateEncounterCandidatesUseCase(persistDeps);
    const select = new SelectOfficialMatchesUseCase({
      encounterReader,
      selections,
      associations,
      eventPublisher: publisher,
      authorization: allowAll,
      ids: { generate: () => "sel-1" },
      clock: fixedClock,
    });

    await associate.execute({
      organizationId: snapshot.organizationId,
      encounterId: snapshot.encounterId,
    });
    const original = await select.execute({
      actorId: asActorId("actor-1"),
      organizationId: snapshot.organizationId,
      encounterId: snapshot.encounterId,
      selections: [
        {
          officialSlot: 1,
          providerMatchRef: { providerKey: "ea-clubs", externalId: "match-t" },
        },
      ],
    });
    expect(original.isOk()).toBe(true);

    encounterReader.snapshot = { ...snapshot, scheduledStartAt: KICKOFF_PLUS_24H };
    await recalc.execute({ encounterId: snapshot.encounterId });

    const rejected = await select.execute({
      actorId: asActorId("actor-1"),
      organizationId: snapshot.organizationId,
      encounterId: snapshot.encounterId,
      selections: [
        {
          officialSlot: 1,
          providerMatchRef: { providerKey: "ea-clubs", externalId: "match-out" },
        },
      ],
    });

    expect(rejected.isOk()).toBe(false);
    expect(!rejected.isOk() && CandidateNotAssociated.is(rejected.error)).toBe(true);
    expect(!rejected.isOk() && rejected.error.code).toBe("results.candidate_not_associated");
    expect(await selections.findLatestByEncounter(snapshot.encounterId)).toEqual(
      original.isOk() ? original.value : null,
    );
  });

  it("fails select when recalc marks the candidate ineligible before save", async () => {
    const snapshot = encounterSnapshot();
    const inner = new MemoryEncounterCandidateAssociations();
    const selections = new MemorySelections();
    const encounterReader = new MutableEncounterReader(snapshot);
    const persistDeps = {
      encounterReader,
      providerMatches: new WindowedProviderMatchReader([
        providerMatch("match-t", "2026-09-14T20:00:00.000Z"),
        providerMatch("match-t24", "2026-09-15T20:00:00.000Z"),
        providerMatch("match-out", "2026-09-14T10:00:00.000Z"),
      ]),
      associations: inner,
      clock: fixedClock,
    };
    const associate = new AssociateEncounterCandidatesUseCase(persistDeps);
    const recalc = new RecalculateEncounterCandidatesUseCase(persistDeps);
    let recalcRan = false;
    const runRecalc = async () => {
      if (recalcRan) return;
      recalcRan = true;
      encounterReader.snapshot = { ...snapshot, scheduledStartAt: KICKOFF_PLUS_24H };
      await recalc.execute({ encounterId: snapshot.encounterId });
    };
    const select = new SelectOfficialMatchesUseCase({
      encounterReader,
      selections,
      associations: delegatingAssociations(inner, {
        findByRef: async (organizationId, encounterId, providerMatchRef) => {
          const found = await inner.findByRef(organizationId, encounterId, providerMatchRef);
          if (found?.eligible) await runRecalc();
          return found;
        },
        writeIfEligible: async (organizationId, encounterId, requiredRefs, write) => {
          await runRecalc();
          return inner.writeIfEligible(organizationId, encounterId, requiredRefs, write);
        },
      }),
      eventPublisher: publisher,
      authorization: allowAll,
      ids: { generate: () => "sel-race" },
      clock: fixedClock,
    });

    await associate.execute({
      organizationId: snapshot.organizationId,
      encounterId: snapshot.encounterId,
    });
    const result = await select.execute({
      actorId: asActorId("actor-1"),
      organizationId: snapshot.organizationId,
      encounterId: snapshot.encounterId,
      selections: [
        {
          officialSlot: 1,
          providerMatchRef: { providerKey: "ea-clubs", externalId: "match-t" },
        },
      ],
    });

    expect(result.isOk()).toBe(false);
    expect(!result.isOk() && CandidateNotAssociated.is(result.error)).toBe(true);
    expect(selections.rows).toHaveLength(0);
  });
});
