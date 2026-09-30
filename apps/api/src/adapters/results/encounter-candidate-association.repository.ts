import { externalReferenceKey, type ExternalReference } from "@futrob/game-data";
import type {
  EncounterCandidateAssociation,
  EncounterCandidateAssociationRepository,
  ReplaceEncounterCandidatesResult,
  WriteIfEligibleResult,
} from "@futrob/results";
import { gameDataProviderKeyQuerySchema } from "@futrob/api-contracts";
import {
  asEncounterId,
  asOrganizationId,
  type EncounterId,
  type OrganizationId,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { z } from "zod";
import { pgTextSchema, pgTimestampSchema } from "@/adapters/persistence/pg-scalar.ts";
import { getPgExecutor, runInPgAtomicScope } from "@/adapters/persistence/pg-transaction.ts";

function encounterSetKey(organizationId: OrganizationId, encounterId: EncounterId): string {
  return `${organizationId}:${encounterId}`;
}

export class InMemoryEncounterCandidateAssociationRepository implements EncounterCandidateAssociationRepository {
  rows: EncounterCandidateAssociation[] = [];
  private readonly generations = new Map<string, number>();
  private readonly tails = new Map<string, Promise<void>>();

  async loadForEncounter(organizationId: OrganizationId, encounterId: EncounterId) {
    return {
      associations: await this.listByEncounter(organizationId, encounterId),
      generation: this.generations.get(encounterSetKey(organizationId, encounterId)) ?? 0,
    };
  }

  async replaceForEncounter(
    organizationId: OrganizationId,
    encounterId: EncounterId,
    rows: readonly EncounterCandidateAssociation[],
    expectedGeneration: number,
  ): Promise<ReplaceEncounterCandidatesResult> {
    return this.runExclusive(encounterSetKey(organizationId, encounterId), async () => {
      const current = this.generations.get(encounterSetKey(organizationId, encounterId)) ?? 0;
      if (current !== expectedGeneration) {
        return { status: "conflict", generation: current };
      }
      this.rows = this.rows.filter(
        (row) => row.organizationId !== organizationId || row.encounterId !== encounterId,
      );
      this.rows.push(...rows);
      const generation = current + 1;
      this.generations.set(encounterSetKey(organizationId, encounterId), generation);
      return { status: "replaced", associations: rows, generation };
    });
  }

  async listByEncounter(
    organizationId: OrganizationId,
    encounterId: EncounterId,
  ): Promise<readonly EncounterCandidateAssociation[]> {
    return this.rows.filter(
      (row) => row.organizationId === organizationId && row.encounterId === encounterId,
    );
  }

  async findByRef(
    organizationId: OrganizationId,
    encounterId: EncounterId,
    providerMatchRef: ExternalReference,
  ): Promise<EncounterCandidateAssociation | null> {
    return this.findSync(organizationId, encounterId, providerMatchRef);
  }

  async writeIfEligible<T>(
    organizationId: OrganizationId,
    encounterId: EncounterId,
    requiredRefs: readonly ExternalReference[],
    write: () => Promise<T>,
  ): Promise<WriteIfEligibleResult<T>> {
    return this.runExclusive(encounterSetKey(organizationId, encounterId), async () => {
      for (const providerMatchRef of requiredRefs) {
        const association = this.findSync(organizationId, encounterId, providerMatchRef);
        if (!association || !association.eligible) {
          return { status: "ineligible", providerMatchRef };
        }
      }
      return { status: "wrote", value: await write() };
    });
  }

  private findSync(
    organizationId: OrganizationId,
    encounterId: EncounterId,
    providerMatchRef: ExternalReference,
  ): EncounterCandidateAssociation | null {
    const key = externalReferenceKey(providerMatchRef);
    return (
      this.rows.find(
        (row) =>
          row.organizationId === organizationId &&
          row.encounterId === encounterId &&
          externalReferenceKey(row.providerMatchRef) === key,
      ) ?? null
    );
  }

  private async runExclusive<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = previous.then(() => hold);
    this.tails.set(key, tail);
    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.tails.get(key) === tail) this.tails.delete(key);
    }
  }
}

const candidateRowSchema = z.object({
  id: pgTextSchema,
  organization_id: pgTextSchema,
  encounter_id: pgTextSchema,
  provider_key: gameDataProviderKeyQuerySchema,
  external_match_id: pgTextSchema,
  eligible: z.boolean(),
  associated_at: pgTimestampSchema,
  last_evaluated_at: pgTimestampSchema,
});

const CANDIDATE_COLUMNS =
  "id, organization_id, encounter_id, provider_key, external_match_id, eligible, associated_at, last_evaluated_at";

export class PostgresEncounterCandidateAssociationRepository implements EncounterCandidateAssociationRepository {
  constructor(private readonly pool: Pool) {}

  async loadForEncounter(organizationId: OrganizationId, encounterId: EncounterId) {
    return runInPgAtomicScope(this.pool, async () => ({
      associations: await this.listByEncounter(organizationId, encounterId),
      generation: await this.currentGeneration(organizationId, encounterId),
    }));
  }

  async replaceForEncounter(
    organizationId: OrganizationId,
    encounterId: EncounterId,
    rows: readonly EncounterCandidateAssociation[],
    expectedGeneration: number,
  ): Promise<ReplaceEncounterCandidatesResult> {
    return runInPgAtomicScope(
      this.pool,
      async () => {
        const db = getPgExecutor(this.pool);
        const won =
          expectedGeneration === 0
            ? await db.query(
                `INSERT INTO encounter_candidate_sets (organization_id, encounter_id, generation)
                 VALUES ($1, $2, 1)
                 ON CONFLICT DO NOTHING`,
                [organizationId, encounterId],
              )
            : await db.query(
                `UPDATE encounter_candidate_sets
                 SET generation = generation + 1
                 WHERE organization_id = $1 AND encounter_id = $2 AND generation = $3`,
                [organizationId, encounterId, expectedGeneration],
              );
        if (won.rowCount !== 1) {
          return {
            status: "conflict" as const,
            generation: await this.currentGeneration(organizationId, encounterId),
          };
        }

        // Upsert rather than delete-and-insert, so a concurrent `writeIfEligible` that
        // holds a share lock on a row waits for the new values instead of losing the row.
        for (const row of rows) {
          await db.query(
            `INSERT INTO encounter_candidates (
               id, organization_id, encounter_id, provider_key, external_match_id, eligible,
               associated_at, last_evaluated_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO UPDATE SET
               eligible = EXCLUDED.eligible,
               associated_at = EXCLUDED.associated_at,
               last_evaluated_at = EXCLUDED.last_evaluated_at`,
            [
              row.id,
              organizationId,
              encounterId,
              row.providerMatchRef.providerKey,
              row.providerMatchRef.externalId,
              row.eligible,
              row.associatedAt.toISOString(),
              row.lastEvaluatedAt.toISOString(),
            ],
          );
        }
        await db.query(
          `DELETE FROM encounter_candidates
           WHERE organization_id = $1 AND encounter_id = $2 AND id <> ALL($3::text[])`,
          [organizationId, encounterId, rows.map((row) => row.id)],
        );
        return {
          status: "replaced" as const,
          associations: rows,
          generation: await this.currentGeneration(organizationId, encounterId),
        };
      },
      { rollbackWhen: (result) => result.status === "conflict" },
    );
  }

  async listByEncounter(
    organizationId: OrganizationId,
    encounterId: EncounterId,
  ): Promise<readonly EncounterCandidateAssociation[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT ${CANDIDATE_COLUMNS}
       FROM encounter_candidates
       WHERE organization_id = $1 AND encounter_id = $2
       ORDER BY provider_key, external_match_id`,
      [organizationId, encounterId],
    );
    return result.rows.map((row) => rehydrateCandidate(candidateRowSchema.parse(row)));
  }

  async findByRef(
    organizationId: OrganizationId,
    encounterId: EncounterId,
    providerMatchRef: ExternalReference,
  ): Promise<EncounterCandidateAssociation | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT ${CANDIDATE_COLUMNS}
       FROM encounter_candidates
       WHERE organization_id = $1 AND encounter_id = $2
         AND provider_key = $3 AND external_match_id = $4`,
      [organizationId, encounterId, providerMatchRef.providerKey, providerMatchRef.externalId],
    );
    const row = result.rows[0];
    return row ? rehydrateCandidate(candidateRowSchema.parse(row)) : null;
  }

  async writeIfEligible<T>(
    organizationId: OrganizationId,
    encounterId: EncounterId,
    requiredRefs: readonly ExternalReference[],
    write: () => Promise<T>,
  ): Promise<WriteIfEligibleResult<T>> {
    return runInPgAtomicScope(this.pool, async () => {
      // The share lock makes a concurrent replace wait until `write` has committed.
      const locked = await getPgExecutor(this.pool).query(
        `SELECT provider_key, external_match_id, eligible
         FROM encounter_candidates
         WHERE organization_id = $1 AND encounter_id = $2
           AND (provider_key, external_match_id) IN (
             SELECT * FROM unnest($3::text[], $4::text[])
           )
         ORDER BY provider_key, external_match_id
         FOR SHARE`,
        [
          organizationId,
          encounterId,
          requiredRefs.map((ref) => ref.providerKey),
          requiredRefs.map((ref) => ref.externalId),
        ],
      );
      const eligibility = new Map<string, boolean>(
        locked.rows.map((row) => [`${row.provider_key}:${row.external_match_id}`, row.eligible]),
      );
      for (const providerMatchRef of requiredRefs) {
        if (eligibility.get(externalReferenceKey(providerMatchRef)) !== true) {
          return { status: "ineligible" as const, providerMatchRef };
        }
      }
      return { status: "wrote" as const, value: await write() };
    });
  }

  private async currentGeneration(
    organizationId: OrganizationId,
    encounterId: EncounterId,
  ): Promise<number> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT generation FROM encounter_candidate_sets
       WHERE organization_id = $1 AND encounter_id = $2`,
      [organizationId, encounterId],
    );
    return Number(result.rows[0]?.generation ?? 0);
  }
}

function rehydrateCandidate(
  row: z.infer<typeof candidateRowSchema>,
): EncounterCandidateAssociation {
  return {
    id: row.id,
    organizationId: asOrganizationId(row.organization_id),
    encounterId: asEncounterId(row.encounter_id),
    providerMatchRef: { providerKey: row.provider_key, externalId: row.external_match_id },
    eligible: row.eligible,
    associatedAt: row.associated_at,
    lastEvaluatedAt: row.last_evaluated_at,
  };
}
