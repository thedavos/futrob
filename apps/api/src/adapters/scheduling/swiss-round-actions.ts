import type { SwissRoundAction, SwissRoundActionLogPort } from "@futrob/scheduling";
import {
  asActorId,
  asCompetitionId,
  asOrganizationId,
  asTeamId,
  type CompetitionId,
  type OrganizationId,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { z } from "zod";
import { pgTimestampSchema } from "@/adapters/persistence/pg-scalar.ts";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

const actionRowSchema = z.object({
  organization_id: z.string(),
  competition_id: z.string(),
  fixture_plan_id: z.string(),
  kind: z.enum(["withdraw", "close_round"]),
  team_id: z.string().nullable(),
  round_number: z.coerce.number().nullable(),
  actor_id: z.string(),
  reason: z.string(),
  request_id: z.string(),
  occurred_at: pgTimestampSchema,
});

function toAction(parsed: z.infer<typeof actionRowSchema>): SwissRoundAction {
  const common = {
    organizationId: asOrganizationId(parsed.organization_id),
    competitionId: asCompetitionId(parsed.competition_id),
    fixturePlanId: parsed.fixture_plan_id,
    actorId: asActorId(parsed.actor_id),
    reason: parsed.reason,
    requestId: parsed.request_id,
    occurredAt: parsed.occurred_at,
  };
  if (parsed.kind === "withdraw") {
    return { ...common, kind: "withdraw", teamId: asTeamId(parsed.team_id ?? "") };
  }
  return { ...common, kind: "close_round", roundNumber: parsed.round_number ?? 0 };
}

export class InMemorySwissRoundActionLog implements SwissRoundActionLogPort {
  readonly rows: SwissRoundAction[] = [];

  async findByRequestId(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    requestId: string,
  ): Promise<SwissRoundAction | null> {
    return (
      this.rows.find(
        (row) =>
          row.organizationId === organizationId &&
          row.competitionId === competitionId &&
          row.requestId === requestId,
      ) ?? null
    );
  }

  async append(action: SwissRoundAction): Promise<void> {
    this.rows.push(action);
  }
}

export class PostgresSwissRoundActionLog implements SwissRoundActionLogPort {
  constructor(private readonly pool: Pool) {}

  async findByRequestId(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    requestId: string,
  ): Promise<SwissRoundAction | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT organization_id, competition_id, fixture_plan_id, kind, team_id, round_number,
              actor_id, reason, request_id, occurred_at
       FROM swiss_round_actions
       WHERE organization_id = $1 AND competition_id = $2 AND request_id = $3`,
      [organizationId, competitionId, requestId],
    );
    return result.rows[0] ? toAction(actionRowSchema.parse(result.rows[0])) : null;
  }

  async append(action: SwissRoundAction): Promise<void> {
    await getPgExecutor(this.pool).query(
      `INSERT INTO swiss_round_actions (
         id, organization_id, competition_id, fixture_plan_id, kind, team_id, round_number,
         actor_id, reason, request_id, occurred_at
       ) VALUES (gen_random_uuid()::text, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        action.organizationId,
        action.competitionId,
        action.fixturePlanId,
        action.kind,
        action.kind === "withdraw" ? action.teamId : null,
        action.kind === "close_round" ? action.roundNumber : null,
        action.actorId,
        action.reason,
        action.requestId,
        action.occurredAt.toISOString(),
      ],
    );
  }
}
