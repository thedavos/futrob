import type { ConfirmationAction } from "@futrob/results";
import { describe, expect, it } from "vite-plus/test";
import {
  advance,
  at,
  buildAction,
  buildDispute,
  buildProposal,
  buildSelection,
  createTransition,
  newActorId,
  newEncounterId,
  newRef,
  type SelectionContractHarness,
} from "./official-selection.fixtures.ts";

export function defineOfficialSelectionContract(
  name: string,
  create: () => Promise<SelectionContractHarness>,
): void {
  describe(`${name}: selection transitions`, () => {
    it("creates a selection and reads it back with its proposal and actions", async () => {
      const harness = await create();
      const [tenant] = harness.tenants;
      const encounterId = newEncounterId();
      const actorId = newActorId();
      await harness.seedActors(actorId);
      const refs = [newRef(), newRef()];
      const transition = createTransition(tenant, encounterId, actorId, refs);

      await expect(harness.selections.commitTransition(transition)).resolves.toEqual({
        status: "committed",
      });

      await expect(harness.selections.findLatestByEncounter(encounterId)).resolves.toEqual(
        transition.selection,
      );
      await expect(harness.selections.listProposals(transition.selection.id)).resolves.toEqual([
        transition.proposal,
      ]);
      await expect(harness.selections.listActions(encounterId)).resolves.toEqual([
        transition.action,
      ]);
      await expect(harness.selections.findLatestByEncounter(newEncounterId())).resolves.toBeNull();
    });

    it("rejects a stale version and a duplicate create without changing anything", async () => {
      const harness = await create();
      const [tenant] = harness.tenants;
      const encounterId = newEncounterId();
      const actorId = newActorId();
      await harness.seedActors(actorId);
      const created = createTransition(tenant, encounterId, actorId, [newRef()]);
      await harness.selections.commitTransition(created);

      const confirmed = advance(created.selection, { status: "confirmed" });
      await expect(
        harness.selections.commitTransition({
          expectedVersion: 1,
          selection: confirmed,
          newProposals: [],
          actions: [],
          dispute: null,
          references: { acquire: [], release: "none" },
        }),
      ).resolves.toEqual({ status: "committed" });

      const stale = advance(created.selection, { status: "voided" });
      await expect(
        harness.selections.commitTransition({
          expectedVersion: 1,
          selection: stale,
          newProposals: [],
          actions: [],
          dispute: null,
          references: { acquire: [], release: "all" },
        }),
      ).resolves.toEqual({ status: "version_conflict", currentVersion: 2 });

      const duplicate = createTransition(tenant, encounterId, actorId, [newRef()]);
      await expect(harness.selections.commitTransition(duplicate)).resolves.toEqual({
        status: "version_conflict",
        currentVersion: 2,
      });

      await expect(harness.selections.findLatestByEncounter(encounterId)).resolves.toEqual(
        confirmed,
      );
      const counts = await harness.counts(encounterId);
      expect(counts).toMatchObject({ selections: 1, proposals: 1, actions: 1 });
    });

    it("refuses a transition whose selection does not carry the next version", async () => {
      const harness = await create();
      const [tenant] = harness.tenants;
      const encounterId = newEncounterId();
      const actorId = newActorId();
      await harness.seedActors(actorId);
      const transition = createTransition(tenant, encounterId, actorId, [newRef()]);

      await expect(
        harness.selections.commitTransition({
          ...transition,
          selection: { ...transition.selection, version: 5 },
        }),
      ).rejects.toThrow(/version/);
      expect(await harness.counts(encounterId)).toMatchObject({ selections: 0 });
    });

    it("commits nothing when a reference is already claimed", async () => {
      const harness = await create();
      const [tenant] = harness.tenants;
      const actorId = newActorId();
      await harness.seedActors(actorId);
      const shared = newRef();
      const free = newRef();
      const owner = createTransition(tenant, newEncounterId(), actorId, [shared]);
      await harness.selections.commitTransition(owner);

      const encounterId = newEncounterId();
      const selection = buildSelection(tenant, encounterId);
      const proposal = buildProposal(selection, [free, shared], { proposedByActorId: actorId });
      const rejected = await harness.selections.commitTransition({
        expectedVersion: 0,
        selection: { ...selection, currentProposalId: proposal.id },
        newProposals: [proposal],
        actions: [buildAction(selection, { ...tenant, encounterId }, actorId)],
        dispute: {
          kind: "open",
          dispute: buildDispute(selection, actorId),
        },
        references: { acquire: [free, shared], release: "none" },
      });

      expect(rejected).toEqual({ status: "reference_claimed", providerMatchRef: shared });
      await expect(harness.selections.findLatestByEncounter(encounterId)).resolves.toBeNull();
      expect(await harness.counts(encounterId)).toEqual({
        selections: 0,
        proposals: 0,
        actions: 0,
        disputes: 0,
      });
      await expect(harness.claims([free])).resolves.toEqual([]);
      const claims = await harness.claims([shared]);
      expect(claims).toHaveLength(1);
      expect(claims[0]).toMatchObject({ selectionId: owner.selection.id, releasedAt: null });
    });

    it("keeps the previous version when an update loses the reference race", async () => {
      const harness = await create();
      const [tenant] = harness.tenants;
      const actorId = newActorId();
      await harness.seedActors(actorId);
      const shared = newRef();
      await harness.selections.commitTransition(
        createTransition(tenant, newEncounterId(), actorId, [shared]),
      );
      const encounterId = newEncounterId();
      const own = newRef();
      const created = createTransition(tenant, encounterId, actorId, [own]);
      await harness.selections.commitTransition(created);

      const altProposal = buildProposal(created.selection, [shared], {
        sequence: 2,
        proposedByActorId: actorId,
      });
      const result = await harness.selections.commitTransition({
        expectedVersion: 1,
        selection: advance(created.selection, {
          status: "confirmed",
          currentProposalId: altProposal.id,
        }),
        newProposals: [altProposal],
        actions: [
          buildAction(created.selection, { ...tenant, encounterId }, actorId, {
            type: "alternative_proposed",
          }),
        ],
        dispute: null,
        references: { acquire: [shared], release: { keep: [] } },
      });

      expect(result).toEqual({ status: "reference_claimed", providerMatchRef: shared });
      await expect(harness.selections.findLatestByEncounter(encounterId)).resolves.toEqual(
        created.selection,
      );
      expect(await harness.counts(encounterId)).toMatchObject({ proposals: 1, actions: 1 });
      const [ownClaim] = await harness.claims([own]);
      expect(ownClaim?.releasedAt).toBeNull();
    });

    it("keeps a reference unique across encounters and organizations", async () => {
      const harness = await create();
      const [tenantA, tenantB] = harness.tenants;
      const actorId = newActorId();
      await harness.seedActors(actorId);
      const shared = newRef();

      await expect(
        harness.selections.commitTransition(
          createTransition(tenantA, newEncounterId(), actorId, [shared]),
        ),
      ).resolves.toEqual({ status: "committed" });
      await expect(
        harness.selections.commitTransition(
          createTransition(tenantA, newEncounterId(), actorId, [shared]),
        ),
      ).resolves.toEqual({ status: "reference_claimed", providerMatchRef: shared });
      await expect(
        harness.selections.commitTransition(
          createTransition(tenantB, newEncounterId(), actorId, [shared]),
        ),
      ).resolves.toEqual({ status: "reference_claimed", providerMatchRef: shared });
    });

    it("re-acquiring a reference the selection already holds is a no-op", async () => {
      const harness = await create();
      const [tenant] = harness.tenants;
      const encounterId = newEncounterId();
      const actorId = newActorId();
      await harness.seedActors(actorId);
      const ref = newRef();
      const created = createTransition(tenant, encounterId, actorId, [ref]);
      await harness.selections.commitTransition(created);

      await expect(
        harness.selections.commitTransition({
          expectedVersion: 1,
          selection: advance(created.selection, { status: "confirmed" }),
          newProposals: [],
          actions: [],
          dispute: null,
          references: { acquire: [ref, ref], release: "none" },
        }),
      ).resolves.toEqual({ status: "committed" });

      const claims = await harness.claims([ref]);
      expect(claims).toHaveLength(1);
      expect(claims[0]?.releasedAt).toBeNull();
    });

    it("releases claims with 'all' and with {keep} and makes them claimable again", async () => {
      const harness = await create();
      const [tenantA, tenantB] = harness.tenants;
      const actorId = newActorId();
      await harness.seedActors(actorId);
      const encounterId = newEncounterId();
      const [first, second] = [newRef(), newRef()];
      const created = createTransition(tenantA, encounterId, actorId, [first, second]);
      await harness.selections.commitTransition(created);
      const releaseAction = (type: ConfirmationAction["type"]) =>
        buildAction(created.selection, { ...tenantA, encounterId }, actorId, {
          type,
          occurredAt: at(20),
        });

      const kept = advance(created.selection, { status: "confirmed" });
      await harness.selections.commitTransition({
        expectedVersion: 1,
        selection: kept,
        newProposals: [],
        actions: [releaseAction("confirmed")],
        dispute: null,
        references: { acquire: [], release: { keep: [first] } },
      });

      const afterKeep = await harness.claims([first, second]);
      expect(afterKeep.find((claim) => claim.externalMatchId === first.externalId)).toMatchObject({
        releasedAt: null,
      });
      expect(
        afterKeep.find((claim) => claim.externalMatchId === second.externalId)?.releasedAt,
      ).toEqual(at(20));
      await expect(
        harness.selections.commitTransition(
          createTransition(tenantB, newEncounterId(), actorId, [second]),
        ),
      ).resolves.toEqual({ status: "committed" });
      await expect(
        harness.selections.commitTransition(
          createTransition(tenantB, newEncounterId(), actorId, [first]),
        ),
      ).resolves.toEqual({ status: "reference_claimed", providerMatchRef: first });

      await harness.selections.commitTransition({
        expectedVersion: 2,
        selection: advance(kept, { status: "voided" }),
        newProposals: [],
        actions: [releaseAction("voided")],
        dispute: null,
        references: { acquire: [], release: "all" },
      });
      const claimedAgain = createTransition(tenantB, newEncounterId(), actorId, [first]);
      await expect(harness.selections.commitTransition(claimedAgain)).resolves.toEqual({
        status: "committed",
      });

      const history = await harness.claims([first]);
      expect(history).toHaveLength(2);
      expect(history.filter((claim) => claim.releasedAt === null)).toHaveLength(1);
      expect(history.find((claim) => claim.releasedAt !== null)).toMatchObject({
        selectionId: created.selection.id,
        releasedAt: at(20),
      });
    });
  });
}
