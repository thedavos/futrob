import { asOrganizationId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { EncounterNotFound } from "../../domain/errors/select-official-matches.errors.ts";
import {
  ACTORS,
  AWAY,
  HOME,
  MemoryOfficialResults,
  MemoryOfficialSelections,
  ScriptedTeamRepresentation,
  createTestCommandDigest,
  slotRefs,
} from "../selection-flow.test-support.ts";
import { SelectOfficialMatchesUseCase } from "../select-official-matches/select-official-matches.use-case.ts";
import {
  KICKOFF_PLUS_24H,
  MemoryEncounterCandidateAssociations,
  MutableEncounterReader,
  WindowedProviderMatchReader,
  allowAll,
  associationIds,
  delegatingAssociations,
  eligibleExternalIds,
  encounterSnapshot,
  fixedClock,
  providerMatch,
} from "../encounter-candidates.test-support.ts";
import { AssociateEncounterCandidatesUseCase } from "../associate-encounter-candidates/associate-encounter-candidates.use-case.ts";
import { RecalculateEncounterCandidatesUseCase } from "./recalculate-encounter-candidates.use-case.ts";

const matches = [
  providerMatch("match-t", "2026-09-14T20:00:00.000Z"),
  providerMatch("match-t24", "2026-09-15T20:00:00.000Z"),
  providerMatch("match-out", "2026-09-14T10:00:00.000Z"),
];

function createHarness() {
  const snapshot = encounterSnapshot();
  const associations = new MemoryEncounterCandidateAssociations();
  const selections = new MemoryOfficialSelections();
  const teams = new ScriptedTeamRepresentation();
  teams.set(ACTORS.homeCaptain, HOME);
  teams.set(ACTORS.awayCaptain, AWAY);
  let ids = 0;
  const encounterReader = new MutableEncounterReader(snapshot);
  const providerMatches = new WindowedProviderMatchReader(matches);
  const persistDeps = {
    encounterReader,
    providerMatches,
    associations,
    clock: fixedClock,
  };
  return {
    snapshot,
    associations,
    selections,
    encounterReader,
    persistDeps,
    associate: new AssociateEncounterCandidatesUseCase(persistDeps),
    recalc: new RecalculateEncounterCandidatesUseCase(persistDeps),
    select: new SelectOfficialMatchesUseCase({
      commandDigest: createTestCommandDigest(),
      encounterReader,
      selections,
      results: new MemoryOfficialResults(),
      associations,
      teamRepresentation: teams,
      eventPublisher: {
        publish: async () => undefined,
        publishMany: async () => undefined,
      },
      authorization: allowAll,
      ids: { generate: () => `sel-${++ids}` },
      clock: fixedClock,
    }),
  };
}

describe("RecalculateEncounterCandidatesUseCase", () => {
  it("recalc-after-reschedule", async () => {
    const harness = createHarness();

    await harness.associate.execute({
      organizationId: asOrganizationId("org-1"),
      encounterId: harness.snapshot.encounterId,
    });
    const selected = await harness.select.execute({
      actorId: ACTORS.homeCaptain,
      organizationId: asOrganizationId("org-1"),
      encounterId: harness.snapshot.encounterId,
      actingTeamId: HOME,
      selections: slotRefs("match-t"),
      expectedVersion: 0,
      commandKey: "k-1",
    });
    expect(selected.isOk()).toBe(true);

    harness.encounterReader.snapshot = {
      ...harness.snapshot,
      scheduledStartAt: KICKOFF_PLUS_24H,
    };
    const recalc = await harness.recalc.execute({ encounterId: harness.snapshot.encounterId });

    expect(recalc.isOk() && recalc.value.status === "associated").toBe(true);
    expect(harness.associations.rows).toHaveLength(2);
    expect(
      harness.associations.rows.find((row) => row.providerMatchRef.externalId === "match-t"),
    ).toMatchObject({
      eligible: false,
      providerMatchRef: { providerKey: "ea-clubs", externalId: "match-t" },
    });
    expect(
      harness.associations.rows.find((row) => row.providerMatchRef.externalId === "match-t24"),
    ).toMatchObject({
      eligible: true,
      providerMatchRef: { providerKey: "ea-clubs", externalId: "match-t24" },
    });
    expect(await harness.selections.findLatestByEncounter(harness.snapshot.encounterId)).toEqual(
      selected.isOk() ? selected.value.selection : null,
    );
    expect(eligibleExternalIds(harness.associations.rows)).toEqual(["match-t24"]);
  });

  it("recalc-replay", async () => {
    const harness = createHarness();
    await harness.associate.execute({
      organizationId: asOrganizationId("org-1"),
      encounterId: harness.snapshot.encounterId,
    });
    harness.encounterReader.snapshot = {
      ...harness.snapshot,
      scheduledStartAt: KICKOFF_PLUS_24H,
    };

    const first = await harness.recalc.execute({ encounterId: harness.snapshot.encounterId });
    const ids = associationIds(harness.associations.rows);
    const eligibility = harness.associations.rows.map((row) => ({
      externalId: row.providerMatchRef.externalId,
      eligible: row.eligible,
    }));
    const second = await harness.recalc.execute({ encounterId: harness.snapshot.encounterId });

    expect(first.isOk() && first.value.status === "associated").toBe(true);
    expect(second.isOk() && second.value.status === "associated").toBe(true);
    expect(harness.associations.rows).toHaveLength(2);
    expect(associationIds(harness.associations.rows)).toEqual(ids);
    expect(
      harness.associations.rows.map((row) => ({
        externalId: row.providerMatchRef.externalId,
        eligible: row.eligible,
      })),
    ).toEqual(eligibility);
  });

  it("does not let an older full-set reconcile overwrite a newer recalc", async () => {
    const harness = createHarness();
    await harness.associate.execute({
      organizationId: asOrganizationId("org-1"),
      encounterId: harness.snapshot.encounterId,
    });

    const inner = harness.associations;
    let newerRecalcRan = false;
    const stale = new RecalculateEncounterCandidatesUseCase({
      ...harness.persistDeps,
      associations: delegatingAssociations(inner, {
        loadForEncounter: async (organizationId, encounterId) => {
          const loaded = await inner.loadForEncounter(organizationId, encounterId);
          if (!newerRecalcRan) {
            newerRecalcRan = true;
            harness.encounterReader.snapshot = {
              ...harness.snapshot,
              scheduledStartAt: KICKOFF_PLUS_24H,
            };
            await harness.recalc.execute({ encounterId: harness.snapshot.encounterId });
          }
          return loaded;
        },
      }),
    });

    const result = await stale.execute({ encounterId: harness.snapshot.encounterId });

    expect(result.isOk() && result.value.status === "associated").toBe(true);
    expect(inner.rows.find((row) => row.providerMatchRef.externalId === "match-t")).toMatchObject({
      eligible: false,
    });
    expect(inner.rows.find((row) => row.providerMatchRef.externalId === "match-t24")).toMatchObject(
      { eligible: true },
    );
    expect(eligibleExternalIds(inner.rows)).toEqual(["match-t24"]);
  });

  it("fails when the encounter is missing", async () => {
    const recalc = new RecalculateEncounterCandidatesUseCase({
      encounterReader: new MutableEncounterReader(null),
      providerMatches: new WindowedProviderMatchReader([]),
      associations: new MemoryEncounterCandidateAssociations(),
      clock: fixedClock,
    });
    const result = await recalc.execute({ encounterId: encounterSnapshot().encounterId });
    expect(result.isErr() && EncounterNotFound.is(result.error)).toBe(true);
  });
});
