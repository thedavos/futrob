import type {
  OfficialMatchSelection,
  OfficialMatchSelectionRepository,
  OfficialResult,
  OfficialResultRepository,
  OfficialResultSlotSnapshot,
} from "@futrob/results";
import { gameDataProviderKeyQuerySchema } from "@futrob/api-contracts";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  type CompetitionId,
  type EncounterId,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { z } from "zod";
import { parseJsonColumn, type PgJsonInput } from "@/adapters/persistence/parse-json-column.ts";
import { pgTextSchema, pgTimestampSchema } from "@/adapters/persistence/pg-scalar.ts";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

const officialResultStatusSchema = z.enum(["approved", "voided"]);

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
  providerMatchRef: z.object({
    providerKey: gameDataProviderKeyQuerySchema,
    externalId: z.string(),
  }),
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
});

export class InMemoryOfficialMatchSelectionRepository implements OfficialMatchSelectionRepository {
  rows: OfficialMatchSelection[] = [];

  async save(selection: OfficialMatchSelection): Promise<OfficialMatchSelection> {
    this.rows = this.rows.filter((row) => row.id !== selection.id);
    this.rows.push(selection);
    return selection;
  }

  async findLatestByEncounter(encounterId: EncounterId): Promise<OfficialMatchSelection | null> {
    return [...this.rows].reverse().find((row) => row.encounterId === encounterId) ?? null;
  }
}

export class InMemoryOfficialResultRepository implements OfficialResultRepository {
  rows: OfficialResult[] = [];

  async save(result: OfficialResult): Promise<OfficialResult> {
    this.rows = this.rows.filter(
      (row) =>
        row.id !== result.id &&
        !(row.encounterId === result.encounterId && row.revision === result.revision),
    );
    this.rows.push(result);
    return result;
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

  async listByCompetition(competitionId: CompetitionId): Promise<OfficialResult[]> {
    return this.rows.filter((row) => row.competitionId === competitionId);
  }

  async listByEncounter(encounterId: EncounterId): Promise<OfficialResult[]> {
    return this.rows.filter((row) => row.encounterId === encounterId);
  }
}

export class PostgresOfficialMatchSelectionRepository implements OfficialMatchSelectionRepository {
  constructor(private readonly pool: Pool) {}

  async save(selection: OfficialMatchSelection): Promise<OfficialMatchSelection> {
    await getPgExecutor(this.pool).query(
      `INSERT INTO official_match_selections (
         id, encounter_id, status, proposed_by_actor_id, proposed_at, slots
       ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         slots = EXCLUDED.slots`,
      [
        selection.id,
        selection.encounterId,
        selection.status,
        selection.proposedByActorId,
        selection.proposedAt.toISOString(),
        JSON.stringify(selection.slots),
      ],
    );
    return selection;
  }

  async findLatestByEncounter(encounterId: EncounterId): Promise<OfficialMatchSelection | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, encounter_id, status, proposed_by_actor_id, proposed_at, slots
       FROM official_match_selections
       WHERE encounter_id = $1
       ORDER BY proposed_at DESC
       LIMIT 1`,
      [encounterId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      encounterId: asEncounterId(row.encounter_id),
      status: row.status,
      proposedByActorId: row.proposed_by_actor_id,
      proposedAt: new Date(row.proposed_at),
      slots: row.slots,
    };
  }
}

export class PostgresOfficialResultRepository implements OfficialResultRepository {
  constructor(private readonly pool: Pool) {}

  async save(result: OfficialResult): Promise<OfficialResult> {
    await getPgExecutor(this.pool).query(
      `INSERT INTO official_results (
         id, encounter_id, organization_id, competition_id, revision, status,
         slots, approved_at, approved_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
       ON CONFLICT (encounter_id, revision) DO UPDATE SET
         status = EXCLUDED.status,
         slots = EXCLUDED.slots,
         approved_at = EXCLUDED.approved_at,
         approved_by = EXCLUDED.approved_by`,
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
      ],
    );
    return result;
  }

  async findApprovedByEncounter(encounterId: EncounterId): Promise<OfficialResult | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, encounter_id, organization_id, competition_id, revision, status,
              slots, approved_at, approved_by
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
      `SELECT id, encounter_id, organization_id, competition_id, revision, status,
              slots, approved_at, approved_by
       FROM official_results
       WHERE id = $1`,
      [officialResultId],
    );
    const row = result.rows[0];
    return row ? rehydrateOfficialResult(officialResultRowSchema.parse(row)) : null;
  }

  async findLatestByEncounter(encounterId: EncounterId): Promise<OfficialResult | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, encounter_id, organization_id, competition_id, revision, status,
              slots, approved_at, approved_by
       FROM official_results
       WHERE encounter_id = $1
       ORDER BY revision DESC
       LIMIT 1`,
      [encounterId],
    );
    const row = result.rows[0];
    return row ? rehydrateOfficialResult(officialResultRowSchema.parse(row)) : null;
  }

  async listByCompetition(competitionId: CompetitionId): Promise<OfficialResult[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, encounter_id, organization_id, competition_id, revision, status,
              slots, approved_at, approved_by
       FROM official_results
       WHERE competition_id = $1
       ORDER BY encounter_id, revision`,
      [competitionId],
    );
    return result.rows.map((row) => rehydrateOfficialResult(officialResultRowSchema.parse(row)));
  }

  async listByEncounter(encounterId: EncounterId): Promise<OfficialResult[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, encounter_id, organization_id, competition_id, revision, status,
              slots, approved_at, approved_by
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
