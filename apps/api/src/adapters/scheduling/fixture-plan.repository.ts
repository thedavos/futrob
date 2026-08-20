import {
  asFixtureStageId,
  asFixtureRoundId,
  replaceEncounter,
  type FixtureEncounter,
  type FixtureParticipantSlot,
  type FixturePlan,
  type FixturePlanRepository,
  type FixtureStage,
} from "@futrob/scheduling";
import { fixtureParticipantSlotSchema } from "@futrob/api-contracts";
import {
  asCompetitionId,
  asEncounterId,
  asOfficialMatchSlotId,
  asOrganizationId,
  asTeamId,
  type CompetitionId,
  type OrganizationId,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { z } from "zod";
import { parseJsonColumn, type PgJsonInput } from "@/adapters/persistence/parse-json-column.ts";
import { pgTextSchema, pgTimestampSchema } from "@/adapters/persistence/pg-scalar.ts";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

export class InMemoryFixturePlanRepository implements FixturePlanRepository {
  readonly rows = new Map<string, FixturePlan>();
  private readonly generationVersions = new Map<string, string>();

  async findByGenerationVersion(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    generationVersion: number,
  ): Promise<FixturePlan | null> {
    const id = this.generationVersions.get(
      versionKey(organizationId, competitionId, generationVersion),
    );
    return id ? (this.rows.get(id) ?? null) : null;
  }

  async findById(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    fixturePlanId: string,
  ): Promise<FixturePlan | null> {
    const plan = this.rows.get(fixturePlanId) ?? null;
    return plan?.organizationId === organizationId && plan.competitionId === competitionId
      ? plan
      : null;
  }

  async listActive(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
  ): Promise<FixturePlan[]> {
    return [...this.rows.values()].filter(
      (plan) =>
        plan.organizationId === organizationId &&
        plan.competitionId === competitionId &&
        plan.status === "active",
    );
  }

  async containsEncounter(
    input: Parameters<FixturePlanRepository["containsEncounter"]>[0],
  ): Promise<boolean> {
    for (const plan of this.rows.values()) {
      if (
        plan.organizationId !== input.organizationId ||
        plan.competitionId !== input.competitionId
      ) {
        continue;
      }
      if (
        plan.stages.some((stage) =>
          stage.rounds.some((round) =>
            round.encounters.some((encounter) => encounter.id === input.encounterId),
          ),
        )
      ) {
        return true;
      }
    }
    return false;
  }

  async save(
    plan: FixturePlan,
  ): Promise<{ readonly plan: FixturePlan; readonly created: boolean }> {
    const key = versionKey(plan.organizationId, plan.competitionId, plan.generationVersion);
    const existingId = this.generationVersions.get(key);
    if (existingId) {
      const existing = this.rows.get(existingId);
      if (!existing) throw new Error("Fixture generation version mapped to missing plan");
      return { plan: existing, created: false };
    }
    this.rows.set(plan.id, plan);
    this.generationVersions.set(key, plan.id);
    return { plan, created: true };
  }

  async updateEncounter(
    input: Parameters<FixturePlanRepository["updateEncounter"]>[0],
  ): Promise<FixturePlan | null> {
    const existing = await this.findById(
      input.organizationId,
      input.competitionId,
      input.fixturePlanId,
    );
    if (!existing || existing.revision !== input.revision) return null;
    const updated = {
      ...replaceEncounter(existing, input.encounter),
      revision: existing.revision + 1,
    };
    this.rows.set(updated.id, updated);
    return updated;
  }

  async markSuperseded(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    exceptPlanId: string,
  ): Promise<void> {
    for (const [id, plan] of this.rows) {
      if (
        plan.organizationId !== organizationId ||
        plan.competitionId !== competitionId ||
        plan.id === exceptPlanId ||
        plan.status !== "active"
      ) {
        continue;
      }
      this.rows.set(id, { ...plan, status: "superseded" });
    }
  }
}

export class PostgresFixturePlanRepository implements FixturePlanRepository {
  constructor(private readonly pool: Pool) {}

  async findByGenerationVersion(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    generationVersion: number,
  ): Promise<FixturePlan | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id FROM fixture_plans
       WHERE organization_id = $1 AND competition_id = $2 AND generation_version = $3`,
      [organizationId, competitionId, generationVersion],
    );
    const id = result.rows[0] ? idRowSchema.parse(result.rows[0]).id : undefined;
    return id ? this.findById(organizationId, competitionId, id) : null;
  }

  async findById(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    fixturePlanId: string,
  ): Promise<FixturePlan | null> {
    const executor = getPgExecutor(this.pool);
    const planResult = await executor.query(
      `SELECT id, revision, status, generation_key, generation_fingerprint, organization_id,
              competition_id, rules_version, generation_version, format, time_zone,
              home_and_away, seed
       FROM fixture_plans
       WHERE id = $1 AND organization_id = $2 AND competition_id = $3`,
      [fixturePlanId, organizationId, competitionId],
    );
    const planRow = planResult.rows[0] ? planRowSchema.parse(planResult.rows[0]) : undefined;
    if (!planRow) return null;
    const [stageResult, roundResult, encounterResult] = await Promise.all([
      executor.query(
        `SELECT id, kind, stage_order FROM fixture_stages
         WHERE fixture_plan_id = $1 ORDER BY stage_order`,
        [fixturePlanId],
      ),
      executor.query(
        `SELECT id, stage_id, round_number, scheduled_start_at FROM fixture_rounds
         WHERE fixture_plan_id = $1 ORDER BY stage_id, round_number`,
        [fixturePlanId],
      ),
      executor.query(
        `SELECT encounter.id, encounter.stage_id, encounter.round_id,
                encounter.encounter_order, encounter.group_id, encounter.home_slot,
                encounter.away_slot, encounter.scheduled_start_at,
                encounter.official_match_count, series.id AS series_id,
                series.resolution_mode
         FROM fixture_encounters encounter
         LEFT JOIN encounter_series series ON series.encounter_id = encounter.id
         WHERE encounter.fixture_plan_id = $1
         ORDER BY encounter.round_id, encounter.encounter_order`,
        [fixturePlanId],
      ),
    ]);
    return rehydratePlan(planRow, stageResult.rows, roundResult.rows, encounterResult.rows);
  }

  async listActive(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
  ): Promise<FixturePlan[]> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id FROM fixture_plans
       WHERE organization_id = $1 AND competition_id = $2 AND status = 'active'
       ORDER BY generation_version`,
      [organizationId, competitionId],
    );
    const plans = await Promise.all(
      result.rows.map((row) =>
        this.findById(organizationId, competitionId, idRowSchema.parse(row).id),
      ),
    );
    return plans.filter((plan): plan is FixturePlan => plan !== null);
  }

  async containsEncounter(
    input: Parameters<FixturePlanRepository["containsEncounter"]>[0],
  ): Promise<boolean> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT 1 FROM fixture_encounters
       WHERE id = $1 AND organization_id = $2 AND competition_id = $3`,
      [input.encounterId, input.organizationId, input.competitionId],
    );
    return Boolean(result.rows[0]);
  }

  async save(
    plan: FixturePlan,
  ): Promise<{ readonly plan: FixturePlan; readonly created: boolean }> {
    const executor = getPgExecutor(this.pool);
    const inserted = await executor.query(
      `INSERT INTO fixture_plans (
         id, revision, status, generation_key, generation_fingerprint, organization_id,
         competition_id, rules_version, generation_version, format, time_zone, home_and_away, seed
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
       ON CONFLICT (organization_id, competition_id, generation_version) DO NOTHING
       RETURNING id`,
      [
        plan.id,
        plan.revision,
        plan.status,
        plan.generationKey,
        plan.generationFingerprint,
        plan.organizationId,
        plan.competitionId,
        plan.rulesVersion,
        plan.generationVersion,
        plan.format,
        plan.timeZone,
        plan.homeAndAway,
        JSON.stringify(plan.seed),
      ],
    );
    if (!inserted.rows[0]) {
      const existing = await this.findByGenerationVersion(
        plan.organizationId,
        plan.competitionId,
        plan.generationVersion,
      );
      if (!existing)
        throw new Error("Fixture generation version conflict without a persisted plan");
      return { plan: existing, created: false };
    }
    for (const stage of plan.stages) {
      await executor.query(
        `INSERT INTO fixture_stages (id, fixture_plan_id, organization_id, competition_id, kind, stage_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [stage.id, plan.id, plan.organizationId, plan.competitionId, stage.kind, stage.order],
      );
      for (const round of stage.rounds) {
        await executor.query(
          `INSERT INTO fixture_rounds (
             id, fixture_plan_id, stage_id, organization_id, competition_id, round_number,
             scheduled_start_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            round.id,
            plan.id,
            stage.id,
            plan.organizationId,
            plan.competitionId,
            round.number,
            round.scheduledStartAt.toISOString(),
          ],
        );
        for (const encounter of round.encounters) {
          await insertEncounter(executor, plan, encounter);
        }
      }
    }
    return { plan, created: true };
  }

  async updateEncounter(
    input: Parameters<FixturePlanRepository["updateEncounter"]>[0],
  ): Promise<FixturePlan | null> {
    const executor = getPgExecutor(this.pool);
    const bumped = await executor.query(
      `UPDATE fixture_plans SET revision = revision + 1, updated_at = now()
       WHERE id = $1 AND organization_id = $2 AND competition_id = $3 AND revision = $4
       RETURNING revision`,
      [input.fixturePlanId, input.organizationId, input.competitionId, input.revision],
    );
    if (!bumped.rows[0]) return null;
    await executor.query(
      `UPDATE fixture_encounters SET home_slot = $1::jsonb, away_slot = $2::jsonb,
              scheduled_start_at = $3
       WHERE id = $4 AND fixture_plan_id = $5 AND organization_id = $6 AND competition_id = $7`,
      [
        JSON.stringify(input.encounter.home),
        JSON.stringify(input.encounter.away),
        input.encounter.scheduledStartAt.toISOString(),
        input.encounter.id,
        input.fixturePlanId,
        input.organizationId,
        input.competitionId,
      ],
    );
    return this.findById(input.organizationId, input.competitionId, input.fixturePlanId);
  }

  async markSuperseded(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    exceptPlanId: string,
  ): Promise<void> {
    await getPgExecutor(this.pool).query(
      `UPDATE fixture_plans SET status = 'superseded', updated_at = now()
       WHERE organization_id = $1 AND competition_id = $2 AND id <> $3 AND status = 'active'`,
      [organizationId, competitionId, exceptPlanId],
    );
  }
}

type Executor = ReturnType<typeof getPgExecutor>;

async function insertEncounter(
  executor: Executor,
  plan: FixturePlan,
  encounter: FixtureEncounter,
): Promise<void> {
  await executor.query(
    `INSERT INTO fixture_encounters (
       id, fixture_plan_id, stage_id, round_id, organization_id, competition_id,
       encounter_order, group_id, home_slot, away_slot, scheduled_start_at, official_match_count
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11, $12)`,
    [
      encounter.id,
      plan.id,
      encounter.stageId,
      encounter.roundId,
      plan.organizationId,
      plan.competitionId,
      encounter.order,
      encounter.groupId ?? null,
      JSON.stringify(encounter.home),
      JSON.stringify(encounter.away),
      encounter.scheduledStartAt.toISOString(),
      encounter.officialMatchCount,
    ],
  );
  if (!encounter.series) return;
  await executor.query(
    `INSERT INTO encounter_series (
       id, encounter_id, fixture_plan_id, organization_id, competition_id,
       resolution_mode, official_match_count
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      encounter.series.id,
      encounter.id,
      plan.id,
      plan.organizationId,
      plan.competitionId,
      encounter.series.resolutionMode,
      encounter.series.officialMatches.length,
    ],
  );
}

function rehydratePlan(
  row: PlanRow,
  stageRows: readonly unknown[],
  roundRows: readonly unknown[],
  encounterRows: readonly unknown[],
): FixturePlan {
  const rounds = roundRows.map((roundRow) => roundRowSchema.parse(roundRow));
  const encounters = encounterRows.map((encounterRow) => encounterRowSchema.parse(encounterRow));
  const stages = stageRows.map((stageRow) => {
    const stage = stageRowSchema.parse(stageRow);
    const stageId = asFixtureStageId(stage.id);
    return {
      id: stageId,
      kind: stage.kind,
      order: stage.stage_order,
      rounds: rounds
        .filter((round) => round.stage_id === stage.id)
        .map((round) => ({
          id: asFixtureRoundId(round.id),
          stageId,
          number: round.round_number,
          scheduledStartAt: round.scheduled_start_at,
          encounters: encounters
            .filter((encounter) => encounter.round_id === round.id)
            .map(rehydrateEncounter),
        })),
    } satisfies FixtureStage;
  });
  return {
    id: row.id,
    revision: row.revision,
    status: row.status,
    generationKey: row.generation_key,
    generationFingerprint: row.generation_fingerprint,
    organizationId: asOrganizationId(row.organization_id),
    competitionId: asCompetitionId(row.competition_id),
    rulesVersion: row.rules_version,
    generationVersion: row.generation_version,
    format: row.format,
    timeZone: row.time_zone,
    homeAndAway: row.home_and_away,
    seed: seedArraySchema.parse(parseJsonColumn(z.unknown(), row.seed)).map(asTeamId),
    stages,
  };
}

function rehydrateEncounter(row: EncounterRow): FixtureEncounter {
  const id = asEncounterId(row.id);
  const officialMatchCount = officialMatchCountSchema.parse(row.official_match_count);
  const slots: readonly (1 | 2)[] = officialMatchCount === 1 ? [1] : [1, 2];
  const encounter: FixtureEncounter = {
    id,
    stageId: asFixtureStageId(row.stage_id),
    roundId: asFixtureRoundId(row.round_id),
    order: row.encounter_order,
    home: parseParticipantSlot(row.home_slot),
    away: parseParticipantSlot(row.away_slot),
    scheduledStartAt: row.scheduled_start_at,
    officialMatchCount,
    series:
      row.series_id && row.resolution_mode
        ? {
            id: row.series_id,
            resolutionMode: row.resolution_mode,
            officialMatches: slots.map((matchSlot) => ({
              id: asOfficialMatchSlotId(`${id}:official-match:${matchSlot}`),
              slot: matchSlot,
            })),
          }
        : null,
  };
  if (row.group_id) {
    return { ...encounter, groupId: row.group_id };
  }
  return encounter;
}

function parseParticipantSlot(value: PgJsonInput): FixtureParticipantSlot {
  const parsed = parseJsonColumn(fixtureParticipantSlotSchema, value);
  switch (parsed.kind) {
    case "team":
      return { kind: "team", teamId: asTeamId(parsed.teamId) };
    case "bye":
      return { kind: "bye" };
    case "winner":
      return { kind: "winner", encounterId: asEncounterId(parsed.encounterId) };
    case "group-rank":
      return {
        kind: "group-rank",
        stageId: asFixtureStageId(parsed.stageId),
        groupId: parsed.groupId,
        rank: parsed.rank,
      };
    case "stage-rank":
      return {
        kind: "stage-rank",
        stageId: asFixtureStageId(parsed.stageId),
        rank: parsed.rank,
      };
    default: {
      const _exhaustive: never = parsed;
      throw new Error(`Invalid fixture participant slot: ${String(_exhaustive)}`);
    }
  }
}

const officialMatchCountSchema = z.union([z.literal(1), z.literal(2)]);
const fixtureStageKindSchema = z.enum(["league", "groups", "knockout", "playoffs"]);
const resolutionModeSchema = z.enum(["independent_matches", "aggregate_score"]);
const fixturePlanStatusSchema = z.enum(["active", "superseded"]);
const fixturePlanFormatSchema = z.enum([
  "league",
  "knockout",
  "groups-knockout",
  "league-playoffs",
]);
const seedArraySchema = z.array(z.string());
const idRowSchema = z.object({ id: pgTextSchema });

const planRowSchema = z.object({
  id: z.string(),
  revision: z.coerce.number(),
  status: fixturePlanStatusSchema,
  generation_key: z.string(),
  generation_fingerprint: z.string(),
  organization_id: z.string(),
  competition_id: z.string(),
  rules_version: z.coerce.number(),
  generation_version: z.coerce.number(),
  format: fixturePlanFormatSchema,
  time_zone: z.string(),
  home_and_away: z.coerce.boolean(),
  seed: z.unknown(),
});

const stageRowSchema = z.object({
  id: z.string(),
  kind: fixtureStageKindSchema,
  stage_order: z.coerce.number(),
});

const roundRowSchema = z.object({
  id: z.string(),
  stage_id: z.string(),
  round_number: z.coerce.number(),
  scheduled_start_at: pgTimestampSchema,
});

const encounterRowSchema = z.object({
  id: z.string(),
  stage_id: z.string(),
  round_id: z.string(),
  encounter_order: z.coerce.number(),
  group_id: z.string().nullable(),
  home_slot: z.unknown(),
  away_slot: z.unknown(),
  scheduled_start_at: pgTimestampSchema,
  official_match_count: z.coerce.number(),
  series_id: z.string().nullable(),
  resolution_mode: resolutionModeSchema.nullable(),
});

type PlanRow = z.infer<typeof planRowSchema>;
type EncounterRow = z.infer<typeof encounterRowSchema>;

function versionKey(
  organizationId: string,
  competitionId: string,
  generationVersion: number,
): string {
  return `${organizationId}\u0000${competitionId}\u0000${generationVersion}`;
}
