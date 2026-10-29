import {
  AdvanceFixtureFromOfficialResultUseCase,
  generateFixturePlan,
  type CompetitionFixtureSourceSnapshot,
  type FixturePlan,
  type OfficialEncounterScore,
} from "@futrob/scheduling";
import {
  asCompetitionId,
  asOrganizationId,
  asTeamId,
  type EncounterId,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { PostgresTransactionPort } from "@/adapters/persistence/pg-transaction.ts";
import {
  createIsolatedSchema,
  insertTenant,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";
import { PostgresEncounterScheduleRepository } from "./encounter-schedule.repository.ts";
import { PostgresFixturePlanRepository } from "./fixture-plan.repository.ts";
import { PostgresOfficialMatchRepository } from "./official-match.repository.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const suite = describe.skipIf(!databaseUrl);
const schemas: IsolatedSchema[] = [];

const organizationId = asOrganizationId("org-bracket");
const competitionId = asCompetitionId("comp-bracket");
const teams = ["team-a", "team-b", "team-c", "team-d"].map(asTeamId);

suite("fixture advancement on Postgres", { timeout: 60_000 }, () => {
  afterEach(async () => {
    for (const schema of schemas.splice(0)) await schema.drop();
  });

  it("persists the advanced slot, its origin and the destination series, then reverts them", async () => {
    const { pool, plan, scores, advance } = await setup();
    const [semiOne, semiTwo] = plan.stages[0]!.rounds[0]!.encounters;
    const final = plan.stages[0]!.rounds[1]!.encounters[0]!;
    approve(scores, semiOne!.id, [2, 0]);
    approve(scores, semiTwo!.id, [0, 1]);

    await advance(semiOne!.id);
    await advance(semiTwo!.id);

    const advanced = await reload(pool, plan);
    expect(findFinal(advanced)).toMatchObject({
      home: { kind: "team", teamId: "team-a", advancedFrom: final.home },
      away: { kind: "team", teamId: "team-c", advancedFrom: final.away },
      series: { id: `${final.id}:series`, resolutionMode: "aggregate_score" },
    });
    expect(await countRows(pool, "encounter_schedule_snapshots", final.id)).toBe(1);
    expect(await countRows(pool, "official_matches", final.id)).toBe(2);

    scores.delete(semiTwo!.id);
    await advance(semiTwo!.id);

    const reverted = await reload(pool, plan);
    expect(findFinal(reverted)).toMatchObject({
      away: { kind: "winner", encounterId: semiTwo!.id },
      series: null,
    });
    expect(await countRows(pool, "encounter_series", final.id)).toBe(0);
    expect(await countRows(pool, "encounter_schedule_snapshots", final.id)).toBe(0);
  });

  it("rolls the advance back with the surrounding transaction", async () => {
    const { pool, plan, scores, advance } = await setup();
    const semiOne = plan.stages[0]!.rounds[0]!.encounters[0]!;
    approve(scores, semiOne.id, [2, 0]);
    const transaction = new PostgresTransactionPort(pool);

    await expect(
      transaction.runInTransaction(async () => {
        await advance(semiOne.id);
        throw new Error("projection failed after the advance");
      }),
    ).rejects.toThrow("projection failed after the advance");

    expect(await reload(pool, plan)).toEqual(plan);
  });
});

async function setup() {
  if (!databaseUrl) throw new Error("TEST_DATABASE_URL is required");
  const schema = await createIsolatedSchema(databaseUrl, "fixture_advance");
  schemas.push(schema);
  await migrateIsolatedSchema(schema.pool);
  await insertTenant(schema.pool, organizationId, competitionId);
  for (const teamId of teams) {
    await schema.pool.query(
      `INSERT INTO teams (id, organization_id, name, created_at, created_by_actor_id)
       VALUES ($1, $2, $1, NOW(), 'tenant-organizer')`,
      [teamId, organizationId],
    );
  }
  const plan = generateFixturePlan({
    organizationId,
    competitionId,
    generationVersion: 1,
    rulesVersion: 1,
    format: "knockout",
    timeZone: "America/Lima",
    startsAt: new Date("2026-11-01T01:00:00.000Z"),
    roundIntervalDays: 7,
    officialMatchCounts: { regular: 1, knockout: 2 },
    resolutionModes: { regular: "independent_matches", knockout: "aggregate_score" },
    seed: teams,
    homeAndAway: false,
  });
  const fixtures = new PostgresFixturePlanRepository(schema.pool);
  await fixtures.save(plan);
  const scores = new Map<EncounterId, OfficialEncounterScore>();
  const source: CompetitionFixtureSourceSnapshot = {
    organizationId,
    competitionId,
    status: "published",
    format: "knockout",
    timeZone: "America/Lima",
    rulesVersion: 1,
    officialMatchCounts: { regular: 1, knockout: 2 },
    resolutionModes: { regular: "independent_matches", knockout: "aggregate_score" },
    standingPoints: { winPoints: 3, drawPoints: 1, lossPoints: 0 },
    approvedParticipants: teams,
  };
  const useCase = new AdvanceFixtureFromOfficialResultUseCase({
    clock: { now: () => new Date("2026-11-10T00:00:00.000Z") },
    editGuard: { canEdit: async ({ encounterId }) => !scores.has(encounterId) },
    encounters: new PostgresEncounterScheduleRepository(schema.pool),
    fixtures,
    matches: new PostgresOfficialMatchRepository(schema.pool),
    scores: { listApproved: async () => scores },
    source: { load: async () => source },
  });
  const advance = async (encounterId: EncounterId) => {
    const outcome = await useCase.execute({ organizationId, competitionId, encounterId });
    if (!outcome.isOk()) throw outcome.error;
    return outcome.value;
  };
  return { pool: schema.pool, plan, scores, advance };
}

function approve(
  scores: Map<EncounterId, OfficialEncounterScore>,
  encounterId: EncounterId,
  [homeGoals, awayGoals]: readonly [number, number],
): void {
  scores.set(encounterId, {
    officialResultId: `result:${encounterId}`,
    revision: 1,
    slots: [{ officialSlot: 1, homeGoals, awayGoals }],
  });
}

async function reload(pool: Pool, plan: FixturePlan): Promise<FixturePlan> {
  const loaded = await new PostgresFixturePlanRepository(pool).findById(
    plan.organizationId,
    plan.competitionId,
    plan.id,
  );
  if (!loaded) throw new Error("fixture plan disappeared");
  return loaded;
}

function findFinal(plan: FixturePlan) {
  return plan.stages[0]!.rounds[1]!.encounters[0]!;
}

async function countRows(pool: Pool, table: string, encounterId: EncounterId): Promise<number> {
  const result = await pool.query(
    `SELECT count(*)::int AS count FROM ${table} WHERE encounter_id = $1`,
    [encounterId],
  );
  return result.rows[0].count;
}
