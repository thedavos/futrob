// Test-only composition intentionally exercises real adapters across their boundaries.
/* oxlint-disable futrob/no-cross-module-adapter-import */
import {
  competitionDraft,
  fixturePlan,
  P,
  K,
  SLOT2,
  org,
  competition,
  encounter,
  captainA,
  captainB,
  teamA,
  teamB,
  organizer,
  system,
  scope,
} from "./schedule-change-expiry.seed.ts";
export {
  P,
  K,
  D,
  S1,
  SLOT2,
  org,
  competition,
  encounter,
  captainA,
  captainB,
  teamA,
  teamB,
  organizer,
  system,
} from "./schedule-change-expiry.seed.ts";
import { cp, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Pool } from "pg";
import {
  AcceptScheduleChangeProposalUseCase,
  CounterScheduleChangeProposalUseCase,
  CreateScheduleChangeRequestUseCase,
  ExpireScheduleChangeProposalUseCase,
  RejectScheduleChangeProposalUseCase,
  ResolveScheduleChangeRequestUseCase,
  ENCOUNTER_PERMISSION,
  asFixtureStageId,
  type AcceptScheduleChangeProposalDeps,
  type ScheduleChangeRequest,
  type ScheduleChangeResolution,
  type RescheduleScope,
  type ScheduleChangeTransition,
} from "@futrob/scheduling";
import {
  type ActorId,
  type TeamId,
  type AuthorizationPort,
  type DomainEvent,
  type Result,
} from "@futrob/shared-kernel";
import { PostgresCompetitionRepository } from "@/adapters/competitions/postgres.repository.ts";
import { CryptoIdGenerator } from "@/adapters/organizations/crypto-ports.ts";
import { PostgresTransactionPort } from "@/adapters/persistence/pg-transaction.ts";
import {
  createIsolatedSchema,
  migrateIsolatedSchema,
  MIGRATIONS_DIRECTORY,
} from "@/testing/isolated-schema.ts";
import { seedActors } from "@/testing/seed-actors.ts";
import { CompetitionRescheduleRulesAdapter } from "@/adapters/scheduling/competition-reschedule-rules.adapter.ts";
import { CompetitionTimeZoneAdapter } from "@/adapters/scheduling/competition-time-zone.adapter.ts";
import { PostgresEncounterMutationLock } from "@/adapters/scheduling/encounter-mutation-lock.ts";
import { PostgresEncounterScheduleRepository } from "@/adapters/scheduling/encounter-schedule.repository.ts";
import { OfficialResultFixtureEditGuard } from "@/adapters/scheduling/fixture-editing.adapters.ts";
import { PostgresFixturePlanRepository } from "@/adapters/scheduling/fixture-plan.repository.ts";
import { PostgresOfficialMatchRepository } from "@/adapters/scheduling/official-match.repository.ts";
import { PostgresScheduleChangeRequestRepository } from "@/adapters/scheduling/schedule-change-request.repository.ts";
import { PostgresScheduleChangeApplicationFeed } from "@/adapters/scheduling/schedule-change-application-feed.ts";
import { PostgresScheduleChangeExpiryFeed } from "@/adapters/scheduling/schedule-change-expiry-feed.ts";

export async function freshExpiryDatabase(
  options: { hours?: number; organizerRequired?: boolean; legacy?: boolean } = {},
) {
  if (!process.env.TEST_DATABASE_URL)
    throw new Error("TEST_DATABASE_URL is required for durable expiry tests");
  const isolated = await createIsolatedSchema(process.env.TEST_DATABASE_URL, "schedule_expiry");
  try {
    if (options.legacy) {
      const directory = await mkdtemp(join(tmpdir(), "expiry-legacy-"));
      try {
        for (const name of await readdir(MIGRATIONS_DIRECTORY)) {
          if (name.endsWith(".sql") && name < "0055")
            await cp(join(MIGRATIONS_DIRECTORY, name), join(directory, name));
        }
        await migrateIsolatedSchema(isolated.pool, directory);
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    } else await migrateIsolatedSchema(isolated.pool);
    await seedActors(isolated.pool, captainA, captainB, organizer, system);
    await isolated.pool.query(
      `INSERT INTO organizations (id,name,normalized_name,slug,time_zone,created_at,created_by_actor_id) VALUES ($1,$1,$1,$1,'UTC',$2,$3)`,
      [org, P, organizer],
    );
    const competitions = new PostgresCompetitionRepository(isolated.pool);
    const draft = competitionDraft(options.hours ?? 12, options.organizerRequired ?? false);
    await competitions.saveDraft(draft);
    if (options.legacy && options.hours === undefined) {
      await isolated.pool.query(
        `UPDATE competition_rules SET regular_stage = regular_stage - 'rescheduleProposalExpiryHours' WHERE competition_id=$1`,
        [competition],
      );
    }
    for (const team of [teamA, teamB])
      await isolated.pool.query(
        `INSERT INTO teams (id,organization_id,name,created_at,created_by_actor_id) VALUES ($1,$2,$1,$3,$4)`,
        [team, org, P, organizer],
      );
    await new PostgresEncounterScheduleRepository(isolated.pool).upsert({
      encounterId: encounter,
      organizationId: org,
      competitionId: competition,
      homeTeamId: teamA,
      awayTeamId: teamB,
      scheduledStartAt: new Date(K),
      officialMatchCount: 2,
      stageId: asFixtureStageId("expiry-stage"),
    });
    for (const [slot, at] of [
      [1, K],
      [2, SLOT2],
    ] as const)
      await isolated.pool.query(
        `INSERT INTO official_matches (id,encounter_id,organization_id,competition_id,slot,status,scheduled_start_at,created_at) VALUES ($1,$2,$3,$4,$5,'scheduled',$6,$7)`,
        [`expiry-slot-${slot}`, encounter, org, competition, slot, at, P],
      );
    await new PostgresFixturePlanRepository(isolated.pool).save(fixturePlan());
    return isolated;
  } catch (error) {
    await isolated.drop();
    throw error;
  }
}

export function expiryFlow(
  pool: Pool,
  faults: {
    fixtureFails?: boolean;
    publishFails?: boolean;
    beforeCommit?: (transition: ScheduleChangeTransition) => Promise<void>;
    afterCommit?: () => Promise<void>;
    beforeLock?: () => void;
    afterLock?: () => Promise<void>;
  } = {},
) {
  let now = P;
  let permitted = true;
  const authorization: AuthorizationPort = {
    decide: async (input) => ({
      ...input,
      allowed:
        permitted &&
        (input.permission !== ENCOUNTER_PERMISSION.rescheduleResolve ||
          input.actorId === organizer),
      reason: "allowed",
    }),
    getEffectiveAccess: async (input) => ({ ...input, roles: [], permissions: [] }),
  };
  const requests = new PostgresScheduleChangeRequestRepository(pool);
  const fixtures = new PostgresFixturePlanRepository(pool);
  const matches = new PostgresOfficialMatchRepository(pool);
  const encounters = new PostgresEncounterScheduleRepository(pool);
  const competitions = new PostgresCompetitionRepository(pool);
  const realLock = new PostgresEncounterMutationLock(pool);
  const events: DomainEvent[] = [];
  const rules = new CompetitionRescheduleRulesAdapter({ competitions, fixtures, requests });
  const deps: AcceptScheduleChangeProposalDeps = {
    authorization,
    clock: { now: () => new Date(now) },
    encounters,
    ids: new CryptoIdGenerator(),
    matches,
    rules,
    editGuard: new OfficialResultFixtureEditGuard(
      matches,
      { findApprovedByEncounter: async () => null },
      { findLatestByEncounter: async () => null },
    ),
    mutationLock: {
      runExclusive: async (id, operation) => {
        faults.beforeLock?.();
        return realLock.runExclusive(id, async () => {
          await faults.afterLock?.();
          return operation();
        });
      },
    },
    transaction: new PostgresTransactionPort(pool),
    requests:
      faults.beforeCommit || faults.afterCommit
        ? {
            findById: (org, id) => requests.findById(org, id),
            findByIdempotencyKey: (org, key) => requests.findByIdempotencyKey(org, key),
            listActiveByEncounter: (org, id) => requests.listActiveByEncounter(org, id),
            listByEncounter: (org, id) => requests.listByEncounter(org, id),
            findCommandReceipt: (org, actor, key) => requests.findCommandReceipt(org, actor, key),
            save: (request) => requests.save(request),
            commit: async (transition, receipt) => {
              await faults.beforeCommit?.(transition);
              const outcome = await requests.commit(transition, receipt);
              await faults.afterCommit?.();
              return outcome;
            },
          }
        : requests,
    fixtures: faults.fixtureFails
      ? { listActive: (org, id) => fixtures.listActive(org, id), updateEncounter: async () => null }
      : fixtures,
    eventPublisher: {
      publish: async (event) => {
        if (faults.publishFails) throw new Error("expiry test publisher failure");
        events.push(event);
      },
      publishMany: async () => undefined,
    },
  };
  const timeZones = new CompetitionTimeZoneAdapter(competitions);
  const create = new CreateScheduleChangeRequestUseCase({ ...deps, encounters, timeZones });
  const accept = new AcceptScheduleChangeProposalUseCase(deps);
  const reject = new RejectScheduleChangeProposalUseCase(deps);
  const counter = new CounterScheduleChangeProposalUseCase({ ...deps, timeZones });
  const resolve = new ResolveScheduleChangeRequestUseCase(deps);
  const expire = new ExpireScheduleChangeProposalUseCase(deps);
  const command = (request: ScheduleChangeRequest, key: string) => ({
    ...scope,
    actorId: captainB,
    requestId: request.id,
    proposalId: request.proposals.at(-1)!.id,
    expectedVersion: request.version,
    commandKey: key,
  });
  return {
    pool,
    deps,
    requests,
    rules,
    events,
    at: (value: string) => {
      now = value;
    },
    revoke: () => {
      permitted = false;
    },
    create: (
      options: {
        day?: number;
        hour?: number;
        key?: string;
        scope?: RescheduleScope;
        actorId?: ActorId;
        requestingTeamId?: TeamId;
      } = {},
    ) =>
      create.execute({
        ...scope,
        actorId: options.actorId ?? captainA,
        requestingTeamId: options.requestingTeamId ?? teamA,
        scope: options.scope ?? { type: "entire_encounter" },
        timeZone: "UTC",
        proposedWallTime: {
          year: 2026,
          month: 11,
          day: options.day ?? 2,
          hour: options.hour ?? 20,
          minute: 0,
          second: 0,
        },
        reason: "Travel conflict",
        idempotencyKey: options.key ?? "initial",
      }),
    accept: (request: ScheduleChangeRequest, key = "accept", organizerConsent = false) =>
      accept.execute({
        ...command(request, key),
        actorId: organizerConsent ? organizer : captainB,
        responder: organizerConsent
          ? { authority: "organizer" }
          : { authority: "rival_team", teamId: teamB },
      }),
    reject: (request: ScheduleChangeRequest) =>
      reject.execute({
        ...command(request, "reject"),
        responder: { authority: "rival_team", teamId: teamB },
      }),
    counter: (request: ScheduleChangeRequest) =>
      counter.execute({
        ...command(request, "counter"),
        teamId: teamB,
        timeZone: "UTC",
        proposedWallTime: { year: 2026, month: 11, day: 3, hour: 21, minute: 0, second: 0 },
        reason: "Venue unavailable",
      }),
    expire: (request: ScheduleChangeRequest) =>
      expire.execute({
        organizationId: org,
        encounterId: encounter,
        requestId: request.id,
        actorId: system,
      }),
    resolve: (
      request: ScheduleChangeRequest,
      resolution: ScheduleChangeResolution,
      key = "resolve",
      actorId = organizer,
      organizationId = org,
    ) => resolve.execute({ ...command(request, key), actorId, organizationId, resolution }),
    read: async (request: ScheduleChangeRequest) => {
      const stored = await requests.findById(org, request.id);
      if (!stored) throw new Error("Missing durable request");
      return stored;
    },
    quota: (teamId = teamA) => requests.countAppliedByTeam({ ...scope, teamId }),
    due: (dueAt = new Date(now)) =>
      new PostgresScheduleChangeExpiryFeed(pool).listDue({ dueAt, limit: 100 }),
    handoffs: () =>
      new PostgresScheduleChangeApplicationFeed(pool).listUnacknowledged({
        consumer: "results.candidate-recalculation",
        limit: 100,
      }),
  };
}

export async function durableSchedule(pool: Pool) {
  const start = await pool.query<{ at: Date }>(
    `SELECT scheduled_start_at AS at FROM encounter_schedule_snapshots WHERE encounter_id=$1`,
    [encounter],
  );
  const fixture = await pool.query<{ at: Date }>(
    `SELECT scheduled_start_at AS at FROM fixture_encounters WHERE id=$1`,
    [encounter],
  );
  const slots = await pool.query<{ slot: number; at: Date; status: string }>(
    `SELECT slot,scheduled_start_at AS at,status FROM official_matches WHERE encounter_id=$1 ORDER BY slot`,
    [encounter],
  );
  return {
    encounter: start.rows[0]!.at.toISOString(),
    fixture: fixture.rows[0]!.at.toISOString(),
    slots: slots.rows.map((row) => ({
      slot: row.slot,
      at: row.at.toISOString(),
      status: row.status,
    })),
  };
}

export async function durableCounts(pool: Pool) {
  const tables = [
    "schedule_change_requests",
    "schedule_change_proposals",
    "schedule_change_decisions",
    "schedule_change_actions",
    "schedule_change_applications",
    "schedule_change_application_slots",
    "schedule_change_command_receipts",
    "official_results",
    "competition_standing_snapshots",
  ] as const;
  const counts: Record<string, number> = {};
  for (const table of tables)
    counts[table] = (
      await pool.query<{ count: number }>(`SELECT count(*)::integer AS count FROM ${table}`)
    ).rows[0]!.count;
  return counts;
}
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.isErr()) throw new Error(`Expected success: ${JSON.stringify(result.error)}`);
  return result.value;
}
export function code<T>(result: Result<T, { code: string }>): string {
  return result.isOk() ? "ok" : result.error.code;
}
export function barrier() {
  let release!: () => void;
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
}
