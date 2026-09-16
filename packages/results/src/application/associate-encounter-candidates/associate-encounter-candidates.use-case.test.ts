import { asActorId, asOrganizationId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { CandidateDataUnavailable } from "../../domain/errors/encounter-candidates.errors.ts";
import { EncounterNotFound } from "../../domain/errors/select-official-matches.errors.ts";
import type { ProviderMatchReaderPort } from "../../domain/ports/provider-match-reader.port.ts";
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

  it("hides an encounter from another organization", async () => {
    const { associate, associations } = createHarness();
    const result = await associate.execute({
      organizationId: asOrganizationId("org-other"),
      encounterId: encounterSnapshot().encounterId,
    });
    expect(result.isErr() && EncounterNotFound.is(result.error)).toBe(true);
    expect(associations.rows).toHaveLength(0);
  });

  it("does not replace rows when clubs are not connected", async () => {
    const associations = new MemoryEncounterCandidateAssociations();
    const providerMatches: ProviderMatchReaderPort = {
      listCandidatesForEncounter: async () => ({
        status: "clubs_not_connected",
        sides: ["away"],
      }),
      getByExternalRef: async () => null,
    };
    const associate = new AssociateEncounterCandidatesUseCase({
      encounterReader: new MutableEncounterReader(encounterSnapshot()),
      providerMatches,
      associations,
      clock: fixedClock,
    });
    const result = await associate.execute({
      organizationId: asOrganizationId("org-1"),
      encounterId: encounterSnapshot().encounterId,
    });
    expect(result.isOk() && result.value).toEqual({
      status: "clubs_not_connected",
      sides: ["away"],
    });
    expect(associations.rows).toHaveLength(0);
  });

  it("maps provider failures to candidate data unavailable", async () => {
    const associations = new MemoryEncounterCandidateAssociations();
    const providerMatches: ProviderMatchReaderPort = {
      listCandidatesForEncounter: async () => {
        throw new Error("private provider failure");
      },
      getByExternalRef: async () => null,
    };
    const associate = new AssociateEncounterCandidatesUseCase({
      encounterReader: new MutableEncounterReader(encounterSnapshot()),
      providerMatches,
      associations,
      clock: fixedClock,
    });
    const result = await associate.execute({
      organizationId: asOrganizationId("org-1"),
      encounterId: encounterSnapshot().encounterId,
    });
    expect(result.isErr() && CandidateDataUnavailable.is(result.error)).toBe(true);
    expect(associations.rows).toHaveLength(0);
  });
});
