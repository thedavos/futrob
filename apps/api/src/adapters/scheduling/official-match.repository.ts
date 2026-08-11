import type {
  OfficialMatch,
  OfficialMatchRepository,
  OfficialMatchStatus,
} from "@futrob/scheduling";
import {
  asCompetitionId,
  asEncounterId,
  asOfficialMatchSlotId,
  asOrganizationId,
  type EncounterId,
} from "@futrob/shared-kernel";
import type { Pool, QueryResultRow } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

export class InMemoryOfficialMatchRepository implements OfficialMatchRepository {
  readonly rows = new Map<string, OfficialMatch>();

  async listByEncounter(encounterId: EncounterId): Promise<OfficialMatch[]> {
    return [...this.rows.values()]
      .filter((match) => match.encounterId === encounterId)
      .sort((left, right) => left.slot - right.slot);
  }

  async upsertMany(matches: readonly OfficialMatch[]): Promise<void> {
    for (const match of matches) {
      const key = officialMatchKey(match.encounterId, match.slot);
      if (!this.rows.has(key)) this.rows.set(key, match);
    }
  }
}

export class PostgresOfficialMatchRepository implements OfficialMatchRepository {
  constructor(private readonly pool: Pool) {}

  async listByEncounter(encounterId: EncounterId): Promise<OfficialMatch[]> {
    const result = await getPgExecutor(this.pool).query<OfficialMatchRow>(
      `SELECT id, encounter_id, organization_id, competition_id, slot, status, created_at
       FROM official_matches
       WHERE encounter_id = $1
       ORDER BY slot`,
      [encounterId],
    );
    return result.rows.map(rehydrateOfficialMatch);
  }

  async upsertMany(matches: readonly OfficialMatch[]): Promise<void> {
    if (matches.length === 0) return;

    const values = matches.flatMap((match) => [
      match.id,
      match.encounterId,
      match.organizationId,
      match.competitionId,
      match.slot,
      match.status,
      match.createdAt.toISOString(),
    ]);
    const placeholders = matches
      .map((_, index) => {
        const offset = index * 7;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`;
      })
      .join(", ");

    await getPgExecutor(this.pool).query(
      `INSERT INTO official_matches (
         id, encounter_id, organization_id, competition_id, slot, status, created_at
       ) VALUES ${placeholders}
       ON CONFLICT (encounter_id, slot) DO NOTHING`,
      values,
    );
  }
}

interface OfficialMatchRow extends QueryResultRow {
  id: string;
  encounter_id: string;
  organization_id: string;
  competition_id: string;
  slot: number;
  status: string;
  created_at: Date | string;
}

function rehydrateOfficialMatch(row: OfficialMatchRow): OfficialMatch {
  return {
    id: asOfficialMatchSlotId(row.id),
    encounterId: asEncounterId(row.encounter_id),
    organizationId: asOrganizationId(row.organization_id),
    competitionId: asCompetitionId(row.competition_id),
    slot: parseOfficialMatchSlot(row.slot),
    status: parseOfficialMatchStatus(row.status),
    createdAt: new Date(row.created_at),
  };
}

function parseOfficialMatchSlot(value: number): OfficialMatch["slot"] {
  if (value === 1 || value === 2) return value;
  throw new TypeError(`Invalid official match slot: ${value}`);
}

function parseOfficialMatchStatus(value: string): OfficialMatchStatus {
  switch (value) {
    case "scheduled":
    case "awaiting_selection":
    case "selected":
    case "completed":
    case "voided":
      return value;
    default:
      throw new TypeError(`Invalid official match status: ${value}`);
  }
}

function officialMatchKey(encounterId: EncounterId, slot: OfficialMatch["slot"]): string {
  return `${encounterId}:${slot}`;
}
import type { OfficialMatch, OfficialMatchRepository } from "@futrob/scheduling";
import {
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  type EncounterId,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

export class InMemoryOfficialMatchRepository implements OfficialMatchRepository {
  readonly rows = new Map<string, OfficialMatch>();

  async listByEncounter(encounterId: EncounterId): Promise<OfficialMatch[]> {
    return [...this.rows.values()]
      .filter((match) => match.encounterId === encounterId)
      .sort((a, b) => a.slot - b.slot);
  }

  async upsertMany(matches: readonly OfficialMatch[]): Promise<void> {
    for (const match of matches) {
      const key = `${match.encounterId}:${match.slot}`;
      if (!this.rows.has(key)) {
        this.rows.set(key, match);
      }
    }
  }
}

export class PostgresOfficialMatchRepository implements OfficialMatchRepository {
  constructor(private readonly pool: Pool) {}

  async listByEncounter(encounterId: EncounterId): Promise<OfficialMatch[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, encounter_id, organization_id, competition_id, slot, status, created_at
       FROM official_matches
       WHERE encounter_id = $1
       ORDER BY slot ASC`,
      [encounterId],
    );
    return result.rows.map(rehydrate);
  }

  async upsertMany(matches: readonly OfficialMatch[]): Promise<void> {
    for (const match of matches) {
      await getPgExecutor(this.pool).query(
        `INSERT INTO official_matches (
           id, encounter_id, organization_id, competition_id, slot, status, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (encounter_id, slot) DO NOTHING`,
        [
          match.id,
          match.encounterId,
          match.organizationId,
          match.competitionId,
          match.slot,
          match.status,
          match.createdAt.toISOString(),
        ],
      );
    }
  }
}

function rehydrate(row: {
  id: string;
  encounter_id: string;
  organization_id: string;
  competition_id: string;
  slot: number;
  status: OfficialMatch["status"];
  created_at: Date | string;
}): OfficialMatch {
  return {
    id: row.id,
    encounterId: asEncounterId(row.encounter_id),
    organizationId: asOrganizationId(row.organization_id),
    competitionId: asCompetitionId(row.competition_id),
    slot: row.slot as 1 | 2,
    status: row.status,
    createdAt: new Date(row.created_at),
  };
}
