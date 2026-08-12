import {
  asFixtureStageId,
  replaceEncounter,
  type FixtureEncounter,
  type FixtureParticipantSlot,
  type FixturePlan,
  type FixturePlanRepository,
  type FixtureStage,
} from "@futrob/scheduling";
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
    if (existingId) return { plan: this.rows.get(existingId) as FixturePlan, created: false };
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
      `SELECT id, revision, status, generation_key, generation_fingerprint, organization_id,
              competition_id, rules_version, generation_version, format, time_zone,
              home_and_away, seed
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
      result.rows.map((row) => this.findById(organizationId, competitionId, row.id as string)),
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
    status: row.status,
    generationKey: row.generation_key,
    generationFingerprint: row.generation_fingerprint,
    organizationId: asOrganizationId(row.organization_id),
    competitionId: asCompetitionId(row.competition_id),
    rulesVersion: Number(row.rules_version),
    generationVersion: Number(row.generation_version),
    format: row.format,
    timeZone: row.time_zone,
    homeAndAway: Boolean(row.home_and_away),
    seed: jsonArray(row.seed).map(asTeamId),
    stages,
  };
}

function rehydrateEncounter(row: EncounterRow): FixtureEncounter {
  const id = asEncounterId(row.id);
  const officialMatchCount = Number(row.official_match_count) as 1 | 2;
  const slots: readonly (1 | 2)[] = officialMatchCount === 1 ? [1] : [1, 2];
  return {
    id,
    stageId: row.stage_id as FixtureEncounter["stageId"],
    roundId: row.round_id as FixtureEncounter["roundId"],
    order: Number(row.encounter_order),
    ...(row.group_id ? { groupId: row.group_id } : {}),
    home: slot(row.home_slot),
    away: slot(row.away_slot),
    scheduledStartAt: new Date(row.scheduled_start_at),
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

function versionKey(
  organizationId: string,
  competitionId: string,
  generationVersion: number,
): string {
  return `${organizationId}\u0000${competitionId}\u0000${generationVersion}`;
}

interface PlanRow {
  id: string;
  revision: number;
  status: FixturePlan["status"];
  generation_key: string;
  generation_fingerprint: string;
  organization_id: string;
  competition_id: string;
  rules_version: number;
  generation_version: number;
  format: FixturePlan["format"];
  time_zone: string;
  home_and_away: boolean;
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
  series_id: string | null;
  resolution_mode: NonNullable<FixtureEncounter["series"]>["resolutionMode"] | null;
}
