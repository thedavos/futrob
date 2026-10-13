import type {
  ScheduleChangeAction,
  ScheduleChangeRequest,
  ScheduleChangeResolution,
} from "@futrob/scheduling";
import { asActorId, asTeamId } from "@futrob/shared-kernel";
import { z } from "zod";
import { pgTextSchema, pgTimestampSchema } from "@/adapters/persistence/pg-scalar.ts";
import type { PgExecutor } from "@/adapters/persistence/pg-transaction.ts";

const actionRowSchema = z.object({
  id: pgTextSchema,
  kind: z.enum(["schedule_change_expired", "schedule_change_resolved"]),
  authority: z.enum(["system", "organizer"]),
  actor_id: pgTextSchema,
  proposal_id: pgTextSchema,
  from_version: z.coerce.number().int().positive(),
  to_version: z.coerce.number().int().positive(),
  response_deadline: pgTimestampSchema,
  processed_at: pgTimestampSchema,
  outcome: z.enum(["schedule_set", "schedule_kept", "walkover_intended"]).nullable(),
  reason: pgTextSchema.nullable(),
  proposed_start_at: pgTimestampSchema.nullable(),
  winning_team_id: pgTextSchema.nullable(),
});

export async function readScheduleChangeActions(
  executor: PgExecutor,
  organizationId: string,
  requestId: string,
): Promise<readonly ScheduleChangeAction[]> {
  const rows = await executor.query(
    `SELECT id, kind, authority, actor_id, proposal_id, from_version, to_version, response_deadline, processed_at, outcome, reason, proposed_start_at, winning_team_id FROM schedule_change_actions WHERE organization_id = $1 AND request_id = $2 ORDER BY to_version`,
    [organizationId, requestId],
  );
  return rows.rows.map((value) => {
    const row = actionRowSchema.parse(value);
    let resolution: ScheduleChangeResolution | null = null;
    if (row.outcome !== null) {
      if (row.reason === null) throw new TypeError("Resolution requires reason");
      if (row.outcome === "schedule_set") {
        if (row.proposed_start_at === null)
          throw new TypeError("Schedule resolution requires start");
        resolution = {
          outcome: row.outcome,
          reason: row.reason,
          proposedStartAt: row.proposed_start_at,
        };
      } else if (row.outcome === "walkover_intended") {
        if (row.winning_team_id === null) throw new TypeError("Walkover intention requires winner");
        resolution = {
          outcome: row.outcome,
          reason: row.reason,
          winningTeamId: asTeamId(row.winning_team_id),
        };
      } else resolution = { outcome: row.outcome, reason: row.reason };
    }
    return {
      id: row.id,
      kind: row.kind,
      authority: row.authority,
      actorId: asActorId(row.actor_id),
      proposalId: row.proposal_id,
      fromVersion: row.from_version,
      toVersion: row.to_version,
      responseDeadline: row.response_deadline,
      processedAt: row.processed_at,
      resolution,
    };
  });
}

export async function insertScheduleChangeAction(
  executor: PgExecutor,
  request: ScheduleChangeRequest,
  action: ScheduleChangeAction,
): Promise<void> {
  const resolution = action.resolution;
  await executor.query(
    `INSERT INTO schedule_change_actions (id, request_id, organization_id, proposal_id, kind, authority, actor_id, from_version, to_version, response_deadline, processed_at, outcome, reason, proposed_start_at, winning_team_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
    [
      action.id,
      request.id,
      request.organizationId,
      action.proposalId,
      action.kind,
      action.authority,
      action.actorId,
      action.fromVersion,
      action.toVersion,
      action.responseDeadline.toISOString(),
      action.processedAt.toISOString(),
      resolution?.outcome ?? null,
      resolution?.reason ?? null,
      resolution?.outcome === "schedule_set" ? resolution.proposedStartAt.toISOString() : null,
      resolution?.outcome === "walkover_intended" ? resolution.winningTeamId : null,
    ],
  );
}
