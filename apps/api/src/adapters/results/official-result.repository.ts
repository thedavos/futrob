import type {
  OfficialMatchSelection,
  OfficialMatchSelectionRepository,
  OfficialResult,
  OfficialResultRepository,
} from "@futrob/results";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  type EncounterId,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

export class InMemoryOfficialMatchSelectionRepository implements OfficialMatchSelectionRepository {
  rows: OfficialMatchSelection[] = [];

  async save(selection: OfficialMatchSelection): Promise<OfficialMatchSelection> {
    this.rows = this.rows.filter((row) => row.id !== selection.id);
    this.rows.push(selection);
    return selection;
  }

  async findLatestByEncounter(encounterId: EncounterId): Promise<OfficialMatchSelection | null> {
    return (
      [...this.rows]
        .reverse()
        .find((row) => row.encounterId === encounterId) ?? null
    );
  }
}

export class InMemoryOfficialResultRepository implements OfficialResultRepository {
  rows: OfficialResult[] = [];

  async save(result: OfficialResult): Promise<OfficialResult> {
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
    return row ? rehydrateOfficialResult(row) : null;
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
    return row ? rehydrateOfficialResult(row) : null;
  }
}

function rehydrateOfficialResult(row: {
  id: string;
  encounter_id: string;
  organization_id: string;
  competition_id: string;
  revision: number;
  status: OfficialResult["status"];
  slots: Array<Record<string, unknown>>;
  approved_at: Date | string;
  approved_by: string;
}): OfficialResult {
  return {
    id: row.id,
    encounterId: asEncounterId(row.encounter_id),
    organizationId: asOrganizationId(row.organization_id),
    competitionId: asCompetitionId(row.competition_id),
    revision: Number(row.revision),
    status: row.status,
    slots: row.slots.map((slot) => ({
      ...(slot as OfficialResult["slots"][number]),
      occurredAt: new Date(String(slot.occurredAt)),
    })),
    approvedAt: new Date(row.approved_at),
    approvedBy: asActorId(row.approved_by),
  };
}
