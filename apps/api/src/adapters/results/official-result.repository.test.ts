import { asCompetitionId, asOrganizationId, type EncounterId } from "@futrob/shared-kernel";
import type { ExternalReference } from "@futrob/game-data";
import {
  NoopTransactionPort,
  PostgresTransactionPort,
} from "@/adapters/persistence/pg-transaction.ts";
import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import {
  createIsolatedSchema,
  insertTenant,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";
import { seedActors } from "@/testing/seed-actors.ts";
import {
  InMemoryOfficialMatchSelectionRepository,
  InMemoryOfficialResultRepository,
  PostgresOfficialMatchSelectionRepository,
  PostgresOfficialResultRepository,
} from "./official-result.repository.ts";
import { defineOfficialResultContract } from "./official-result.contract.ts";
import { defineOfficialSelectionAuditContract } from "./official-selection-audit.contract.ts";
import { defineOfficialSelectionContract } from "./official-selection.contract.ts";
import {
  buildAction,
  createTransition,
  newActorId,
  newEncounterId,
  newRef,
  type ContractTenant,
  type SelectionContractHarness,
} from "./official-selection.fixtures.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
// Applying every migration to a possibly remote database is one round trip per statement.
const SETUP_TIMEOUT_MS = 180_000;

const memoryTenants: readonly [ContractTenant, ContractTenant] = [
  { organizationId: asOrganizationId("org-a"), competitionId: asCompetitionId("comp-a") },
  { organizationId: asOrganizationId("org-b"), competitionId: asCompetitionId("comp-b") },
];

const defineContracts = (name: string, create: () => Promise<SelectionContractHarness>) => {
  defineOfficialSelectionContract(name, create);
  defineOfficialSelectionAuditContract(name, create);
  defineOfficialResultContract(name, create);
};

defineContracts("in-memory", async () => {
  const selections = new InMemoryOfficialMatchSelectionRepository();
  const results = new InMemoryOfficialResultRepository();
  return {
    selections,
    results,
    transaction: new NoopTransactionPort(),
    tenants: memoryTenants,
    seedActors: async () => undefined,
    counts: async (encounterId: EncounterId) => ({
      selections: selections.selections.filter((row) => row.encounterId === encounterId).length,
      proposals: selections.proposals.filter((row) => row.encounterId === encounterId).length,
      actions: selections.actions.filter((row) => row.encounterId === encounterId).length,
      disputes: selections.disputes.filter((row) => row.encounterId === encounterId).length,
    }),
    claims: async (refs: readonly ExternalReference[]) =>
      selections.claims
        .filter((claim) =>
          refs.some(
            (ref) =>
              ref.providerKey === claim.providerKey && ref.externalId === claim.externalMatchId,
          ),
        )
        .map((claim) => ({
          providerKey: claim.providerKey,
          externalMatchId: claim.externalMatchId,
          selectionId: claim.selectionId,
          releasedAt: claim.releasedAt,
        })),
  };
});

const postgresSuite = describe.skipIf(!databaseUrl);

postgresSuite("postgres official selection repositories", () => {
  let isolated: IsolatedSchema;
  let pool: Pool;
  let tenants: readonly [ContractTenant, ContractTenant];

  beforeAll(async () => {
    isolated = await createIsolatedSchema(databaseUrl!, "official_selection");
    pool = isolated.pool;
    await migrateIsolatedSchema(pool);
    const suffix = isolated.schema.slice(-8);
    const first = { organizationId: `org-a-${suffix}`, competitionId: `comp-a-${suffix}` };
    const second = { organizationId: `org-b-${suffix}`, competitionId: `comp-b-${suffix}` };
    for (const tenant of [first, second]) {
      await insertTenant(pool, tenant.organizationId, tenant.competitionId);
    }
    tenants = [
      {
        organizationId: asOrganizationId(first.organizationId),
        competitionId: asCompetitionId(first.competitionId),
      },
      {
        organizationId: asOrganizationId(second.organizationId),
        competitionId: asCompetitionId(second.competitionId),
      },
    ];
  }, SETUP_TIMEOUT_MS);

  afterAll(async () => {
    await isolated?.drop();
  }, SETUP_TIMEOUT_MS);

  function harness(): SelectionContractHarness {
    return {
      selections: new PostgresOfficialMatchSelectionRepository(pool),
      results: new PostgresOfficialResultRepository(pool),
      transaction: new PostgresTransactionPort(pool),
      tenants,
      seedActors: (...actorIds) => seedActors(pool, ...actorIds),
      counts: async (encounterId) => {
        const result = await pool.query(
          `SELECT
             (SELECT count(*) FROM official_match_selections WHERE encounter_id = $1) AS selections,
             (SELECT count(*) FROM official_selection_proposals WHERE encounter_id = $1) AS proposals,
             (SELECT count(*) FROM official_selection_actions WHERE encounter_id = $1) AS actions,
             (SELECT count(*) FROM match_disputes WHERE encounter_id = $1) AS disputes`,
          [encounterId],
        );
        const row = result.rows[0];
        return {
          selections: Number(row.selections),
          proposals: Number(row.proposals),
          actions: Number(row.actions),
          disputes: Number(row.disputes),
        };
      },
      claims: async (refs) => {
        const result = await pool.query(
          `SELECT provider_key, external_match_id, selection_id, released_at
           FROM official_selection_reference_claims
           WHERE (provider_key, external_match_id) IN (
             SELECT * FROM unnest($1::text[], $2::text[])
           )
           ORDER BY claimed_at, id`,
          [refs.map((ref) => ref.providerKey), refs.map((ref) => ref.externalId)],
        );
        return result.rows.map((row) => ({
          providerKey: row.provider_key,
          externalMatchId: row.external_match_id,
          selectionId: row.selection_id,
          releasedAt: row.released_at,
        }));
      },
    };
  }

  defineContracts("postgres", async () => harness());

  it("rejects UPDATE and DELETE on the append-only tables", async () => {
    const { selections, tenants: scoped } = harness();
    const encounterId = newEncounterId();
    const actorId = newActorId();
    await seedActors(pool, actorId);
    const transition = createTransition(scoped[0], encounterId, actorId, [newRef()]);
    await selections.commitTransition(transition);

    for (const statement of [
      "UPDATE official_selection_actions SET reason = 'edited' WHERE id = $1",
      "DELETE FROM official_selection_actions WHERE id = $1",
    ]) {
      await expect(pool.query(statement, [transition.action.id])).rejects.toMatchObject({
        code: "23001",
      });
    }
    for (const statement of [
      "UPDATE official_selection_proposals SET reason = 'edited' WHERE id = $1",
      "DELETE FROM official_selection_proposals WHERE id = $1",
    ]) {
      await expect(pool.query(statement, [transition.proposal.id])).rejects.toMatchObject({
        code: "23001",
      });
    }
    await expect(selections.listActions(encounterId)).resolves.toEqual([transition.action]);
    await expect(selections.listProposals(transition.selection.id)).resolves.toEqual([
      transition.proposal,
    ]);
  });

  it("still lets deleting a tenant cascade through the append-only history", async () => {
    const suffix = `${Date.now()}`;
    const tenant: ContractTenant = {
      organizationId: asOrganizationId(`org-gone-${suffix}`),
      competitionId: asCompetitionId(`comp-gone-${suffix}`),
    };
    await insertTenant(pool, tenant.organizationId, tenant.competitionId);
    const { selections } = harness();
    const encounterId = newEncounterId();
    const actorId = newActorId();
    await seedActors(pool, actorId);
    await selections.commitTransition(createTransition(tenant, encounterId, actorId, [newRef()]));

    await pool.query("DELETE FROM organizations WHERE id = $1", [tenant.organizationId]);

    expect(await harness().counts(encounterId)).toEqual({
      selections: 0,
      proposals: 0,
      actions: 0,
      disputes: 0,
    });
  });

  it("lets exactly one of two racing transactions claim a provider match", async () => {
    const { selections, transaction, tenants: scoped } = harness();
    const actorId = newActorId();
    await seedActors(pool, actorId);
    const shared = newRef();
    const first = createTransition(scoped[0], newEncounterId(), actorId, [shared]);
    const second = createTransition(scoped[1], newEncounterId(), actorId, [shared]);

    let firstHasClaimed: () => void = () => undefined;
    const claimed = new Promise<void>((resolve) => {
      firstHasClaimed = resolve;
    });
    // The second transaction starts once the first holds an uncommitted claim, so it has
    // to wait on the unique index and then lose.
    const outcomes = await Promise.all([
      transaction.runInTransaction(async () => {
        const result = await selections.commitTransition(first);
        firstHasClaimed();
        await new Promise((resolve) => setTimeout(resolve, 300));
        return result;
      }),
      claimed.then(() => transaction.runInTransaction(() => selections.commitTransition(second))),
    ]);

    expect(outcomes).toEqual([
      { status: "committed" },
      { status: "reference_claimed", providerMatchRef: shared },
    ]);
    await expect(
      selections.findLatestByEncounter(second.selection.encounterId),
    ).resolves.toBeNull();
    expect(await harness().counts(second.selection.encounterId)).toMatchObject({ actions: 0 });
  });

  it("lets exactly one of several unsynchronized transactions claim a provider match", async () => {
    const { selections, transaction, tenants: scoped } = harness();
    const actorId = newActorId();
    await seedActors(pool, actorId);
    const shared = newRef();
    const attempts = [0, 1, 0, 1].map((index) =>
      createTransition(scoped[index]!, newEncounterId(), actorId, [shared]),
    );

    const outcomes = await Promise.all(
      attempts.map((attempt) =>
        transaction.runInTransaction(() => selections.commitTransition(attempt)),
      ),
    );

    expect(outcomes.filter((outcome) => outcome.status === "committed")).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.status === "reference_claimed")).toHaveLength(
      attempts.length - 1,
    );
  });

  it("rolls back everything an aborted outer transaction wrote", async () => {
    const { selections, transaction, tenants: scoped } = harness();
    const encounterId = newEncounterId();
    const actorId = newActorId();
    await seedActors(pool, actorId);
    const ref = newRef();
    const transition = createTransition(scoped[0], encounterId, actorId, [ref]);

    await expect(
      transaction.runInTransaction(async () => {
        await selections.commitTransition(transition);
        await selections.recordAudit(
          buildAction(null, { ...scoped[0], encounterId }, actorId, { type: "rejected" }),
        );
        throw new Error("abort");
      }),
    ).rejects.toThrow("abort");

    expect(await harness().counts(encounterId)).toEqual({
      selections: 0,
      proposals: 0,
      actions: 0,
      disputes: 0,
    });
    await expect(harness().claims([ref])).resolves.toEqual([]);
  });

  it("undoes only the failed transition inside an outer transaction that commits", async () => {
    const { selections, transaction, tenants: scoped } = harness();
    const actorId = newActorId();
    await seedActors(pool, actorId);
    const shared = newRef();
    const winner = createTransition(scoped[0], newEncounterId(), actorId, [shared]);
    const loser = createTransition(scoped[1], newEncounterId(), actorId, [newRef(), shared]);

    const outcomes = await transaction.runInTransaction(async () => [
      await selections.commitTransition(winner),
      await selections.commitTransition(loser),
    ]);

    expect(outcomes).toEqual([
      { status: "committed" },
      { status: "reference_claimed", providerMatchRef: shared },
    ]);
    await expect(selections.findLatestByEncounter(winner.selection.encounterId)).resolves.toEqual(
      winner.selection,
    );
    expect(await harness().counts(loser.selection.encounterId)).toEqual({
      selections: 0,
      proposals: 0,
      actions: 0,
      disputes: 0,
    });
    const loserRefs = loser.proposal.slots.map((slot) => slot.providerMatchRef);
    const loserClaims = await harness().claims(loserRefs);
    expect(loserClaims.map((claim) => claim.selectionId)).toEqual([winner.selection.id]);
  });
});
