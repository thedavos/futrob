import { asActorId, asOrganizationId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { ListEncounterCandidatesUseCase } from "../list-encounter-candidates/list-encounter-candidates.use-case.ts";
import {
  MemoryEncounterCandidateAssociations,
  MutableEncounterReader,
  NOW,
  WindowedProviderMatchReader,
  allowAll,
  associationIds,
  encounterSnapshot,
  fixedClock,
  providerMatch,
} from "../encounter-candidates.test-support.ts";
import { AssociateEncounterCandidatesUseCase } from "./associate-encounter-candidates.use-case.ts";

const matches = [
  providerMatch("in-from", "2026-09-14T14:00:00.000Z"),
  providerMatch("in-to", "2026-09-15T02:00:00.000Z"),
  providerMatch("outside", "2026-09-14T13:59:59.999Z"),
];

function createHarness() {
  const associations = new MemoryEncounterCandidateAssociations();
  const encounterReader = new MutableEncounterReader(encounterSnapshot());
  const providerMatches = new WindowedProviderMatchReader(matches);
  const associate = new AssociateEncounterCandidatesUseCase({
    encounterReader,
    providerMatches,
    associations,
    clock: fixedClock,
  });
  const list = new ListEncounterCandidatesUseCase({
    encounterReader,
    providerMatches,
    authorization: allowAll,
  });
  return { associations, associate, list };
}

describe("AssociateEncounterCandidatesUseCase", () => {
  it("assoc-persist-window", async () => {
    const { associations, associate, list } = createHarness();

    const associated = await associate.execute({
      organizationId: asOrganizationId("org-1"),
      encounterId: encounterSnapshot().encounterId,
    });
    const listed = await list.execute({
      actorId: asActorId("actor-1"),
      organizationId: asOrganizationId("org-1"),
      encounterId: encounterSnapshot().encounterId,
    });

    expect(associated.isOk() && associated.value.status === "associated").toBe(true);
    expect(associations.rows).toHaveLength(2);
    expect(associations.rows.map((row) => row.providerMatchRef.externalId).sort()).toEqual([
      "in-from",
      "in-to",
    ]);
    expect(listed.isOk() && listed.value.status === "ready").toBe(true);
    expect(
      listed.isOk() && listed.value.status === "ready" ? listed.value.candidates.length : -1,
    ).toBe(2);
    expect(
      listed.isOk() && listed.value.status === "ready"
        ? listed.value.candidates.map((candidate) => candidate.reference.externalId).sort()
        : [],
    ).toEqual(["in-from", "in-to"]);
    expect(listed.isOk() && listed.value.status === "ready" ? listed.value.window : null).toEqual({
      from: new Date("2026-09-14T14:00:00.000Z"),
      to: new Date("2026-09-15T02:00:00.000Z"),
    });
  });

  it("assoc-idempotent-upsert", async () => {
    const { associations, associate } = createHarness();
    const input = {
      organizationId: asOrganizationId("org-1"),
      encounterId: encounterSnapshot().encounterId,
    };

    const first = await associate.execute(input);
    const ids = associationIds(associations.rows);
    const second = await associate.execute(input);

    expect(first.isOk() && first.value.status === "associated").toBe(true);
    expect(second.isOk() && second.value.status === "associated").toBe(true);
    expect(associations.rows).toHaveLength(2);
    expect(associationIds(associations.rows)).toEqual(ids);
    expect(associations.rows.every((row) => row.associatedAt.getTime() === NOW.getTime())).toBe(
      true,
    );
  });
});
