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

    await repository.replaceForEncounter(orgA, encounterId, [row(orgA, "match-a")]);
    await repository.replaceForEncounter(orgB, encounterId, [row(orgB, "match-b")]);

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
});
