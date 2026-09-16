import { asEncounterId, asOrganizationId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { InMemoryEncounterCandidateAssociationRepository } from "./encounter-candidate-association.repository.ts";

describe("InMemoryEncounterCandidateAssociationRepository", () => {
  it("scopes replace and list by organization", async () => {
    const repository = new InMemoryEncounterCandidateAssociationRepository();
    const orgA = asOrganizationId("org-a");
    const orgB = asOrganizationId("org-b");
    const encounterId = asEncounterId("enc-shared");
    const row = (organizationId: typeof orgA, externalId: string) => ({
      id: `${organizationId}:${encounterId}:ea-clubs:${externalId}`,
      organizationId,
      encounterId,
      providerMatchRef: { providerKey: "ea-clubs" as const, externalId },
      eligible: true,
      associatedAt: new Date("2026-09-14T20:00:00.000Z"),
      lastEvaluatedAt: new Date("2026-09-14T20:00:00.000Z"),
    });

    await repository.replaceForEncounter(orgA, encounterId, [row(orgA, "match-a")], 0);
    await repository.replaceForEncounter(orgB, encounterId, [row(orgB, "match-b")], 0);

    await expect(repository.listByEncounter(orgA, encounterId)).resolves.toEqual([
      row(orgA, "match-a"),
    ]);
    await expect(repository.listByEncounter(orgB, encounterId)).resolves.toEqual([
      row(orgB, "match-b"),
    ]);
    await expect(
      repository.findByRef(orgA, encounterId, { providerKey: "ea-clubs", externalId: "match-b" }),
    ).resolves.toBeNull();
  });

  it("rejects a stale generation replace so a newer set is not overwritten", async () => {
    const repository = new InMemoryEncounterCandidateAssociationRepository();
    const organizationId = asOrganizationId("org-a");
    const encounterId = asEncounterId("enc-cas");
    const row = (externalId: string, eligible = true) => ({
      id: `${organizationId}:${encounterId}:ea-clubs:${externalId}`,
      organizationId,
      encounterId,
      providerMatchRef: { providerKey: "ea-clubs" as const, externalId },
      eligible,
      associatedAt: new Date("2026-09-14T20:00:00.000Z"),
      lastEvaluatedAt: new Date("2026-09-14T20:00:00.000Z"),
    });

    await expect(
      repository.replaceForEncounter(organizationId, encounterId, [row("match-a")], 0),
    ).resolves.toMatchObject({ status: "replaced", generation: 1 });
    await expect(
      repository.replaceForEncounter(organizationId, encounterId, [row("stale")], 0),
    ).resolves.toEqual({ status: "conflict", generation: 1 });
    await expect(repository.listByEncounter(organizationId, encounterId)).resolves.toEqual([
      row("match-a"),
    ]);
  });

  it("writeIfEligible refuses the write when the candidate is no longer eligible", async () => {
    const repository = new InMemoryEncounterCandidateAssociationRepository();
    const organizationId = asOrganizationId("org-a");
    const encounterId = asEncounterId("enc-select");
    const ref = { providerKey: "ea-clubs" as const, externalId: "match-a" };
    await repository.replaceForEncounter(
      organizationId,
      encounterId,
      [
        {
          id: `${organizationId}:${encounterId}:ea-clubs:match-a`,
          organizationId,
          encounterId,
          providerMatchRef: ref,
          eligible: false,
          associatedAt: new Date("2026-09-14T20:00:00.000Z"),
          lastEvaluatedAt: new Date("2026-09-14T20:00:00.000Z"),
        },
      ],
      0,
    );

    const writes: string[] = [];
    await expect(
      repository.writeIfEligible(organizationId, encounterId, [ref], async () => {
        writes.push("saved");
        return "saved";
      }),
    ).resolves.toEqual({ status: "ineligible", providerMatchRef: ref });
    expect(writes).toEqual([]);
  });
});
