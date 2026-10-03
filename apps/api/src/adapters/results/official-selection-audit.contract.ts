import { randomUUID } from "node:crypto";
import type { MatchDispute } from "@futrob/results";
import { describe, expect, it } from "vite-plus/test";
import {
  advance,
  at,
  buildAction,
  buildDispute,
  createTransition,
  newActorId,
  newEncounterId,
  newRef,
  type SelectionContractHarness,
} from "./official-selection.fixtures.ts";

export function defineOfficialSelectionAuditContract(
  name: string,
  create: () => Promise<SelectionContractHarness>,
): void {
  describe(`${name}: audit actions and disputes`, () => {
    it("keeps actions in order and enforces command-key uniqueness atomically", async () => {
      const harness = await create();
      const [tenant] = harness.tenants;
      const encounterId = newEncounterId();
      const actorId = newActorId();
      const otherActorId = newActorId();
      await harness.seedActors(actorId, otherActorId);
      const scope = { ...tenant, encounterId };
      const commandKey = `key-${randomUUID()}`;
      const created = createTransition(tenant, encounterId, actorId, [newRef()]);
      const keyed = {
        ...created,
        actions: [
          {
            ...created.action,
            commandKey,
            requestFingerprint: "fingerprint-1",
            details: {
              integrityFlags: [
                {
                  code: "provider_data_incomplete" as const,
                  providerMatchRef: created.proposal.slots[0]!.providerMatchRef,
                },
              ],
              selectedProposalId: created.proposal.id,
            },
          },
        ],
      };
      await harness.selections.commitTransition(keyed);

      const audit = buildAction(null, scope, actorId, {
        type: "reference_reuse_rejected",
        occurredAt: at(1),
        details: { conflictingReference: newRef() },
      });
      await harness.selections.recordAudit(audit);

      await expect(harness.selections.listActions(encounterId)).resolves.toEqual([
        keyed.actions[0],
        audit,
      ]);
      await expect(
        harness.selections.findActionsByCommandKey({ encounterId, actorId, commandKey }),
      ).resolves.toEqual([keyed.actions[0]]);
      await expect(
        harness.selections.findActionsByCommandKey({
          encounterId,
          actorId: otherActorId,
          commandKey,
        }),
      ).resolves.toEqual([]);

      const confirmed = advance(created.selection, { status: "confirmed" });
      const replayed = buildAction(created.selection, scope, actorId, {
        type: "proposed",
        commandKey,
      });
      await expect(
        harness.selections.commitTransition({
          expectedVersion: 1,
          selection: confirmed,
          newProposals: [],
          actions: [replayed],
          dispute: null,
          references: { acquire: [], release: "none" },
        }),
      ).rejects.toThrow();
      await expect(harness.selections.findLatestByEncounter(encounterId)).resolves.toEqual(
        created.selection,
      );
      await expect(harness.selections.recordAudit(replayed)).rejects.toThrow();

      // Same key, another action type or another actor, is a different command.
      await expect(
        harness.selections.recordAudit(
          buildAction(null, scope, actorId, { type: "rejected", commandKey }),
        ),
      ).resolves.toBeUndefined();
      await expect(
        harness.selections.recordAudit(
          buildAction(null, scope, otherActorId, { type: "proposed", commandKey }),
        ),
      ).resolves.toBeUndefined();
    });

    it("allows one active dispute per selection", async () => {
      const harness = await create();
      const [tenant] = harness.tenants;
      const encounterId = newEncounterId();
      const actorId = newActorId();
      await harness.seedActors(actorId);
      const created = createTransition(tenant, encounterId, actorId, [newRef()]);
      await harness.selections.commitTransition(created);

      const disputed = advance(created.selection, { status: "disputed" });
      const first = buildDispute(created.selection, actorId);
      await expect(
        harness.selections.commitTransition({
          expectedVersion: 1,
          selection: disputed,
          newProposals: [],
          actions: [],
          dispute: { kind: "open", dispute: first },
          references: { acquire: [], release: "none" },
        }),
      ).resolves.toEqual({ status: "committed" });

      await expect(
        harness.selections.commitTransition({
          expectedVersion: 2,
          selection: advance(disputed, { status: "organizer_review" }),
          newProposals: [],
          actions: [],
          dispute: { kind: "open", dispute: buildDispute(created.selection, actorId) },
          references: { acquire: [], release: "none" },
        }),
      ).rejects.toThrow();
      await expect(harness.selections.findLatestByEncounter(encounterId)).resolves.toEqual(
        disputed,
      );
      await expect(harness.selections.listDisputes(created.selection.id)).resolves.toEqual([first]);

      const resolved: MatchDispute = {
        ...first,
        status: "resolved",
        reviewStartedByActorId: actorId,
        reviewStartedAt: at(6),
        resolvedByActorId: actorId,
        resolvedAt: at(7),
        resolution: "returned_to_selection",
        resolutionReason: "Play it again",
      };
      await expect(
        harness.selections.commitTransition({
          expectedVersion: 2,
          selection: advance(disputed, { status: "selection_in_progress" }),
          newProposals: [],
          actions: [],
          dispute: { kind: "update", dispute: resolved },
          references: { acquire: [], release: "none" },
        }),
      ).resolves.toEqual({ status: "committed" });

      const second = buildDispute(created.selection, actorId, { openedAt: at(30) });
      await expect(
        harness.selections.commitTransition({
          expectedVersion: 3,
          selection: advance(disputed, { version: 4, status: "disputed" }),
          newProposals: [],
          actions: [],
          dispute: { kind: "open", dispute: second },
          references: { acquire: [], release: "none" },
        }),
      ).resolves.toEqual({ status: "committed" });
      await expect(harness.selections.listDisputes(created.selection.id)).resolves.toEqual([
        resolved,
        second,
      ]);
    });
  });
}
