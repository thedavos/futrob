import type {
  OfficialResult,
  OfficialResultRepository,
  OfficialResultSlotSnapshot,
} from "@futrob/results";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  type CompetitionId,
  type EncounterId,
  type OrganizationId,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { z } from "zod";
import { parseJsonColumn, type PgJsonInput } from "@/adapters/persistence/parse-json-column.ts";
import {
  pgNullableTextSchema,
  pgTextSchema,
  pgTimestampSchema,
} from "@/adapters/persistence/pg-scalar.ts";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";
import { externalReferenceSchema } from "./official-selection-rows.ts";

export { InMemoryOfficialMatchSelectionRepository } from "./official-selection.in-memory.ts";
export type { InMemoryReferenceClaim } from "./official-selection.in-memory.ts";
export { PostgresOfficialMatchSelectionRepository } from "./official-selection.postgres.ts";

const officialResultStatusSchema = z.enum(["approved", "voided"]);
const approvalBasisSchema = z.enum(["team_agreement", "operator_resolution"]);

const providerPlayerMatchStatsSchema = z.object({
  externalPlayerId: z.string(),
  displayName: z.string(),
  externalClubId: z.string(),
  position: z.string().nullable(),
  minutesPlayed: z.number().nullable(),
  goals: z.number().nullable(),
  assists: z.number().nullable(),
  shots: z.number().nullable(),
  passAttempts: z.number().nullable(),
  passesMade: z.number().nullable(),
  tackleAttempts: z.number().nullable(),
  tacklesMade: z.number().nullable(),
  saves: z.number().nullable(),
  yellowCards: z.number().nullable(),
  redCards: z.number().nullable(),
  isMvp: z.boolean().nullable(),
  rating: z.number().nullable(),
});

const officialResultSlotSnapshotSchema = z.object({
  officialSlot: z.union([z.literal(1), z.literal(2)]),
  providerMatchRef: externalReferenceSchema,
  homeExternalClubId: z.string(),
  awayExternalClubId: z.string(),
  homeGoals: z.number(),
  awayGoals: z.number(),
  occurredAt: z.union([pgTimestampSchema, z.string()]),
  gameEdition: z.string(),
  platform: z.string(),
  players: z.array(providerPlayerMatchStatsSchema),
});

const officialResultRowSchema = z.object({
  id: pgTextSchema,
  encounter_id: pgTextSchema,
  organization_id: pgTextSchema,
  competition_id: pgTextSchema,
  revision: z.coerce.number(),
  status: officialResultStatusSchema,
  slots: z.custom<PgJsonInput>((value) => value !== undefined),
  approved_at: pgTimestampSchema,
  approved_by: pgTextSchema,
  selection_id: pgNullableTextSchema,
  proposal_id: pgNullableTextSchema,
  approval_basis: z.union([z.null(), approvalBasisSchema]),
});

export class InMemoryOfficialResultRepository implements OfficialResultRepository {
  rows: OfficialResult[] = [];

  async append(result: OfficialResult): Promise<OfficialResult> {
    if (
      this.rows.some(
        (row) =>
          row.id === result.id ||
          (row.encounterId === result.encounterId && row.revision === result.revision),
      )
    ) {
      throw new Error(
        `Official result revision ${result.revision} already exists for encounter ${result.encounterId}`,
      );
    }
    const stored = normalizeOfficialResult(result);
    this.rows.push(stored);
    return stored;
  }

  async markVoided(officialResultId: string): Promise<OfficialResult | null> {
    const row = this.rows.find((candidate) => candidate.id === officialResultId);
    if (!row) return null;
    if (row.status === "voided") return row;
    const voided = { ...row, status: "voided" as const };
    this.rows = this.rows.map((candidate) => (candidate.id === voided.id ? voided : candidate));
    return voided;
  }

  async findApprovedByEncounter(encounterId: EncounterId): Promise<OfficialResult | null> {
    return (
      [...this.rows]
        .filter((row) => row.encounterId === encounterId && row.status === "approved")
        .sort((a, b) => b.revision - a.revision)[0] ?? null
    );
  }

  async findById(officialResultId: string): Promise<OfficialResult | null> {
    return this.rows.find((row) => row.id === officialResultId) ?? null;
  }

  async findLatestByEncounter(encounterId: EncounterId): Promise<OfficialResult | null> {
    return (
      this.rows
        .filter((row) => row.encounterId === encounterId)
        .sort((left, right) => right.revision - left.revision)[0] ?? null
    );
  }

  async listByCompetition(
    competitionId: CompetitionId,
    organizationId?: OrganizationId,
  ): Promise<OfficialResult[]> {
    return this.rows.filter(
      (row) =>
        row.competitionId === competitionId &&
        (organizationId === undefined || row.organizationId === organizationId),
    );
  }

  async listByEncounter(encounterId: EncounterId): Promise<OfficialResult[]> {
    return this.rows
      .filter((row) => row.encounterId === encounterId)
      .sort((left, right) => left.revision - right.revision);
  }
}

function normalizeOfficialResult(result: OfficialResult): OfficialResult {
  return {
    ...result,
    selectionId: result.selectionId ?? null,
    proposalId: result.proposalId ?? null,
    approvalBasis: result.approvalBasis ?? null,
  };
}

const RESULT_COLUMNS = `id, encounter_id, organization_id, competition_id, revision, status,
  slots, approved_at, approved_by, selection_id, proposal_id, approval_basis`;

export class PostgresOfficialResultRepository implements OfficialResultRepository {
  constructor(private readonly pool: Pool) {}

  async append(result: OfficialResult): Promise<OfficialResult> {
    await getPgExecutor(this.pool).query(
      `INSERT INTO official_results (
         id, encounter_id, organization_id, competition_id, revision, status,
         slots, approved_at, approved_by, selection_id, proposal_id, approval_basis
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12)`,
      [
        result.id,
        result.encounterId,
        result.organizationId,
        result.competitionId,
        result.revision,
        result.status,
        JSON.stringify(
          result.slots.map((slot) => ({
            ...slot,
            occurredAt: slot.occurredAt.toISOString(),
          })),
        ),
        result.approvedAt.toISOString(),
        result.approvedBy,
        result.selectionId ?? null,
        result.proposalId ?? null,
        result.approvalBasis ?? null,
      ],
    );
    return normalizeOfficialResult(result);
  }

  async markVoided(officialResultId: string): Promise<OfficialResult | null> {
    const result = await getPgExecutor(this.pool).query(
      `UPDATE official_results
       SET status = 'voided'
       WHERE id = $1 AND status = 'approved'
       RETURNING ${RESULT_COLUMNS}`,
      [officialResultId],
    );
    const row = result.rows[0];
    return row
      ? rehydrateOfficialResult(officialResultRowSchema.parse(row))
      : this.findById(officialResultId);
  }

  async findApprovedByEncounter(encounterId: EncounterId): Promise<OfficialResult | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT ${RESULT_COLUMNS}
       FROM official_results
       WHERE encounter_id = $1 AND status = 'approved'
       ORDER BY revision DESC
       LIMIT 1`,
      [encounterId],
    );
    const row = result.rows[0];
    return row ? rehydrateOfficialResult(officialResultRowSchema.parse(row)) : null;
  }

  async findById(officialResultId: string): Promise<OfficialResult | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT ${RESULT_COLUMNS}
       FROM official_results
       WHERE id = $1`,
      [officialResultId],
    );
    const row = result.rows[0];
    return row ? rehydrateOfficialResult(officialResultRowSchema.parse(row)) : null;
  }

  async findLatestByEncounter(encounterId: EncounterId): Promise<OfficialResult | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT ${RESULT_COLUMNS}
       FROM official_results
       WHERE encounter_id = $1
       ORDER BY revision DESC
       LIMIT 1`,
      [encounterId],
    );
    const row = result.rows[0];
    return row ? rehydrateOfficialResult(officialResultRowSchema.parse(row)) : null;
  }

  async listByCompetition(
    competitionId: CompetitionId,
    organizationId?: OrganizationId,
  ): Promise<OfficialResult[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT ${RESULT_COLUMNS}
       FROM official_results
       WHERE competition_id = $1 AND ($2::text IS NULL OR organization_id = $2)
       ORDER BY encounter_id, revision`,
      [competitionId, organizationId ?? null],
    );
    return result.rows.map((row) => rehydrateOfficialResult(officialResultRowSchema.parse(row)));
  }

  async listByEncounter(encounterId: EncounterId): Promise<OfficialResult[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT ${RESULT_COLUMNS}
       FROM official_results
       WHERE encounter_id = $1
       ORDER BY revision`,
      [encounterId],
    );
    return result.rows.map((row) => rehydrateOfficialResult(officialResultRowSchema.parse(row)));
  }
}

function rehydrateOfficialResult(row: z.infer<typeof officialResultRowSchema>): OfficialResult {
  const slots = parseJsonColumn(z.array(officialResultSlotSnapshotSchema), row.slots).map(
    rehydrateOfficialResultSlot,
  );
  return {
    id: row.id,
    encounterId: asEncounterId(row.encounter_id),
    organizationId: asOrganizationId(row.organization_id),
    competitionId: asCompetitionId(row.competition_id),
    revision: row.revision,
    status: row.status,
    slots,
    approvedAt: row.approved_at,
    approvedBy: asActorId(row.approved_by),
    selectionId: row.selection_id,
    proposalId: row.proposal_id,
    approvalBasis: row.approval_basis,
  };
}

function rehydrateOfficialResultSlot(
  slot: z.infer<typeof officialResultSlotSnapshotSchema>,
): OfficialResultSlotSnapshot {
  return {
    ...slot,
    occurredAt: slot.occurredAt instanceof Date ? slot.occurredAt : new Date(slot.occurredAt),
  };
}
