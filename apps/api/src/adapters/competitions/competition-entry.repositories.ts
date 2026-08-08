import {
  asCompetitionId,
  asOrganizationId,
  asTeamId,
  type CompetitionId,
  type OrganizationId,
  type TeamId,
} from "@futrob/shared-kernel";
import type {
  CompetitionEntry,
  CompetitionEntryRepository,
  CompetitionEntryStatus,
} from "@futrob/competitions";
import type { Pool } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

export class InMemoryCompetitionEntryRepository implements CompetitionEntryRepository {
  readonly rows = new Map<string, CompetitionEntry>();

  async findById(
    organizationId: OrganizationId,
    entryId: string,
  ): Promise<CompetitionEntry | null> {
    const entry = this.rows.get(entryId) ?? null;
    return entry?.organizationId === organizationId ? entry : null;
  }

  async findByCompetitionAndTeam(
    competitionId: CompetitionId,
    teamId: TeamId,
  ): Promise<CompetitionEntry | null> {
    return (
      [...this.rows.values()].find(
        (row) => row.competitionId === competitionId && row.teamId === teamId,
      ) ?? null
    );
  }

  async findByCreationKey(creationKey: string): Promise<CompetitionEntry | null> {
    return [...this.rows.values()].find((row) => row.creationKey === creationKey) ?? null;
  }

  async save(entry: CompetitionEntry): Promise<CompetitionEntry> {
    this.rows.set(entry.id, entry);
    return entry;
  }

  async listByCompetition(organizationId: OrganizationId, competitionId: CompetitionId) {
    return [...this.rows.values()].filter(
      (entry) => entry.organizationId === organizationId && entry.competitionId === competitionId,
    );
  }

  async remove(organizationId: OrganizationId, entryId: string): Promise<boolean> {
    const entry = this.rows.get(entryId);
    return entry?.organizationId === organizationId ? this.rows.delete(entryId) : false;
  }
}

export class PostgresCompetitionEntryRepository implements CompetitionEntryRepository {
  constructor(private readonly pool: Pool) {}

  async findById(
    organizationId: OrganizationId,
    entryId: string,
  ): Promise<CompetitionEntry | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, organization_id, competition_id, team_id, status, created_at, creation_key
       FROM competition_entries WHERE id = $1 AND organization_id = $2`,
      [entryId, organizationId],
    );
    return result.rows[0] ? rehydrateEntry(result.rows[0]) : null;
  }

  async findByCompetitionAndTeam(
    competitionId: CompetitionId,
    teamId: TeamId,
  ): Promise<CompetitionEntry | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, organization_id, competition_id, team_id, status, created_at, creation_key
       FROM competition_entries WHERE competition_id = $1 AND team_id = $2`,
      [competitionId, teamId],
    );
    return result.rows[0] ? rehydrateEntry(result.rows[0]) : null;
  }

  async findByCreationKey(creationKey: string): Promise<CompetitionEntry | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, organization_id, competition_id, team_id, status, created_at, creation_key
       FROM competition_entries WHERE creation_key = $1`,
      [creationKey],
    );
    return result.rows[0] ? rehydrateEntry(result.rows[0]) : null;
  }

  async save(entry: CompetitionEntry): Promise<CompetitionEntry> {
    const result = await getPgExecutor(this.pool).query(
      `INSERT INTO competition_entries (
         id, organization_id, competition_id, team_id, status, created_at, creation_key
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (competition_id, team_id) DO UPDATE
       SET status = CASE
         WHEN competition_entries.status = 'pending' AND EXCLUDED.status = 'approved'
         THEN 'approved'
         ELSE competition_entries.status
       END
       RETURNING id, organization_id, competition_id, team_id, status, created_at, creation_key`,
      [
        entry.id,
        entry.organizationId,
        entry.competitionId,
        entry.teamId,
        entry.status,
        entry.createdAt.toISOString(),
        entry.creationKey,
      ],
    );
    return rehydrateEntry(result.rows[0]);
  }

  async listByCompetition(organizationId: OrganizationId, competitionId: CompetitionId) {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id, organization_id, competition_id, team_id, status, created_at, creation_key
       FROM competition_entries
       WHERE organization_id = $1 AND competition_id = $2
       ORDER BY created_at ASC`,
      [organizationId, competitionId],
    );
    return result.rows.map(rehydrateEntry);
  }

  async remove(organizationId: OrganizationId, entryId: string): Promise<boolean> {
    const result = await getPgExecutor(this.pool).query(
      `DELETE FROM competition_entries WHERE organization_id = $1 AND id = $2`,
      [organizationId, entryId],
    );
    return (result.rowCount ?? 0) > 0;
  }
}

function rehydrateEntry(row: {
  id: string;
  organization_id: string;
  competition_id: string;
  team_id: string;
  status: string;
  created_at: Date | string;
  creation_key: string | null;
}): CompetitionEntry {
  return {
    id: row.id,
    organizationId: asOrganizationId(row.organization_id),
    competitionId: asCompetitionId(row.competition_id),
    teamId: asTeamId(row.team_id),
    status: row.status as CompetitionEntryStatus,
    createdAt: new Date(row.created_at),
    creationKey: row.creation_key,
  };
}
