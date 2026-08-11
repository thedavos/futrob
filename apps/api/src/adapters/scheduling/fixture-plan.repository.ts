import { asFixtureStageId } from "@futrob/scheduling";
import type {
  EditableFixturePlanRepository,
  FixtureEncounter,
  FixtureParticipantSlot,
  FixturePlan,
  FixturePlanRepository,
  FixtureStage,
  EncounterScheduleRepository,
} from "@futrob/scheduling";
import {
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  type CompetitionId,
  type OrganizationId,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { getPgExecutor } from "@/adapters/persistence/pg-transaction.ts";

export class InMemoryFixturePlanRepository
  implements FixturePlanRepository, EditableFixturePlanRepository
{
  readonly rows = new Map<string, FixturePlan>();
  private readonly generationKeys = new Map<string, string>();

  constructor(private readonly encounters?: EncounterScheduleRepository) {}

  async findByGenerationKey(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    generationKey: string,
  ): Promise<FixturePlan | null> {
    const id = this.generationKeys.get(key(organizationId, competitionId, generationKey));
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

  async save(
    plan: FixturePlan,
  ): Promise<{ readonly plan: FixturePlan; readonly created: boolean }> {
    const generationKey = key(plan.organizationId, plan.competitionId, plan.generationKey);
    const existingId = this.generationKeys.get(generationKey);
    if (existingId) return { plan: this.rows.get(existingId) as FixturePlan, created: false };
    this.rows.set(plan.id, plan);
    this.generationKeys.set(generationKey, plan.id);
    await this.syncEncounterSnapshots(plan);
    return { plan, created: true };
  }

  async update(plan: FixturePlan): Promise<FixturePlan | null> {
    const existing = this.rows.get(plan.id);
    if (
      !existing ||
      existing.organizationId !== plan.organizationId ||
      existing.competitionId !== plan.competitionId ||
      existing.revision !== plan.revision
    ) {
      return null;
    }
    const updated = { ...plan, revision: plan.revision + 1 };
    this.rows.set(plan.id, updated);
    await this.syncEncounterSnapshots(updated);
    return updated;
  }

  private async syncEncounterSnapshots(plan: FixturePlan): Promise<void> {
    if (!this.encounters) return;
    for (const stage of plan.stages) {
      for (const round of stage.rounds) {
        for (const encounter of round.encounters) {
          if (encounter.home.kind !== "team" || encounter.away.kind !== "team") continue;
          await this.encounters.upsert({
            encounterId: encounter.id,
            organizationId: plan.organizationId,
            competitionId: plan.competitionId,
            homeTeamId: encounter.home.teamId,
            awayTeamId: encounter.away.teamId,
            scheduledStartAt: encounter.scheduledStartAt,
            officialMatchCount: encounter.officialMatchCount,
          });
        }
      }
    }
  }
}

export class PostgresFixturePlanRepository
  implements FixturePlanRepository, EditableFixturePlanRepository
{
  constructor(private readonly pool: Pool) {}

  async findByGenerationKey(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    generationKey: string,
  ): Promise<FixturePlan | null> {
    const result = await getPgExecutor(this.pool).query(
      `SELECT id FROM fixture_plans
       WHERE organization_id = $1 AND competition_id = $2 AND generation_key = $3`,
      [organizationId, competitionId, generationKey],
    );
    const id = result.rows[0]?.id as string | undefined;
    return id ? this.findById(organizationId, competitionId, id) : null;
  }

  async findById(
    organizationId: OrganizationId,
    competitionId: CompetitionId,
    fixturePlanId: string,
  ): Promise<FixturePlan | null> {
    const executor = getPgExecutor(this.pool);
    const planResult = await executor.query(
      `SELECT id, revision, generation_key, organization_id, competition_id, rules_version,
              generation_version, format, time_zone, seed
       FROM fixture_plans
       WHERE id = $1 AND organization_id = $2 AND competition_id = $3`,
      [fixturePlanId, organizationId, competitionId],
    );
    const planRow = planResult.rows[0] as PlanRow | undefined;
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
        `SELECT id, stage_id, round_id, encounter_order, group_id, home_slot, away_slot,
                scheduled_start_at, official_match_count
         FROM fixture_encounters
         WHERE fixture_plan_id = $1 ORDER BY round_id, encounter_order`,
        [fixturePlanId],
      ),
    ]);
    return rehydratePlan(planRow, stageResult.rows, roundResult.rows, encounterResult.rows);
  }

  async save(
    plan: FixturePlan,
  ): Promise<{ readonly plan: FixturePlan; readonly created: boolean }> {
    const executor = getPgExecutor(this.pool);
    const inserted = await executor.query(
      `INSERT INTO fixture_plans (
         id, revision, generation_key, organization_id, competition_id, rules_version,
         generation_version, format, time_zone, seed
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
       ON CONFLICT (organization_id, competition_id, generation_key) DO NOTHING
       RETURNING id`,
      [
        plan.id,
        plan.revision,
        plan.generationKey,
        plan.organizationId,
        plan.competitionId,
        plan.rulesVersion,
        plan.generationVersion,
        plan.format,
        plan.timeZone,
        JSON.stringify(plan.seed),
      ],
    );
    if (!inserted.rows[0]) {
      const existing = await this.findByGenerationKey(
        plan.organizationId,
        plan.competitionId,
        plan.generationKey,
      );
      if (!existing) throw new Error("Fixture generation key conflict without a persisted plan");
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

  async update(plan: FixturePlan): Promise<FixturePlan | null> {
    const executor = getPgExecutor(this.pool);
    const bumped = await executor.query(
      `UPDATE fixture_plans SET revision = revision + 1, updated_at = now()
       WHERE id = $1 AND organization_id = $2 AND competition_id = $3 AND revision = $4
       RETURNING revision`,
      [plan.id, plan.organizationId, plan.competitionId, plan.revision],
    );
    const revision = bumped.rows[0]?.revision as number | undefined;
    if (!revision) return null;
    for (const stage of plan.stages) {
      for (const round of stage.rounds) {
        for (const encounter of round.encounters) {
          await executor.query(
            `UPDATE fixture_encounters SET home_slot = $1::jsonb, away_slot = $2::jsonb,
                    scheduled_start_at = $3
             WHERE id = $4 AND fixture_plan_id = $5 AND organization_id = $6 AND competition_id = $7`,
            [
              JSON.stringify(encounter.home),
              JSON.stringify(encounter.away),
              encounter.scheduledStartAt.toISOString(),
              encounter.id,
              plan.id,
              plan.organizationId,
              plan.competitionId,
            ],
          );
          await upsertEncounterSnapshot(executor, plan, encounter);
        }
      }
    }
    return { ...plan, revision: Number(revision) };
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
  await upsertEncounterSnapshot(executor, plan, encounter);
}

async function upsertEncounterSnapshot(
  executor: Executor,
  plan: FixturePlan,
  encounter: FixtureEncounter,
): Promise<void> {
  if (encounter.home.kind !== "team" || encounter.away.kind !== "team") return;
  await executor.query(
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
       AND encounter_schedule_snapshots.competition_id = EXCLUDED.competition_id`,
    [
      encounter.id,
      plan.organizationId,
      plan.competitionId,
      encounter.home.teamId,
      encounter.away.teamId,
      encounter.scheduledStartAt.toISOString(),
      encounter.officialMatchCount,
    ],
  );
}

function rehydratePlan(
  row: PlanRow,
  stageRows: unknown[],
  roundRows: unknown[],
  encounterRows: unknown[],
): FixturePlan {
  const rounds = roundRows as RoundRow[];
  const encounters = encounterRows as EncounterRow[];
  const stages = (stageRows as StageRow[]).map(
    (stage): FixtureStage => ({
      id: stage.id as FixtureStage["id"],
      kind: stage.kind,
      order: Number(stage.stage_order),
      rounds: rounds
        .filter((round) => round.stage_id === stage.id)
        .map((round) => ({
          id: round.id as FixtureStage["rounds"][number]["id"],
          stageId: stage.id as FixtureStage["id"],
          number: Number(round.round_number),
          scheduledStartAt: new Date(round.scheduled_start_at),
          encounters: encounters
            .filter((encounter) => encounter.round_id === round.id)
            .map(rehydrateEncounter),
        })),
    }),
  );
  return {
    id: row.id,
    revision: Number(row.revision),
    generationKey: row.generation_key,
    organizationId: asOrganizationId(row.organization_id),
    competitionId: asCompetitionId(row.competition_id),
    rulesVersion: Number(row.rules_version),
    generationVersion: Number(row.generation_version),
    format: row.format,
    timeZone: row.time_zone,
    seed: jsonArray(row.seed).map(asTeamId),
    stages,
  };
}

function rehydrateEncounter(row: EncounterRow): FixtureEncounter {
  return {
    id: asEncounterId(row.id),
    stageId: row.stage_id as FixtureEncounter["stageId"],
    roundId: row.round_id as FixtureEncounter["roundId"],
    order: Number(row.encounter_order),
    ...(row.group_id ? { groupId: row.group_id } : {}),
    home: slot(row.home_slot),
    away: slot(row.away_slot),
    scheduledStartAt: new Date(row.scheduled_start_at),
    officialMatchCount: Number(row.official_match_count) as 1 | 2,
  };
}

function slot(value: unknown): FixtureParticipantSlot {
  const parsed = jsonObject(value);
  switch (parsed.kind) {
    case "team":
      return { kind: "team", teamId: asTeamId(requiredString(parsed.teamId)) };
    case "bye":
      return { kind: "bye" };
    case "winner":
      return { kind: "winner", encounterId: asEncounterId(requiredString(parsed.encounterId)) };
    case "group-rank":
      return {
        kind: "group-rank",
        stageId: asFixtureStageId(requiredString(parsed.stageId)),
        groupId: requiredString(parsed.groupId),
        rank: requiredNumber(parsed.rank),
      };
    case "stage-rank":
      return {
        kind: "stage-rank",
        stageId: asFixtureStageId(requiredString(parsed.stageId)),
        rank: requiredNumber(parsed.rank),
      };
    default:
      throw new Error("Invalid fixture participant slot");
  }
}

function jsonObject(value: unknown): Record<string, unknown> {
  const parsed = typeof value === "string" ? (JSON.parse(value) as unknown) : value;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid fixture JSON object");
  }
  return parsed as Record<string, unknown>;
}

function jsonArray(value: unknown): string[] {
  const parsed = typeof value === "string" ? (JSON.parse(value) as unknown) : value;
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
    throw new Error("Invalid fixture seed");
  }
  return parsed as string[];
}

function requiredString(value: unknown): string {
  if (typeof value !== "string" || !value) throw new Error("Invalid fixture string field");
  return value;
}

function requiredNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new Error("Invalid fixture number field");
  }
  return value;
}

function key(organizationId: string, competitionId: string, generationKey: string): string {
  return `${organizationId}\u0000${competitionId}\u0000${generationKey}`;
}

interface PlanRow {
  id: string;
  revision: number;
  generation_key: string;
  organization_id: string;
  competition_id: string;
  rules_version: number;
  generation_version: number;
  format: FixturePlan["format"];
  time_zone: string;
  seed: unknown;
}

interface StageRow {
  id: string;
  kind: FixtureStage["kind"];
  stage_order: number;
}

interface RoundRow {
  id: string;
  stage_id: string;
  round_number: number;
  scheduled_start_at: Date | string;
}

interface EncounterRow {
  id: string;
  stage_id: string;
  round_id: string;
  encounter_order: number;
  group_id: string | null;
  home_slot: unknown;
  away_slot: unknown;
  scheduled_start_at: Date | string;
  official_match_count: number;
}
