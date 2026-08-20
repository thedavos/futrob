import type { EncounterScheduleRepository, EncounterScheduleSnapshot } from "@futrob/scheduling";
import {
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  type EncounterId,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { z } from "zod";
import { pgTextSchema, pgTimestampSchema } from "@/adapters/persistence/pg-scalar.ts";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

const encounterScheduleRowSchema = z.object({
  encounter_id: pgTextSchema,
  organization_id: pgTextSchema,
  competition_id: pgTextSchema,
  home_team_id: pgTextSchema,
  away_team_id: pgTextSchema,
  scheduled_start_at: pgTimestampSchema,
  official_match_count: z.coerce.number().pipe(z.union([z.literal(1), z.literal(2)])),
});

export class InMemoryEncounterScheduleRepository implements EncounterScheduleRepository {
  readonly rows = new Map<EncounterId, EncounterScheduleSnapshot>();

  async findById(encounterId: EncounterId): Promise<EncounterScheduleSnapshot | null> {
    return this.rows.get(encounterId) ?? null;
  }

  async upsert(snapshot: EncounterScheduleSnapshot): Promise<EncounterScheduleSnapshot | null> {
    const existing = this.rows.get(snapshot.encounterId);
    if (
      existing &&
      (existing.organizationId !== snapshot.organizationId ||
        existing.competitionId !== snapshot.competitionId)
    ) {
      return null;
    }
    this.rows.set(snapshot.encounterId, snapshot);
    return snapshot;
  }

  async deleteByEncounterIds(encounterIds: readonly EncounterId[]): Promise<void> {
    for (const encounterId of encounterIds) this.rows.delete(encounterId);
  }
}

export class PostgresEncounterScheduleRepository implements EncounterScheduleRepository {
  constructor(private readonly pool: Pool) {}

  async findById(encounterId: EncounterId): Promise<EncounterScheduleSnapshot | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT encounter_id, organization_id, competition_id, home_team_id, away_team_id,
              scheduled_start_at, official_match_count
       FROM encounter_schedule_snapshots
       WHERE encounter_id = $1`,
      [encounterId],
    );
    const row = result.rows[0];
    return row ? rehydrateEncounterScheduleSnapshot(encounterScheduleRowSchema.parse(row)) : null;
  }

  async upsert(snapshot: EncounterScheduleSnapshot): Promise<EncounterScheduleSnapshot | null> {
    const result = await getPgExecutor(this.pool).query(
      `INSERT INTO encounter_schedule_snapshots (
         encounter_id, organization_id, competition_id, home_team_id, away_team_id,
         scheduled_start_at, official_match_count
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (encounter_id) DO UPDATE SET
         home_team_id = EXCLUDED.home_team_id,
         away_team_id = EXCLUDED.away_team_id,
         scheduled_start_at = EXCLUDED.scheduled_start_at,
         official_match_count = EXCLUDED.official_match_count
       WHERE encounter_schedule_snapshots.organization_id = EXCLUDED.organization_id
         AND encounter_schedule_snapshots.competition_id = EXCLUDED.competition_id
       RETURNING encounter_id`,
      [
        snapshot.encounterId,
        snapshot.organizationId,
        snapshot.competitionId,
        snapshot.homeTeamId,
        snapshot.awayTeamId,
        snapshot.scheduledStartAt.toISOString(),
        snapshot.officialMatchCount,
      ],
    );
    return result.rows[0] ? snapshot : null;
  }

  async deleteByEncounterIds(encounterIds: readonly EncounterId[]): Promise<void> {
    if (encounterIds.length === 0) return;
    await getPgExecutor(this.pool).query(
      `DELETE FROM encounter_schedule_snapshots WHERE encounter_id = ANY($1::text[])`,
      [encounterIds],
    );
  }
}

function rehydrateEncounterScheduleSnapshot(
  row: z.infer<typeof encounterScheduleRowSchema>,
): EncounterScheduleSnapshot {
  return {
    encounterId: asEncounterId(row.encounter_id),
    organizationId: asOrganizationId(row.organization_id),
    competitionId: asCompetitionId(row.competition_id),
    homeTeamId: asTeamId(row.home_team_id),
    awayTeamId: asTeamId(row.away_team_id),
    scheduledStartAt: row.scheduled_start_at,
    officialMatchCount: row.official_match_count,
  };
}
