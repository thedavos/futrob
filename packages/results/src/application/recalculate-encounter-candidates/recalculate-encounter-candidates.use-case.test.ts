import { asActorId, asOrganizationId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { SelectOfficialMatchesUseCase } from "../select-official-matches/select-official-matches.use-case.ts";
import {
  KICKOFF_PLUS_24H,
  MemoryEncounterCandidateAssociations,
  MemorySelections,
  MutableEncounterReader,
  WindowedProviderMatchReader,
  allowAll,
  associationIds,
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
  const selections = new MemorySelections();
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
    associate: new AssociateEncounterCandidatesUseCase(persistDeps),
    recalc: new RecalculateEncounterCandidatesUseCase(persistDeps),
    select: new SelectOfficialMatchesUseCase({
      encounterReader,
      selections,
      associations,
      eventPublisher: {
        publish: async () => undefined,
        publishMany: async () => undefined,
      },
      authorization: allowAll,
      ids: { generate: () => "sel-1" },
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
      actorId: asActorId("actor-1"),
      organizationId: asOrganizationId("org-1"),
      encounterId: harness.snapshot.encounterId,
      selections: [
        {
          officialSlot: 1,
          providerMatchRef: { providerKey: "ea-clubs", externalId: "match-t" },
        },
      ],
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
      selected.isOk() ? selected.value : null,
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
});
