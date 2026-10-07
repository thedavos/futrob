import { describe, expect, it } from "vite-plus/test";
import { asActorId } from "@futrob/shared-kernel";
import { CandidateNotAssociated } from "../../domain/errors/select-official-matches.errors.ts";
import {
  KICKOFF_PLUS_24H,
  MemoryEncounterCandidateAssociations,
  MutableEncounterReader,
  WindowedProviderMatchReader,
  allowAll,
  delegatingAssociations,
  encounterSnapshot,
  fixedClock,
  providerMatch,
} from "../encounter-candidates.test-support.ts";
import {
  ACTORS,
  AWAY,
  HOME,
  MemoryOfficialSelections,
  MemoryOfficialResults,
  ScriptedTeamRepresentation,
  createTestCommandDigest,
  slotRefs,
} from "../selection-flow.test-support.ts";
import { AssociateEncounterCandidatesUseCase } from "../associate-encounter-candidates/associate-encounter-candidates.use-case.ts";
import { RecalculateEncounterCandidatesUseCase } from "../recalculate-encounter-candidates/recalculate-encounter-candidates.use-case.ts";
import { SelectOfficialMatchesUseCase } from "./select-official-matches.use-case.ts";

const publisher = {
  publish: async () => undefined,
  publishMany: async () => undefined,
};

function representation() {
  const teams = new ScriptedTeamRepresentation();
  teams.set(ACTORS.homeCaptain, HOME);
  teams.set(ACTORS.awayCaptain, AWAY);
  return teams;
}

function proposeInput(snapshot: ReturnType<typeof encounterSnapshot>, externalId: string, n = 1) {
  return {
    actorId: asActorId(ACTORS.homeCaptain),
    organizationId: snapshot.organizationId,
    encounterId: snapshot.encounterId,
    actingTeamId: HOME,
    selections: slotRefs(externalId),
    expectedVersion: n - 1,
    commandKey: `k-${externalId}-${n}`,
  };
}

function counterIds(prefix: string) {
  let n = 0;
  return { generate: () => `${prefix}-${++n}` };
}

describe("SelectOfficialMatchesUseCase candidate eligibility", () => {
  it("select-requires-associated-candidate", async () => {
    const snapshot = encounterSnapshot();
    const associations = new MemoryEncounterCandidateAssociations();
    const selections = new MemoryOfficialSelections();
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
      commandDigest: createTestCommandDigest(),
      encounterReader,
      selections,
      results: new MemoryOfficialResults(),
      associations,
      teamRepresentation: representation(),
      eventPublisher: publisher,
      authorization: allowAll,
      ids: counterIds("sel"),
      clock: fixedClock,
    });

    await associate.execute({
      organizationId: snapshot.organizationId,
      encounterId: snapshot.encounterId,
    });
    const beforeReschedule = await select.execute(proposeInput(snapshot, "match-out"));
    expect(beforeReschedule.isErr() && beforeReschedule.error.code).toBe(
      "results.candidate_not_associated",
    );

    encounterReader.snapshot = { ...snapshot, scheduledStartAt: KICKOFF_PLUS_24H };
    await recalc.execute({
      organizationId: snapshot.organizationId,
      encounterId: snapshot.encounterId,
    });
    const afterReschedule = await select.execute(proposeInput(snapshot, "match-t"));

    expect(afterReschedule.isOk()).toBe(false);
    expect(!afterReschedule.isOk() && CandidateNotAssociated.is(afterReschedule.error)).toBe(true);
    expect(!afterReschedule.isOk() && afterReschedule.error.code).toBe(
      "results.candidate_not_associated",
    );
    expect(selections.selections.size).toBe(0);
  });

  it("fails select when recalc marks the candidate ineligible before save", async () => {
    const snapshot = encounterSnapshot();
    const inner = new MemoryEncounterCandidateAssociations();
    const selections = new MemoryOfficialSelections();
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
      await recalc.execute({
        organizationId: snapshot.organizationId,
        encounterId: snapshot.encounterId,
      });
    };
    const select = new SelectOfficialMatchesUseCase({
      commandDigest: createTestCommandDigest(),
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
      results: new MemoryOfficialResults(),
      teamRepresentation: representation(),
      eventPublisher: publisher,
      authorization: allowAll,
      ids: counterIds("sel-race"),
      clock: fixedClock,
    });

    await associate.execute({
      organizationId: snapshot.organizationId,
      encounterId: snapshot.encounterId,
    });
    const result = await select.execute(proposeInput(snapshot, "match-t"));

    expect(result.isOk()).toBe(false);
    expect(!result.isOk() && CandidateNotAssociated.is(result.error)).toBe(true);
    expect(selections.selections.size).toBe(0);
  });
});
