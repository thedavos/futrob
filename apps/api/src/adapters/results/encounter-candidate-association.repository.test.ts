import type { ExternalReference } from "@futrob/game-data";
import type {
  EncounterCandidateAssociation,
  EncounterCandidateAssociationRepository,
} from "@futrob/results";
import {
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  type EncounterId,
  type OrganizationId,
} from "@futrob/shared-kernel";
import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vite-plus/test";
import { PostgresTransactionPort } from "@/adapters/persistence/pg-transaction.ts";
import {
  createIsolatedSchema,
  insertTenant,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";
import { seedActors } from "@/testing/seed-actors.ts";
import {
  InMemoryEncounterCandidateAssociationRepository,
  PostgresEncounterCandidateAssociationRepository,
} from "./encounter-candidate-association.repository.ts";
import { PostgresOfficialMatchSelectionRepository } from "./official-result.repository.ts";
import { createTransition, newActorId, newRef } from "./official-selection.fixtures.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
// Every Postgres case is at least one remote round trip; the 5 s default is too tight.
if (databaseUrl) vi.setConfig({ testTimeout: 60_000 });
const SETUP_TIMEOUT_MS = 180_000;

interface CandidateHarness {
  readonly repository: EncounterCandidateAssociationRepository;
  readonly orgA: OrganizationId;
  readonly orgB: OrganizationId;
}

function candidate(
  organizationId: OrganizationId,
  encounterId: EncounterId,
  externalId: string,
  eligible = true,
): EncounterCandidateAssociation {
  return {
    id: `${organizationId}:${encounterId}:ea-clubs:${externalId}`,
    organizationId,
    encounterId,
    providerMatchRef: { providerKey: "ea-clubs", externalId },
    eligible,
    associatedAt: new Date("2026-09-14T20:00:00.000Z"),
    lastEvaluatedAt: new Date("2026-09-14T20:00:00.000Z"),
  };
}

const byExternalId = (left: EncounterCandidateAssociation, right: EncounterCandidateAssociation) =>
  left.providerMatchRef.externalId.localeCompare(right.providerMatchRef.externalId);

function defineCandidateContract(name: string, create: () => Promise<CandidateHarness>): void {
  describe(`${name}: encounter candidate associations`, () => {
    it("scopes replace, list and findByRef by organization", async () => {
      const { repository, orgA, orgB } = await create();
      const encounterId = asEncounterId(`enc-${randomUUID()}`);

      await repository.replaceForEncounter(
        orgA,
        encounterId,
        [candidate(orgA, encounterId, "match-a")],
        0,
      );
      await repository.replaceForEncounter(
        orgB,
        encounterId,
        [candidate(orgB, encounterId, "match-b")],
        0,
      );

      await expect(repository.listByEncounter(orgA, encounterId)).resolves.toEqual([
        candidate(orgA, encounterId, "match-a"),
      ]);
      await expect(repository.listByEncounter(orgB, encounterId)).resolves.toEqual([
        candidate(orgB, encounterId, "match-b"),
      ]);
      await expect(
        repository.findByRef(orgA, encounterId, { providerKey: "ea-clubs", externalId: "match-b" }),
      ).resolves.toBeNull();
      await expect(
        repository.findByRef(orgB, encounterId, { providerKey: "ea-clubs", externalId: "match-b" }),
      ).resolves.toEqual(candidate(orgB, encounterId, "match-b"));
    });

    it("compares and swaps on the generation", async () => {
      const { repository, orgA } = await create();
      const encounterId = asEncounterId(`enc-${randomUUID()}`);
      const row = (externalId: string, eligible = true) =>
        candidate(orgA, encounterId, externalId, eligible);

      await expect(repository.loadForEncounter(orgA, encounterId)).resolves.toEqual({
        associations: [],
        generation: 0,
      });
      await expect(
        repository.replaceForEncounter(orgA, encounterId, [row("match-a")], 0),
      ).resolves.toMatchObject({ status: "replaced", generation: 1 });
      await expect(
        repository.replaceForEncounter(orgA, encounterId, [row("stale")], 0),
      ).resolves.toEqual({ status: "conflict", generation: 1 });
      await expect(
        repository.replaceForEncounter(orgA, encounterId, [row("stale")], 7),
      ).resolves.toEqual({ status: "conflict", generation: 1 });
      await expect(repository.listByEncounter(orgA, encounterId)).resolves.toEqual([
        row("match-a"),
      ]);

      await expect(
        repository.replaceForEncounter(
          orgA,
          encounterId,
          [row("match-a", false), row("match-b")],
          1,
        ),
      ).resolves.toMatchObject({ status: "replaced", generation: 2 });
      const loaded = await repository.loadForEncounter(orgA, encounterId);
      expect(loaded.generation).toBe(2);
      expect([...loaded.associations].sort(byExternalId)).toEqual([
        row("match-a", false),
        row("match-b"),
      ]);
    });

    it("drops rows that left the set and keeps the row identity of those that stayed", async () => {
      const { repository, orgA } = await create();
      const encounterId = asEncounterId(`enc-${randomUUID()}`);
      await repository.replaceForEncounter(
        orgA,
        encounterId,
        [candidate(orgA, encounterId, "keep"), candidate(orgA, encounterId, "drop")],
        0,
      );

      await repository.replaceForEncounter(
        orgA,
        encounterId,
        [candidate(orgA, encounterId, "keep", false)],
        1,
      );

      await expect(repository.listByEncounter(orgA, encounterId)).resolves.toEqual([
        candidate(orgA, encounterId, "keep", false),
      ]);
    });

    it("writeIfEligible refuses the write for an ineligible or missing candidate", async () => {
      const { repository, orgA } = await create();
      const encounterId = asEncounterId(`enc-${randomUUID()}`);
      const eligible: ExternalReference = { providerKey: "ea-clubs", externalId: "ok" };
      const ineligible: ExternalReference = { providerKey: "ea-clubs", externalId: "off" };
      const missing: ExternalReference = { providerKey: "ea-clubs", externalId: "never" };
      await repository.replaceForEncounter(
        orgA,
        encounterId,
        [candidate(orgA, encounterId, "ok"), candidate(orgA, encounterId, "off", false)],
        0,
      );

      const writes: string[] = [];
      const write = async () => {
        writes.push("saved");
        return "saved";
      };

      await expect(
        repository.writeIfEligible(orgA, encounterId, [eligible, ineligible], write),
      ).resolves.toEqual({ status: "ineligible", providerMatchRef: ineligible });
      await expect(
        repository.writeIfEligible(orgA, encounterId, [missing], write),
      ).resolves.toEqual({ status: "ineligible", providerMatchRef: missing });
      expect(writes).toEqual([]);

      await expect(
        repository.writeIfEligible(orgA, encounterId, [eligible], write),
      ).resolves.toEqual({ status: "wrote", value: "saved" });
      expect(writes).toEqual(["saved"]);
    });

    it("writeIfEligible does not see candidates of another organization", async () => {
      const { repository, orgA, orgB } = await create();
      const encounterId = asEncounterId(`enc-${randomUUID()}`);
      const ref: ExternalReference = { providerKey: "ea-clubs", externalId: "only-a" };
      await repository.replaceForEncounter(
        orgA,
        encounterId,
        [candidate(orgA, encounterId, "only-a")],
        0,
      );

      await expect(
        repository.writeIfEligible(orgB, encounterId, [ref], async () => "saved"),
      ).resolves.toEqual({ status: "ineligible", providerMatchRef: ref });
    });
  });
}

defineCandidateContract("in-memory", async () => ({
  repository: new InMemoryEncounterCandidateAssociationRepository(),
  orgA: asOrganizationId("org-a"),
  orgB: asOrganizationId("org-b"),
}));

describe.skipIf(!databaseUrl)("postgres encounter candidate associations", () => {
  let isolated: IsolatedSchema;
  let pool: Pool;
  let orgA: OrganizationId;
  let orgB: OrganizationId;
  let competitionA: string;

  beforeAll(async () => {
    isolated = await createIsolatedSchema(databaseUrl!, "encounter_candidates");
    pool = isolated.pool;
    await migrateIsolatedSchema(pool);
    const suffix = isolated.schema.slice(-8);
    competitionA = `comp-a-${suffix}`;
    await insertTenant(pool, `org-a-${suffix}`, competitionA);
    await insertTenant(pool, `org-b-${suffix}`, `comp-b-${suffix}`);
    orgA = asOrganizationId(`org-a-${suffix}`);
    orgB = asOrganizationId(`org-b-${suffix}`);
  }, SETUP_TIMEOUT_MS);

  afterAll(async () => {
    await isolated?.drop();
  }, SETUP_TIMEOUT_MS);

  defineCandidateContract("postgres", async () => ({
    repository: new PostgresEncounterCandidateAssociationRepository(pool),
    orgA,
    orgB,
  }));

  it("lets only one of two concurrent first writes create the set", async () => {
    const repository = new PostgresEncounterCandidateAssociationRepository(pool);
    const encounterId = asEncounterId(`enc-${randomUUID()}`);

    const outcomes = await Promise.all([
      repository.replaceForEncounter(orgA, encounterId, [candidate(orgA, encounterId, "one")], 0),
      repository.replaceForEncounter(orgA, encounterId, [candidate(orgA, encounterId, "two")], 0),
    ]);

    expect(outcomes.map((outcome) => outcome.status).sort()).toEqual(["conflict", "replaced"]);
    const loaded = await repository.loadForEncounter(orgA, encounterId);
    expect(loaded.generation).toBe(1);
    expect(loaded.associations).toHaveLength(1);
  });

  it("runs the write inside the eligibility transaction and rolls it back on failure", async () => {
    const repository = new PostgresEncounterCandidateAssociationRepository(pool);
    const selections = new PostgresOfficialMatchSelectionRepository(pool);
    const encounterId = asEncounterId(`enc-${randomUUID()}`);
    const actorId = newActorId();
    await seedActors(pool, actorId);
    const ref = newRef();
    await repository.replaceForEncounter(
      orgA,
      encounterId,
      [
        {
          ...candidate(orgA, encounterId, ref.externalId),
          providerMatchRef: ref,
        },
      ],
      0,
    );
    const transition = createTransition(
      { organizationId: orgA, competitionId: asCompetitionId(competitionA) },
      encounterId,
      actorId,
      [ref],
    );

    await expect(
      repository.writeIfEligible(orgA, encounterId, [ref], async () => {
        await selections.commitTransition(transition);
        throw new Error("write failed");
      }),
    ).rejects.toThrow("write failed");
    await expect(selections.findLatestByEncounter(encounterId)).resolves.toBeNull();

    await expect(
      repository.writeIfEligible(orgA, encounterId, [ref], () =>
        selections.commitTransition(transition),
      ),
    ).resolves.toEqual({ status: "wrote", value: { status: "committed" } });
    await expect(selections.findLatestByEncounter(encounterId)).resolves.toEqual(
      transition.selection,
    );
  });

  it("makes a concurrent replace wait for an eligible write in flight", async () => {
    const repository = new PostgresEncounterCandidateAssociationRepository(pool);
    const transaction = new PostgresTransactionPort(pool);
    const encounterId = asEncounterId(`enc-${randomUUID()}`);
    const ref: ExternalReference = { providerKey: "ea-clubs", externalId: "contended" };
    await repository.replaceForEncounter(
      orgA,
      encounterId,
      [candidate(orgA, encounterId, "contended")],
      0,
    );

    const events: string[] = [];
    let writing: () => void = () => undefined;
    const writeStarted = new Promise<void>((resolve) => {
      writing = resolve;
    });
    const write = transaction.runInTransaction(() =>
      repository.writeIfEligible(orgA, encounterId, [ref], async () => {
        events.push("write-start");
        writing();
        await new Promise((resolve) => setTimeout(resolve, 300));
        events.push("write-end");
      }),
    );
    const replace = writeStarted.then(async () => {
      const result = await repository.replaceForEncounter(
        orgA,
        encounterId,
        [candidate(orgA, encounterId, "contended", false)],
        1,
      );
      events.push("replace-done");
      return result;
    });

    const [written, replaced] = await Promise.all([write, replace]);

    expect(written.status).toBe("wrote");
    expect(replaced.status).toBe("replaced");
    expect(events).toEqual(["write-start", "write-end", "replace-done"]);
    await expect(repository.findByRef(orgA, encounterId, ref)).resolves.toMatchObject({
      eligible: false,
    });
  });

  it("does not let a recalculation that ran first be overwritten by a stale write", async () => {
    const repository = new PostgresEncounterCandidateAssociationRepository(pool);
    const encounterId = asEncounterId(`enc-${randomUUID()}`);
    const ref: ExternalReference = { providerKey: "ea-clubs", externalId: "flipped" };
    await repository.replaceForEncounter(
      orgA,
      encounterId,
      [candidate(orgA, encounterId, "flipped")],
      0,
    );
    await repository.replaceForEncounter(
      orgA,
      encounterId,
      [candidate(orgA, encounterId, "flipped", false)],
      1,
    );

    await expect(
      repository.writeIfEligible(orgA, encounterId, [ref], async () => "saved"),
    ).resolves.toEqual({ status: "ineligible", providerMatchRef: ref });
  });
});
