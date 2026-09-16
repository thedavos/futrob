import { asEncounterId, asOrganizationId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import {
  encounterCandidateAssociationId,
  reconcileCandidateAssociations,
} from "./reconcile-candidate-associations.ts";

const org = asOrganizationId("org-1");
const encounter = asEncounterId("enc-1");
const now = new Date("2026-09-14T21:00:00.000Z");
const earlier = new Date("2026-09-14T20:00:00.000Z");
const refA = { providerKey: "ea-clubs" as const, externalId: "a" };
const refB = { providerKey: "ea-clubs" as const, externalId: "b" };

describe("reconcileCandidateAssociations", () => {
  it("keeps the first duplicate in-window ref and the original associatedAt", () => {
    const existing = [
      {
        id: encounterCandidateAssociationId(org, encounter, refA),
        organizationId: org,
        encounterId: encounter,
        providerMatchRef: refA,
        eligible: false,
        associatedAt: earlier,
        lastEvaluatedAt: earlier,
      },
    ];
    const next = reconcileCandidateAssociations({
      existing,
      inWindowRefs: [refA, refA, refB],
      organizationId: org,
      encounterId: encounter,
      now,
    });
    expect(next).toEqual([
      {
        id: encounterCandidateAssociationId(org, encounter, refA),
        organizationId: org,
        encounterId: encounter,
        providerMatchRef: refA,
        eligible: true,
        associatedAt: earlier,
        lastEvaluatedAt: now,
      },
      {
        id: encounterCandidateAssociationId(org, encounter, refB),
        organizationId: org,
        encounterId: encounter,
        providerMatchRef: refB,
        eligible: true,
        associatedAt: now,
        lastEvaluatedAt: now,
      },
    ]);
  });
});
