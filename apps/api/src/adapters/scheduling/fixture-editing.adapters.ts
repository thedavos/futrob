import {
  asFixtureRoundId,
  asFixtureStageId,
  type FixtureAuditEntry,
  type FixtureAuditPort,
  type FixtureEncounter,
  type FixtureEncounterEditGuardPort,
  type FixtureOccupancyGuardPort,
  type FixtureParticipantSlot,
  type FixtureSeries,
  type OfficialMatchRepository,
} from "@futrob/scheduling";
import type { OfficialMatchSelectionRepository, OfficialResultRepository } from "@futrob/results";
import { fixtureEncounterSchema, type FixtureEncounterDto } from "@futrob/api-contracts";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOfficialMatchSlotId,
  asOrganizationId,
  asTeamId,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { z } from "zod";
import { parseJsonColumn, type PgJsonInput } from "@/adapters/persistence/parse-json-column.ts";
import { pgTextSchema, pgTimestampSchema } from "@/adapters/persistence/pg-scalar.ts";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

const fixtureAuditRowSchema = z.object({
  organization_id: pgTextSchema,
  competition_id: pgTextSchema,
  fixture_plan_id: pgTextSchema,
  encounter_id: pgTextSchema,
  actor_id: pgTextSchema,
  request_id: pgTextSchema,
  reason: pgTextSchema,
  occurred_at: pgTimestampSchema,
  before_state: z.custom<PgJsonInput>((value) => value !== undefined),
  after_state: z.custom<PgJsonInput>((value) => value !== undefined),
});

export class InMemoryFixtureAuditPort implements FixtureAuditPort {
  readonly rows: FixtureAuditEntry[] = [];

  async findByRequestId(
    organizationId: FixtureAuditEntry["organizationId"],
    competitionId: FixtureAuditEntry["competitionId"],
    requestId: string,
  ): Promise<FixtureAuditEntry | null> {
    return (
      this.rows.find(
        (row) =>
          row.organizationId === organizationId &&
          row.competitionId === competitionId &&
          row.requestId === requestId,
      ) ?? null
    );
  }

  async append(entry: FixtureAuditEntry): Promise<void> {
    if (
      this.rows.some(
        (row) =>
          row.organizationId === entry.organizationId &&
          row.competitionId === entry.competitionId &&
          row.requestId === entry.requestId,
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
    competitionId: FixtureAuditEntry["competitionId"],
    requestId: string,
  ): Promise<FixtureAuditEntry | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT organization_id, competition_id, fixture_plan_id, encounter_id, actor_id,
              request_id, reason, occurred_at, before_state, after_state
       FROM fixture_encounter_audit
       WHERE organization_id = $1 AND competition_id = $2 AND request_id = $3`,
      [organizationId, competitionId, requestId],
    );
    const row = result.rows[0];
    if (!row) return null;
    const parsed = fixtureAuditRowSchema.parse(row);
    return {
      organizationId: asOrganizationId(parsed.organization_id),
      competitionId: asCompetitionId(parsed.competition_id),
      fixturePlanId: parsed.fixture_plan_id,
      encounterId: asEncounterId(parsed.encounter_id),
      actorId: asActorId(parsed.actor_id),
      requestId: parsed.request_id,
      reason: parsed.reason,
      occurredAt: parsed.occurred_at,
      before: fixtureEncounter(parsed.before_state),
      after: fixtureEncounter(parsed.after_state),
    };
  }

  async append(entry: FixtureAuditEntry): Promise<void> {
    await getPgExecutor(this.pool).query(
      `INSERT INTO fixture_encounter_audit (
         organization_id, competition_id, fixture_plan_id, encounter_id, actor_id,
         request_id, reason, occurred_at, before_state, after_state
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb)
       ON CONFLICT (organization_id, competition_id, request_id) DO NOTHING`,
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

type ParsedFixtureEncounter = FixtureEncounterDto;

function fixtureParticipantSlot(slot: ParsedFixtureEncounter["home"]): FixtureParticipantSlot {
  switch (slot.kind) {
    case "team":
      return { kind: "team", teamId: asTeamId(slot.teamId) };
    case "bye":
      return { kind: "bye" };
    case "winner":
      return { kind: "winner", encounterId: asEncounterId(slot.encounterId) };
    case "group-rank":
      return {
        kind: "group-rank",
        stageId: asFixtureStageId(slot.stageId),
        groupId: slot.groupId,
        rank: slot.rank,
      };
    case "stage-rank":
      return {
        kind: "stage-rank",
        stageId: asFixtureStageId(slot.stageId),
        rank: slot.rank,
      };
  }
}

function fixtureSeries(series: NonNullable<ParsedFixtureEncounter["series"]>): FixtureSeries {
  return {
    id: series.id,
    resolutionMode: series.resolutionMode,
    officialMatches: series.officialMatches.map((match) => ({
      id: asOfficialMatchSlotId(match.id),
      slot: match.slot,
    })),
  };
}

function fixtureEncounter(value: PgJsonInput): FixtureEncounter {
  const parsed = parseJsonColumn(fixtureEncounterSchema, value);
  const encounter: FixtureEncounter = {
    id: asEncounterId(parsed.id),
    stageId: asFixtureStageId(parsed.stageId),
    roundId: asFixtureRoundId(parsed.roundId),
    order: parsed.order,
    home: fixtureParticipantSlot(parsed.home),
    away: fixtureParticipantSlot(parsed.away),
    scheduledStartAt: new Date(parsed.scheduledStartAt),
    officialMatchCount: parsed.officialMatchCount,
    series: parsed.series ? fixtureSeries(parsed.series) : null,
  };
  if (parsed.groupId) {
    return { ...encounter, groupId: parsed.groupId };
  }
  return encounter;
}

export class OfficialResultFixtureEditGuard implements FixtureEncounterEditGuardPort {
  constructor(
    private readonly matches: OfficialMatchRepository,
    private readonly results: Pick<OfficialResultRepository, "findApprovedByEncounter">,
    private readonly selections: Pick<OfficialMatchSelectionRepository, "findLatestByEncounter">,
  ) {}

  async canEdit(input: Parameters<FixtureEncounterEditGuardPort["canEdit"]>[0]): Promise<boolean> {
    const [matches, approvedResult, selection] = await Promise.all([
      this.matches.listByEncounter(input.encounterId),
      this.results.findApprovedByEncounter(input.encounterId),
      this.selections.findLatestByEncounter(input.encounterId),
    ]);
    if (approvedResult) return false;
    if (selection && selection.status !== "voided") return false;
    return matches.every(
      (match) =>
        match.status !== "completed" &&
        match.status !== "voided" &&
        match.status !== "selected" &&
        match.status !== "awaiting_selection",
    );
  }
}

export class OfficialResultOccupancyGuard implements FixtureOccupancyGuardPort {
  constructor(
    private readonly results: Pick<OfficialResultRepository, "findApprovedByEncounter">,
  ) {}

  async hasApprovedOfficialResult(
    encounterIds: Parameters<FixtureOccupancyGuardPort["hasApprovedOfficialResult"]>[0],
  ): Promise<boolean> {
    const approved = await Promise.all(
      encounterIds.map((encounterId) => this.results.findApprovedByEncounter(encounterId)),
    );
    return approved.some((result) => result !== null);
  }
}
