import { asOrganizationId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import {
  MemoryEncounterCandidateAssociations,
  MutableEncounterReader,
  WindowedProviderMatchReader,
  eligibleExternalIds,
  encounterSnapshot,
  fixedClock,
  providerMatch,
} from "../encounter-candidates.test-support.ts";
import { AssociateEncounterCandidatesUseCase } from "../associate-encounter-candidates/associate-encounter-candidates.use-case.ts";
import { InvalidateEncounterCandidatesUseCase } from "./invalidate-encounter-candidates.use-case.ts";

const organizationId = asOrganizationId("org-1");

async function associated() {
  const snapshot = encounterSnapshot();
  const associations = new MemoryEncounterCandidateAssociations();
  await new AssociateEncounterCandidatesUseCase({
    encounterReader: new MutableEncounterReader(snapshot),
    providerMatches: new WindowedProviderMatchReader([
      providerMatch("match-t", "2026-09-14T20:00:00.000Z"),
    ]),
    associations,
    clock: fixedClock,
  }).execute({ organizationId, encounterId: snapshot.encounterId });
  const invalidate = new InvalidateEncounterCandidatesUseCase({ associations, clock: fixedClock });
  return { snapshot, associations, invalidate };
}

describe("InvalidateEncounterCandidatesUseCase", () => {
  it("withdraws every eligible candidate and keeps the rows as evidence", async () => {
    const { snapshot, associations, invalidate } = await associated();
    expect(eligibleExternalIds(associations.rows)).toEqual(["match-t"]);

    const outcome = await invalidate.execute({ organizationId, encounterId: snapshot.encounterId });

    expect(outcome.isOk()).toBe(true);
    expect(eligibleExternalIds(associations.rows)).toEqual([]);
    expect(associations.rows.map((row) => row.providerMatchRef.externalId)).toEqual(["match-t"]);
  });

  it("repeating it changes nothing", async () => {
    const { snapshot, associations, invalidate } = await associated();
    await invalidate.execute({ organizationId, encounterId: snapshot.encounterId });
    const afterFirst = [...associations.rows];

    const repeated = await invalidate.execute({
      organizationId,
      encounterId: snapshot.encounterId,
    });

    expect(repeated.isOk()).toBe(true);
    expect(associations.rows).toEqual(afterFirst);
  });
});
