import { cp, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CompetitionDraft } from "@futrob/competitions";
import type { OfficialResult } from "@futrob/results";
import {
  AcceptScheduleChangeProposalUseCase,
  CounterScheduleChangeProposalUseCase,
  CreateScheduleChangeRequestUseCase,
  ENCOUNTER_PERMISSION,
  RejectScheduleChangeProposalUseCase,
  asFixtureRoundId,
  asFixtureStageId,
  type AcceptScheduleChangeProposalDeps,
  type FixturePlan,
  type RescheduleScope,
  type ScheduleChangeResponder,
} from "@futrob/scheduling";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  type ActorId,
  type AuthorizationPort,
  type DomainEvent,
  type EncounterId,
  type OrganizationId,
  type Permission,
  type Result,
  type TeamId,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { InMemoryCompetitionRepository } from "@/adapters/competitions/in-memory.repository.ts";
import { CryptoIdGenerator } from "@/adapters/organizations/crypto-ports.ts";
import { PostgresTransactionPort } from "@/adapters/persistence/pg-transaction.ts";
import {
  MIGRATIONS_DIRECTORY,
  createIsolatedSchema,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";
import { seedActors } from "@/testing/seed-actors.ts";
import { CompetitionRescheduleRulesAdapter } from "./competition-reschedule-rules.adapter.ts";
import { CompetitionTimeZoneAdapter } from "./competition-time-zone.adapter.ts";
import { PostgresEncounterMutationLock } from "./encounter-mutation-lock.ts";
import { PostgresEncounterScheduleRepository } from "./encounter-schedule.repository.ts";
import { OfficialResultFixtureEditGuard } from "./fixture-editing.adapters.ts";
import { PostgresFixturePlanRepository } from "./fixture-plan.repository.ts";
import { PostgresOfficialMatchRepository } from "./official-match.repository.ts";
import { PostgresScheduleChangeRequestRepository } from "./schedule-change-request.repository.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const suite = describe.skipIf(!databaseUrl);

const organizationId = asOrganizationId("org-a");
const otherOrganizationId = asOrganizationId("org-b");
const competitionId = asCompetitionId("comp-a");
const encounterId = asEncounterId("encounter-1");
const neighborId = asEncounterId("encounter-2");
const teamA = asTeamId("team-a");
const teamB = asTeamId("team-b");
const captainA = asActorId("captain-a");
const captainB = asActorId("captain-b");
const organizer = asActorId("organizer-1");

const D0 = "2026-10-10T20:00:00.000Z";
const D1 = "2026-10-11T20:00:00.000Z";
const D2 = "2026-10-12T20:00:00.000Z";
const SLOT2 = "2026-10-10T21:00:00.000Z";
const SLOT2_MOVED = "2026-10-11T21:00:00.000Z";
const NOW = "2026-10-01T12:00:00.000Z";
// America/Lima is UTC-5: 15:00 local is 20:00Z and 16:00 local is 21:00Z.
const lima = (day: number, hour = 15) => ({
  year: 2026,
  month: 10,
  day,
  hour,
  minute: 0,
  second: 0,
});

const schemas: IsolatedSchema[] = [];

// Each test migrates a fresh schema; under a full monorepo run that exceeds the 5s default.
suite("applying an accepted schedule change on Postgres", { timeout: 60_000 }, () => {
  afterEach(async () => {
    for (const schema of schemas.splice(0)) await schema.drop();
  });

  it("moves D0 to D1 once with complete approvals and replays without new rows", async () => {
    const pool = await migratedPool();
    const flow = await applicationFlow(pool);
    const created = await flow.propose(11);
    const proposalId = created.proposals[0].id;

    const accepted = unwrap(await flow.accept(captainB, rival(teamB), { proposalId, version: 1 }));

    expect(await encounterStart(pool)).toBe(D1);
    expect(await slotStarts(pool)).toEqual([
      { slot: 1, at: D1, status: "scheduled" },
      { slot: 2, at: D1, status: "scheduled" },
    ]);
    expect(await fixtureStart(pool)).toBe(D1);
    const stored = await new PostgresScheduleChangeRequestRepository(pool).findById(
      organizationId,
      created.id,
    );
    expect(stored).toMatchObject({ status: "accepted", version: 2 });
    expect(stored?.application).toEqual({
      id: accepted.request.application?.id,
      proposalId,
      requestVersion: 2,
      appliedByActorId: captainB,
      previousEncounterStartAt: new Date(D0),
      appliedEncounterStartAt: new Date(D1),
      slots: [
        { slot: 1, previousStartAt: new Date(D0), appliedStartAt: new Date(D1) },
        { slot: 2, previousStartAt: new Date(D0), appliedStartAt: new Date(D1) },
      ],
      appliedAt: new Date(NOW),
    });
    const before = await rowCounts(pool);
    expect(before).toEqual({ applications: 1, applicationSlots: 2, receipts: 1, proposals: 1 });

    const replay = unwrap(
      await (
        await applicationFlow(pool)
      ).accept(captainB, rival(teamB), { proposalId, version: 1 }),
    );
    expect(replay.replayed).toBe(true);
    expect(replay.request.application?.id).toBe(accepted.request.application?.id);
    expect(await rowCounts(pool)).toEqual(before);
    expect(await encounterStart(pool)).toBe(D1);
    expect(flow.rescheduled()).toHaveLength(1);
  });

  it("moves only slot 2 for an official_match request on slot 2", async () => {
    const pool = await migratedPool({ slot2: SLOT2 });
    const flow = await applicationFlow(pool);
    const created = await flow.propose(11, {
      hour: 16,
      scope: { type: "official_match", officialSlot: 2 },
    });

    unwrap(
      await flow.accept(captainB, rival(teamB), {
        proposalId: created.proposals[0].id,
        version: 1,
      }),
    );

    expect(await slotStarts(pool)).toEqual([
      { slot: 1, at: D0, status: "scheduled" },
      { slot: 2, at: SLOT2_MOVED, status: "scheduled" },
    ]);
    expect(await encounterStart(pool)).toBe(D0);
    expect(await fixtureStart(pool)).toBe(D0);
  });

  it("moves both slots by the same delta for an entire_encounter request", async () => {
    const pool = await migratedPool({ slot2: SLOT2 });
    const flow = await applicationFlow(pool);
    const created = await flow.propose(11);

    unwrap(
      await flow.accept(captainB, rival(teamB), {
        proposalId: created.proposals[0].id,
        version: 1,
      }),
    );

    expect(await slotStarts(pool)).toEqual([
      { slot: 1, at: D1, status: "scheduled" },
      { slot: 2, at: SLOT2_MOVED, status: "scheduled" },
    ]);
    expect(await encounterStart(pool)).toBe(D1);
  });

  it("keeps D0 through incomplete approvals and a rejection", async () => {
    const pool = await migratedPool();
    const flow = await applicationFlow(pool, { requiresOrganizerApproval: true });
    const created = await flow.propose(11);
    const d1 = created.proposals[0].id;

    unwrap(
      await flow.accept(organizer, { authority: "organizer" }, { proposalId: d1, version: 1 }),
    );
    expect(await encounterStart(pool)).toBe(D0);

    const countered = unwrap(
      await flow.counter(captainB, teamB, { proposalId: d1, version: 2 }, 12),
    );
    const d2 = countered.request.proposals[1]?.id ?? "missing";
    // The organizer consented to D1 only; the rival alone does not complete D2.
    unwrap(await flow.accept(captainA, rival(teamA), { proposalId: d2, version: 3 }));
    expect(await encounterStart(pool)).toBe(D0);

    const rejected = unwrap(
      await flow.reject(organizer, { authority: "organizer" }, { proposalId: d2, version: 4 }),
    );
    expect(rejected.request.status).toBe("rejected");
    expect(await encounterStart(pool)).toBe(D0);
    expect(await slotStarts(pool)).toEqual([
      { slot: 1, at: D0, status: "scheduled" },
      { slot: 2, at: D0, status: "scheduled" },
    ]);
    expect(await rowCounts(pool)).toMatchObject({ applications: 0, applicationSlots: 0 });
  });

  it("applies D2 only after every required authority consented to the current proposal", async () => {
    const pool = await migratedPool();
    const flow = await applicationFlow(pool, { requiresOrganizerApproval: true });
    const created = await flow.propose(11);
    const d1 = created.proposals[0].id;
    unwrap(
      await flow.accept(organizer, { authority: "organizer" }, { proposalId: d1, version: 1 }),
    );
    const countered = unwrap(
      await flow.counter(captainB, teamB, { proposalId: d1, version: 2 }, 12),
    );
    const d2 = countered.request.proposals[1]?.id ?? "missing";
    unwrap(await flow.accept(captainA, rival(teamA), { proposalId: d2, version: 3 }));

    unwrap(
      await flow.accept(
        organizer,
        { authority: "organizer" },
        { proposalId: d2, version: 4 },
        "organizer-d2",
      ),
    );

    expect(await encounterStart(pool)).toBe(D2);
    const stored = await new PostgresScheduleChangeRequestRepository(pool).findById(
      organizationId,
      created.id,
    );
    expect(stored?.application).toMatchObject({ proposalId: d2, requestVersion: 5 });
  });

  it("rolls back every write when a later write of the application fails, then a retry applies once", async () => {
    const pool = await migratedPool();
    const failing = await applicationFlow(pool, {}, { fixtureConflict: true });
    const created = await failing.propose(11);
    const target = { proposalId: created.proposals[0].id, version: 1 };
    const before = await scheduleState(pool);

    const conflict = await failing.accept(captainB, rival(teamB), target);
    expect(errorCode(conflict)).toBe("scheduling.fixture_update_conflict");
    expect(await scheduleState(pool)).toEqual(before);

    const throwing = await applicationFlow(pool, {}, { publishFails: true });
    await expect(throwing.accept(captainB, rival(teamB), target)).rejects.toThrow("bus down");
    expect(await scheduleState(pool)).toEqual(before);

    const healthy = await applicationFlow(pool);
    const applied = unwrap(await healthy.accept(captainB, rival(teamB), target));
    expect(applied.replayed).toBe(false);
    const after = await scheduleState(pool);
    expect(after.proposals).toEqual(before.proposals);
    expect(after.encounter).toEqual([{ start: D1 }]);
    expect(after.fixture).toEqual([{ start: D1 }]);
    expect(after.request).toEqual([{ status: "accepted", version: 2 }]);
    expect(await rowCounts(pool)).toEqual({
      applications: 1,
      applicationSlots: 2,
      receipts: 1,
      proposals: 1,
    });
  });

  it("applies one consent when two race on the same proposal", async () => {
    const pool = await migratedPool();
    const flow = await applicationFlow(pool);
    const created = await flow.propose(11);
    const target = { proposalId: created.proposals[0].id, version: 1 };

    const results = await Promise.all([
      flow.accept(captainB, rival(teamB), target, "race-1"),
      flow.accept(captainB, rival(teamB), target, "race-2"),
    ]);

    expect(results.map((result) => (result.isOk() ? "ok" : result.error.code)).sort()).toEqual([
      "ok",
      "scheduling.schedule_change_request_closed",
    ]);
    expect(await slotStarts(pool)).toEqual([
      { slot: 1, at: D1, status: "scheduled" },
      { slot: 2, at: D1, status: "scheduled" },
    ]);
    expect(await rowCounts(pool)).toMatchObject({ applications: 1, receipts: 1 });
  });

  it("leaves an approved Encounter and another tenant untouched while the neighbor moves", async () => {
    const pool = await migratedPool();
    await seedEncounter(pool, neighborId, D0);
    const flow = await applicationFlow(pool);
    const protectedRequest = await flow.propose(11);
    const neighborRequest = await flow.propose(11, { encounter: neighborId, key: "create-2" });
    // The official result of Encounter 1 is approved while its request is still open.
    flow.approveResult(encounterId);

    const blocked = await flow.accept(captainB, rival(teamB), {
      proposalId: protectedRequest.proposals[0].id,
      version: 1,
    });
    const foreign = await flow.accept(
      captainB,
      rival(teamB),
      { proposalId: neighborRequest.proposals[0].id, version: 1 },
      "foreign",
      {
        organizationId: otherOrganizationId,
        encounterId: neighborId,
        requestId: neighborRequest.id,
      },
    );
    expect(errorCode(blocked)).toBe("scheduling.encounter_not_editable_for_schedule_change");
    expect(errorCode(foreign)).toBe("scheduling.schedule_change_encounter_not_found");
    expect(await encounterStart(pool, neighborId)).toBe(D0);

    unwrap(
      await flow.accept(
        captainB,
        rival(teamB),
        { proposalId: neighborRequest.proposals[0].id, version: 1 },
        "neighbor",
        { encounterId: neighborId, requestId: neighborRequest.id },
      ),
    );
    expect(await encounterStart(pool, encounterId)).toBe(D0);
    expect(await encounterStart(pool, neighborId)).toBe(D1);
  });

  it("upgrades existing slots to their Encounter start and replays the migration without changes", async () => {
    const schema = await createIsolatedSchema(requireUrl(), "sched_apply_upgrade");
    schemas.push(schema);
    const before = await mkdtemp(join(tmpdir(), "futrob-migrations-"));
    try {
      for (const file of await readdir(MIGRATIONS_DIRECTORY)) {
        if (file.endsWith(".sql") && file < "0050")
          await cp(join(MIGRATIONS_DIRECTORY, file), join(before, file));
      }
      await migrateIsolatedSchema(schema.pool, before);
    } finally {
      await rm(before, { recursive: true, force: true });
    }
    await seedTenant(schema.pool);
    await schema.pool.query(
      `INSERT INTO encounter_schedule_snapshots (
         encounter_id, organization_id, competition_id, home_team_id, away_team_id,
         scheduled_start_at, official_match_count, stage_id
       ) VALUES ($1, $2, $3, $4, $5, $6, 2, 'stage-1')`,
      [encounterId, organizationId, competitionId, teamA, teamB, D0],
    );
    await schema.pool.query(
      `INSERT INTO official_matches (id, encounter_id, organization_id, competition_id, slot, status, created_at)
       VALUES ('legacy-1', $1, $2, $3, 1, 'completed', NOW()), ('legacy-2', $1, $2, $3, 2, 'scheduled', NOW())`,
      [encounterId, organizationId, competitionId],
    );

    const upgrade = await migrateIsolatedSchema(schema.pool);
    expect(upgrade.applied).toEqual(["0050_schedule_change_application.sql"]);
    expect(await slotStarts(schema.pool)).toEqual([
      { slot: 1, at: D0, status: "completed" },
      { slot: 2, at: D0, status: "scheduled" },
    ]);

    const replay = await migrateIsolatedSchema(schema.pool);
    expect(replay.applied).toEqual([]);
    expect(await slotStarts(schema.pool)).toEqual([
      { slot: 1, at: D0, status: "completed" },
      { slot: 2, at: D0, status: "scheduled" },
    ]);

    // Slot 1 is completed, so only slot 2 can still move; it moves alone.
    const flow = await applicationFlow(schema.pool);
    const created = await flow.propose(11, {
      hour: 16,
      scope: { type: "official_match", officialSlot: 2 },
    });
    unwrap(
      await flow.accept(captainB, rival(teamB), {
        proposalId: created.proposals[0].id,
        version: 1,
      }),
    );
    expect(await slotStarts(schema.pool)).toEqual([
      { slot: 1, at: D0, status: "completed" },
      { slot: 2, at: SLOT2_MOVED, status: "scheduled" },
    ]);
  });

  it("refuses to upgrade a database with an accepted request that never applied a schedule", async () => {
    const schema = await createIsolatedSchema(requireUrl(), "sched_apply_refuse");
    schemas.push(schema);
    const before = await mkdtemp(join(tmpdir(), "futrob-migrations-"));
    try {
      for (const file of await readdir(MIGRATIONS_DIRECTORY)) {
        if (file.endsWith(".sql") && file < "0050")
          await cp(join(MIGRATIONS_DIRECTORY, file), join(before, file));
      }
      await migrateIsolatedSchema(schema.pool, before);
    } finally {
      await rm(before, { recursive: true, force: true });
    }
    await seedTenant(schema.pool);
    await schema.pool.query(
      `INSERT INTO encounter_schedule_snapshots (
         encounter_id, organization_id, competition_id, home_team_id, away_team_id,
         scheduled_start_at, official_match_count, stage_id
       ) VALUES ($1, $2, $3, $4, $5, $6, 2, 'stage-1')`,
      [encounterId, organizationId, competitionId, teamA, teamB, D0],
    );
    await schema.pool.query(
      `INSERT INTO schedule_change_requests (
         id, organization_id, competition_id, encounter_id, requesting_team_id,
         initiated_by_actor_id, scope_type, official_slot, status, idempotency_key,
         created_at, updated_at, version
       ) VALUES ('legacy-accepted', $1, $2, $3, $4, $5, 'entire_encounter', NULL, 'accepted',
                 'legacy', NOW(), NOW(), 2)`,
      [organizationId, competitionId, encounterId, teamA, captainA],
    );

    await expect(migrateIsolatedSchema(schema.pool)).rejects.toThrow(
      "accepted schedule change requests exist without an applied schedule",
    );
    const ledger = await schema.pool.query<{ id: string }>(
      `SELECT id FROM schema_migrations WHERE id LIKE '0050%'`,
    );
    expect(ledger.rows).toEqual([]);
  });
});

function requireUrl(): string {
  if (!databaseUrl) throw new Error("TEST_DATABASE_URL is required");
  return databaseUrl;
}

async function migratedPool(options: { readonly slot2?: string } = {}): Promise<Pool> {
  const schema = await createIsolatedSchema(requireUrl(), "sched_apply");
  schemas.push(schema);
  await migrateIsolatedSchema(schema.pool);
  await seedTenant(schema.pool);
  await seedEncounter(schema.pool, encounterId, D0, options.slot2 ?? D0);
  await new PostgresFixturePlanRepository(schema.pool).save(fixturePlan());
  return schema.pool;
}

async function seedTenant(pool: Pool): Promise<void> {
  await seedActors(pool, captainA, captainB, organizer);
  for (const [id, slug] of [
    [organizationId, "org-a"],
    [otherOrganizationId, "org-b"],
  ]) {
    await pool.query(
      `INSERT INTO organizations (
         id, name, normalized_name, slug, time_zone, created_at, created_by_actor_id
       ) VALUES ($1, $1, $1, $2, 'America/Lima', NOW(), $3)`,
      [id, slug, organizer],
    );
  }
  await pool.query(
    `INSERT INTO competitions (
       id, organization_id, name, status, modality, game_edition, platform,
       region, time_zone, format, created_by_actor_id, created_at, updated_at
     ) VALUES (
       $1, $2, $1, 'published', 'fc-clubs', 'fc26', 'playstation',
       'south-america', 'America/Lima', 'league', $3, NOW(), NOW()
     )`,
    [competitionId, organizationId, organizer],
  );
  for (const [id, name] of [
    [teamA, "Team A"],
    [teamB, "Team B"],
  ]) {
    await pool.query(
      `INSERT INTO teams (id, organization_id, name, created_at, created_by_actor_id)
       VALUES ($1, $2, $3, NOW(), $4)`,
      [id, organizationId, name, organizer],
    );
  }
}

/** An Encounter with both slots stored. */
async function seedEncounter(
  pool: Pool,
  id: EncounterId,
  start: string,
  slot2?: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO encounter_schedule_snapshots (
       encounter_id, organization_id, competition_id, home_team_id, away_team_id,
       scheduled_start_at, official_match_count, stage_id
     ) VALUES ($1, $2, $3, $4, $5, $6, 2, 'stage-1')`,
    [id, organizationId, competitionId, teamA, teamB, start],
  );
  const slots: readonly [number, string][] = [
    [1, start],
    [2, slot2 ?? start],
  ];
  for (const [slot, at] of slots) {
    await pool.query(
      `INSERT INTO official_matches (
         id, encounter_id, organization_id, competition_id, slot, status, scheduled_start_at,
         created_at
       ) VALUES ($1, $2, $3, $4, $5, 'scheduled', $6, NOW())`,
      [`${id}:official-match:${slot}`, id, organizationId, competitionId, slot, at],
    );
  }
}

async function encounterStart(pool: Pool, id: EncounterId = encounterId): Promise<string> {
  const result = await pool.query<{ start: Date }>(
    `SELECT scheduled_start_at AS start FROM encounter_schedule_snapshots WHERE encounter_id = $1`,
    [id],
  );
  return result.rows[0]?.start.toISOString() ?? "missing";
}

async function fixtureStart(pool: Pool, id: EncounterId = encounterId): Promise<string> {
  const result = await pool.query<{ start: Date }>(
    `SELECT scheduled_start_at AS start FROM fixture_encounters WHERE id = $1`,
    [id],
  );
  return result.rows[0]?.start.toISOString() ?? "missing";
}

async function slotStarts(pool: Pool, id: EncounterId = encounterId) {
  const result = await pool.query<{ slot: number; at: Date; status: string }>(
    `SELECT slot, scheduled_start_at AS at, status FROM official_matches
     WHERE encounter_id = $1 ORDER BY slot`,
    [id],
  );
  return result.rows.map((row) => ({
    slot: row.slot,
    at: row.at.toISOString(),
    status: row.status,
  }));
}

async function rowCounts(pool: Pool) {
  const count = async (table: string) =>
    (await pool.query<{ count: number }>(`SELECT COUNT(*)::integer AS count FROM ${table}`)).rows[0]
      ?.count ?? 0;
  return {
    applications: await count("schedule_change_applications"),
    applicationSlots: await count("schedule_change_application_slots"),
    receipts: await count("schedule_change_command_receipts"),
    proposals: await count("schedule_change_proposals"),
  };
}

/** Every row a schedule application touches, in a stable order and as plain JSON. */
async function scheduleState(pool: Pool) {
  const rows = async (sql: string) =>
    JSON.parse(JSON.stringify((await pool.query(sql)).rows)) as unknown[];
  const starts = (list: unknown[]) =>
    list.map((row) => ({ start: new Date((row as { start: string }).start).toISOString() }));
  return {
    encounter: starts(
      await rows(
        `SELECT scheduled_start_at AS start FROM encounter_schedule_snapshots ORDER BY encounter_id`,
      ),
    ),
    fixture: starts(
      await rows(`SELECT scheduled_start_at AS start FROM fixture_encounters ORDER BY id`),
    ),
    slots: await rows(`SELECT * FROM official_matches ORDER BY encounter_id, slot`),
    request: await rows(`SELECT status, version FROM schedule_change_requests ORDER BY id`),
    proposals: await rows(`SELECT * FROM schedule_change_proposals ORDER BY id`),
    decisions: await rows(`SELECT * FROM schedule_change_decisions ORDER BY id`),
    receipts: await rows(`SELECT * FROM schedule_change_command_receipts ORDER BY id`),
    applications: await rows(`SELECT * FROM schedule_change_applications ORDER BY id`),
    applicationSlots: await rows(
      `SELECT * FROM schedule_change_application_slots ORDER BY application_id, slot`,
    ),
  };
}

class Grants implements AuthorizationPort {
  private readonly grants = new Set<string>();

  allow(actorId: ActorId, permission: Permission, teamId: TeamId | "*" = "*") {
    this.grants.add(`${actorId}|${permission}|${teamId}`);
  }

  async decide(request: Parameters<AuthorizationPort["decide"]>[0]) {
    const allowed =
      this.grants.has(`${request.actorId}|${request.permission}|${request.scope.teamId ?? "*"}`) ||
      this.grants.has(`${request.actorId}|${request.permission}|*`);
    return { ...request, allowed, reason: allowed ? ("allowed" as const) : ("denied" as const) };
  }

  async getEffectiveAccess(input: Parameters<AuthorizationPort["getEffectiveAccess"]>[0]) {
    return { ...input, roles: [], permissions: [] };
  }
}

const rival = (teamId: TeamId): ScheduleChangeResponder => ({ authority: "rival_team", teamId });

async function applicationFlow(
  pool: Pool,
  approvals: { readonly requiresOrganizerApproval?: boolean } = {},
  faults: {
    readonly fixtureConflict?: boolean;
    readonly publishFails?: boolean;
  } = {},
) {
  const grants = new Grants();
  for (const [actor, team] of [
    [captainA, teamA],
    [captainB, teamB],
  ] as const) {
    grants.allow(actor, ENCOUNTER_PERMISSION.read);
    grants.allow(actor, ENCOUNTER_PERMISSION.rescheduleRequest, team);
  }
  grants.allow(organizer, ENCOUNTER_PERMISSION.read);
  grants.allow(organizer, ENCOUNTER_PERMISSION.rescheduleResolve);

  const competitions = new InMemoryCompetitionRepository();
  await competitions.saveDraft(competitionDraft(approvals.requiresOrganizerApproval ?? false));
  const realFixtures = new PostgresFixturePlanRepository(pool);
  const requests = new PostgresScheduleChangeRequestRepository(pool);
  const matches = new PostgresOfficialMatchRepository(pool);
  const encounters = new PostgresEncounterScheduleRepository(pool);
  const events: DomainEvent[] = [];
  const approved = new Set<EncounterId>();
  const deps: AcceptScheduleChangeProposalDeps = {
    authorization: grants,
    clock: { now: () => new Date(NOW) },
    editGuard: new OfficialResultFixtureEditGuard(
      matches,
      {
        findApprovedByEncounter: async (id: EncounterId) =>
          approved.has(id) ? ({ encounterId: id } as unknown as OfficialResult) : null,
      },
      { findLatestByEncounter: async () => null },
    ),
    encounters,
    eventPublisher: {
      publish: async (event) => {
        if (faults.publishFails) throw new Error("bus down");
        events.push(event);
      },
      publishMany: async () => undefined,
    },
    // Another writer bumps the fixture revision between our read and our write, so the
    // fixture CAS fails after the slots, Encounter start and request were already written.
    fixtures: faults.fixtureConflict
      ? {
          listActive: (org, competition) => realFixtures.listActive(org, competition),
          updateEncounter: async (input) => {
            await pool.query(`UPDATE fixture_plans SET revision = revision + 1 WHERE id = $1`, [
              input.fixturePlanId,
            ]);
            return realFixtures.updateEncounter(input);
          },
        }
      : realFixtures,
    ids: new CryptoIdGenerator(),
    matches,
    mutationLock: new PostgresEncounterMutationLock(pool),
    requests,
    rules: new CompetitionRescheduleRulesAdapter({
      competitions,
      fixtures: realFixtures,
      requests,
    }),
    transaction: new PostgresTransactionPort(pool),
  };
  const timeZones = new CompetitionTimeZoneAdapter(competitions);
  const create = new CreateScheduleChangeRequestUseCase({ ...deps, encounters, timeZones });
  const accept = new AcceptScheduleChangeProposalUseCase(deps);
  const reject = new RejectScheduleChangeProposalUseCase(deps);
  const counter = new CounterScheduleChangeProposalUseCase({ ...deps, timeZones });
  const target = { organizationId, competitionId, encounterId };
  const requestId = async (key = "create-1") =>
    (await requests.findByIdempotencyKey(organizationId, key))?.id ?? "missing";

  return {
    approveResult: (id: EncounterId) => approved.add(id),
    rescheduled: () =>
      events.filter((event) => event.eventName === "scheduling.encounter-rescheduled"),
    async propose(
      day: number,
      at: {
        readonly hour?: number;
        readonly scope?: RescheduleScope;
        readonly encounter?: EncounterId;
        readonly key?: string;
      } = {},
    ) {
      return unwrap(
        await create.execute({
          ...target,
          encounterId: at.encounter ?? encounterId,
          actorId: captainA,
          requestingTeamId: teamA,
          scope: at.scope ?? { type: "entire_encounter" },
          timeZone: "America/Lima",
          proposedWallTime: lima(day, at.hour),
          reason: "Travel conflict",
          idempotencyKey: at.key ?? "create-1",
        }),
      );
    },
    async accept(
      actorId: ActorId,
      responder: ScheduleChangeResponder,
      at: { proposalId: string; version: number },
      commandKey = `accept-${actorId}`,
      overrides: {
        readonly organizationId?: OrganizationId;
        readonly encounterId?: EncounterId;
        readonly requestId?: string;
      } = {},
    ) {
      return accept.execute({
        ...target,
        ...overrides,
        actorId,
        responder,
        requestId: overrides.requestId ?? (await requestId()),
        proposalId: at.proposalId,
        expectedVersion: at.version,
        commandKey,
      });
    },
    async reject(
      actorId: ActorId,
      responder: ScheduleChangeResponder,
      at: { proposalId: string; version: number },
    ) {
      return reject.execute({
        ...target,
        actorId,
        responder,
        requestId: await requestId(),
        proposalId: at.proposalId,
        expectedVersion: at.version,
        commandKey: `reject-${actorId}`,
      });
    },
    async counter(
      actorId: ActorId,
      teamId: TeamId,
      at: { proposalId: string; version: number },
      day: number,
    ) {
      return counter.execute({
        ...target,
        actorId,
        teamId,
        requestId: await requestId(),
        proposalId: at.proposalId,
        expectedVersion: at.version,
        commandKey: `counter-${actorId}`,
        timeZone: "America/Lima",
        proposedWallTime: lima(day),
        reason: "Stadium unavailable",
      });
    },
  };
}

function fixturePlan(): FixturePlan {
  const stageId = asFixtureStageId("stage-1");
  const roundId = asFixtureRoundId("round-1");
  return {
    id: "plan-1",
    revision: 1,
    status: "active",
    generationKey: "key",
    generationFingerprint: "fingerprint",
    organizationId,
    competitionId,
    rulesVersion: 1,
    generationVersion: 1,
    format: "league",
    timeZone: "America/Lima",
    homeAndAway: false,
    seed: [teamA, teamB],
    stages: [
      {
        id: stageId,
        kind: "league",
        order: 1,
        rounds: [
          {
            id: roundId,
            stageId,
            number: 1,
            scheduledStartAt: new Date(D0),
            encounters: [
              {
                id: encounterId,
                stageId,
                roundId,
                order: 1,
                home: { kind: "team", teamId: teamA },
                away: { kind: "team", teamId: teamB },
                scheduledStartAt: new Date(D0),
                officialMatchCount: 2,
                series: null,
              },
            ],
          },
        ],
      },
    ],
  };
}

function competitionDraft(requiresOrganizerApproval: boolean): CompetitionDraft {
  const at = new Date("2026-07-31T12:00:00.000Z");
  return {
    competition: {
      id: competitionId,
      organizationId,
      name: "Liga Futrob",
      status: "published",
      modality: "fc-clubs",
      gameEdition: "FC 26",
      platform: "playstation",
      region: "south-america",
      timeZone: "America/Lima",
      format: "league",
      teams: { min: 2, max: null },
      schedule: { startsOn: null, endsOn: null },
      cover: { kind: "preset", preset: "cup" },
      createdByActorId: organizer,
      createdAt: at,
      updatedAt: at,
    },
    rules: {
      competitionId,
      version: 1,
      regularStage: {
        officialMatchesPerEncounter: 2,
        resolutionMode: "independent_matches",
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        allowRescheduling: true,
        maxReschedulesPerTeam: 2,
        minimumRescheduleNoticeHours: 12,
        rescheduleRequiresOpponentApproval: true,
        rescheduleRequiresOrganizerApproval: requiresOrganizerApproval,
      },
      knockoutStage: null,
      awayGoalsEnabled: false,
      maxRosterSize: null,
      createdAt: at,
    },
  };
}

function unwrap<T, E>(result: Result<T, E>): T {
  if (result.isErr()) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`);
  return result.value;
}

function errorCode<T>(result: Result<T, { code: string }>): string {
  if (result.isOk()) throw new Error("expected an error");
  return result.error.code;
}
