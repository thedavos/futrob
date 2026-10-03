import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vite-plus/test";
import {
  buildResult,
  newActorId,
  newEncounterId,
  type SelectionContractHarness,
} from "./official-selection.fixtures.ts";

export function defineOfficialResultContract(
  name: string,
  create: () => Promise<SelectionContractHarness>,
): void {
  describe(`${name}: official results`, () => {
    it("never overwrites an official result revision", async () => {
      const harness = await create();
      const [tenant] = harness.tenants;
      const encounterId = newEncounterId();
      const actorId = newActorId();
      await harness.seedActors(actorId);
      const original = buildResult(tenant, encounterId, actorId, {
        selectionId: "selection-1",
        proposalId: "proposal-1",
        approvalBasis: "team_agreement",
      });
      await expect(harness.results.append(original)).resolves.toEqual(original);

      const competing = buildResult(tenant, encounterId, actorId, {
        approvalBasis: "operator_resolution",
        slots: [],
      });
      await expect(harness.results.append(competing)).rejects.toThrow();
      await expect(harness.results.findById(original.id)).resolves.toEqual(original);
      await expect(harness.results.listByEncounter(encounterId)).resolves.toEqual([original]);

      const next = buildResult(tenant, encounterId, actorId, { revision: 2 });
      await harness.results.append(next);
      await expect(harness.results.findLatestByEncounter(encounterId)).resolves.toEqual(next);
      await expect(harness.results.findApprovedByEncounter(encounterId)).resolves.toEqual(next);
      await expect(harness.results.listByCompetition(tenant.competitionId)).resolves.toEqual(
        expect.arrayContaining([original, next]),
      );
    });

    it("markVoided flips only the status and keeps the snapshot", async () => {
      const harness = await create();
      const [tenant] = harness.tenants;
      const encounterId = newEncounterId();
      const actorId = newActorId();
      await harness.seedActors(actorId);
      const original = buildResult(tenant, encounterId, actorId, {
        selectionId: "selection-1",
        proposalId: "proposal-1",
        approvalBasis: "operator_resolution",
      });
      await harness.results.append(original);

      const voided = await harness.results.markVoided(original.id);
      expect(voided).toEqual({ ...original, status: "voided" });
      await expect(harness.results.findById(original.id)).resolves.toEqual(voided);
      await expect(harness.results.findApprovedByEncounter(encounterId)).resolves.toBeNull();
      await expect(harness.results.markVoided(original.id)).resolves.toEqual(voided);
      await expect(harness.results.markVoided(`missing-${randomUUID()}`)).resolves.toBeNull();
    });

    it("reads results without negotiation metadata as null fields", async () => {
      const harness = await create();
      const [tenant] = harness.tenants;
      const encounterId = newEncounterId();
      const actorId = newActorId();
      await harness.seedActors(actorId);
      const {
        selectionId: _s,
        proposalId: _p,
        approvalBasis: _a,
        ...legacy
      } = buildResult(tenant, encounterId, actorId);
      await harness.results.append(legacy);

      await expect(harness.results.findById(legacy.id)).resolves.toMatchObject({
        selectionId: null,
        proposalId: null,
        approvalBasis: null,
      });
    });
  });
}
