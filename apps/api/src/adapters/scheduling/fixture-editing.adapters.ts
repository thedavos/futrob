import type {
  FixtureAuditEntry,
  FixtureAuditPort,
  FixtureEncounterEditGuardPort,
  OfficialMatchRepository,
} from "@futrob/scheduling";
import type { Pool } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

export class InMemoryFixtureAuditPort implements FixtureAuditPort {
  readonly rows: FixtureAuditEntry[] = [];

  async findByRequestId(
    organizationId: FixtureAuditEntry["organizationId"],
    encounterId: FixtureAuditEntry["encounterId"],
    requestId: string,
  ): Promise<FixtureAuditEntry | null> {
    return (
      this.rows.find(
        (row) =>
          row.organizationId === organizationId &&
          row.encounterId === encounterId &&
          row.requestId === requestId,
      ) ?? null
    );
  }

  async append(entry: FixtureAuditEntry): Promise<void> {
    if (
      this.rows.some(
        (row) =>
          row.organizationId === entry.organizationId &&
          row.requestId === entry.requestId &&
          row.encounterId === entry.encounterId,
      )
    ) {
      return;
    }
    this.rows.push(entry);
  }
}

export class PostgresFixtureAuditPort implements FixtureAuditPort {
  constructor(private readonly pool: Pool) {}

  async findByRequestId(
    organizationId: FixtureAuditEntry["organizationId"],
    encounterId: FixtureAuditEntry["encounterId"],
    requestId: string,
  ): Promise<FixtureAuditEntry | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT organization_id, competition_id, fixture_plan_id, encounter_id, actor_id,
              request_id, reason, occurred_at, before_state, after_state
       FROM fixture_encounter_audit
       WHERE organization_id = $1 AND encounter_id = $2 AND request_id = $3`,
      [organizationId, encounterId, requestId],
    );
    const row = result.rows[0] as AuditRow | undefined;
    return row
      ? {
          organizationId: row.organization_id as FixtureAuditEntry["organizationId"],
          competitionId: row.competition_id as FixtureAuditEntry["competitionId"],
          fixturePlanId: row.fixture_plan_id,
          encounterId: row.encounter_id as FixtureAuditEntry["encounterId"],
          actorId: row.actor_id as FixtureAuditEntry["actorId"],
          requestId: row.request_id,
          reason: row.reason,
          occurredAt: new Date(row.occurred_at),
          before: fixtureEncounter(row.before_state),
          after: fixtureEncounter(row.after_state),
        }
      : null;
  }

  async append(entry: FixtureAuditEntry): Promise<void> {
    await getPgExecutor(this.pool).query(
      `INSERT INTO fixture_encounter_audit (
         organization_id, competition_id, fixture_plan_id, encounter_id, actor_id,
         request_id, reason, occurred_at, before_state, after_state
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb)
       ON CONFLICT (organization_id, request_id, encounter_id) DO NOTHING`,
      [
        entry.organizationId,
        entry.competitionId,
        entry.fixturePlanId,
        entry.encounterId,
        entry.actorId,
        entry.requestId,
        entry.reason,
        entry.occurredAt.toISOString(),
        JSON.stringify(entry.before),
        JSON.stringify(entry.after),
      ],
    );
  }
}

interface AuditRow {
  readonly organization_id: string;
  readonly competition_id: string;
  readonly fixture_plan_id: string;
  readonly encounter_id: string;
  readonly actor_id: string;
  readonly request_id: string;
  readonly reason: string;
  readonly occurred_at: string | Date;
  readonly before_state: FixtureAuditEntry["before"] | string;
  readonly after_state: FixtureAuditEntry["after"] | string;
}

function fixtureEncounter(
  value: FixtureAuditEntry["before"] | string,
): FixtureAuditEntry["before"] {
  const parsed = typeof value === "string" ? JSON.parse(value) : value;
  return { ...parsed, scheduledStartAt: new Date(parsed.scheduledStartAt) };
}

export class OfficialMatchFixtureEditGuard implements FixtureEncounterEditGuardPort {
  constructor(private readonly matches: OfficialMatchRepository) {}

  async canEdit(input: Parameters<FixtureEncounterEditGuardPort["canEdit"]>[0]): Promise<boolean> {
    const matches = await this.matches.listByEncounter(input.encounterId);
    return matches.every((match) => match.status !== "completed" && match.status !== "voided");
  }
}
