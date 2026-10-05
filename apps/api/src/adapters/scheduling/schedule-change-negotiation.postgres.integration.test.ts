import { cp, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CompetitionDraft } from "@futrob/competitions";
import { ENCOUNTER_PERMISSION, type ScheduleChangeResponder } from "@futrob/scheduling";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  type ActorId,
  type AuthorizationPort,
  type Permission,
  type Result,
  type TeamId,
} from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { InMemoryCompetitionRepository } from "@/adapters/competitions/in-memory.repository.ts";
import { PostgresTransactionPort } from "@/adapters/persistence/pg-transaction.ts";
import { createSchedulingModule } from "@/di/scheduling.module.ts";
import {
  MIGRATIONS_DIRECTORY,
  createIsolatedSchema,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";
import { seedActors } from "@/testing/seed-actors.ts";
import { PostgresEncounterMutationLock } from "./encounter-mutation-lock.ts";
import { PostgresScheduleChangeRequestRepository } from "./schedule-change-request.repository.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const suite = describe.skipIf(!databaseUrl);

const organizationId = asOrganizationId("org-a");
const competitionId = asCompetitionId("comp-a");
const encounterId = asEncounterId("encounter-1");
const teamA = asTeamId("team-a");
const teamB = asTeamId("team-b");
const captainA = asActorId("captain-a");
const captainB = asActorId("captain-b");
const organizer = asActorId("organizer-1");

// America/Lima is UTC-5; the proposals are far in the future so the wall clock stays valid.
const D0 = "2099-10-10T20:00:00.000Z";
const D1 = "2099-10-11T20:00:00.000Z";
const D2 = "2099-10-12T20:00:00.000Z";
const limaThreePm = (day: number) => ({
  year: 2099,
  month: 10,
  day,
  hour: 15,
  minute: 0,
  second: 0,
});

const schemas: IsolatedSchema[] = [];

suite("schedule change negotiation on Postgres", () => {
  afterEach(async () => {
    for (const schema of schemas.splice(0)) await schema.drop();
  });

  it("keeps proposals, decisions, version and receipts across a reload and replays without appending", async () => {
    const pool = await migratedPool();
    const first = await negotiationModule(pool);
    const created = unwrap(await first.propose());
    const d1 = created.proposals[0].id;
    const countered = unwrap(await first.counter(captainB, teamB, { proposalId: d1, version: 1 }));
    const d2 = countered.request.proposals[1]?.id ?? "missing";
    const accepted = unwrap(
      await first.accept(
        captainA,
        { authority: "rival_team", teamId: teamA },
        { proposalId: d2, version: 2 },
      ),
    );
    expect(accepted.request.status).toBe("accepted");

    // A second repository instance reads only what Postgres kept.
    const reloaded = await new PostgresScheduleChangeRequestRepository(pool).findById(
      organizationId,
      created.id,
    );
    expect(reloaded).toMatchObject({ status: "accepted", version: 3 });
    expect(
      reloaded?.proposals.map((proposal) => ({
        id: proposal.id,
        at: proposal.proposedStartAt.toISOString(),
        team: proposal.proposedByTeamId,
      })),
    ).toEqual([
      { id: d1, at: D1, team: teamA },
      { id: d2, at: D2, team: teamB },
    ]);
    expect(reloaded?.decisions).toEqual([
      {
        id: accepted.receipt.decisionId,
        proposalId: d2,
        requestVersion: 2,
        kind: "consent",
        responder: { authority: "rival_team", teamId: teamA },
        actorId: captainA,
        reason: null,
        createdAt: accepted.receipt.occurredAt,
      },
    ]);
    const counterReceipt = await new PostgresScheduleChangeRequestRepository(
      pool,
    ).findCommandReceipt(organizationId, captainB, "counter-1");
    expect(counterReceipt).toMatchObject({
      id: countered.receipt.id,
      commandType: "counter",
      targetProposalId: d1,
      createdProposalId: d2,
      resultingVersion: 2,
      resultingStatus: "open",
    });

    // A fresh composition replays the counter: same receipt, no third proposal.
    const second = await negotiationModule(pool);
    const replay = unwrap(await second.counter(captainB, teamB, { proposalId: d1, version: 1 }));
    expect(replay.replayed).toBe(true);
    expect(replay.receipt.id).toBe(countered.receipt.id);
    // The request is accepted by now; the replay still reports what the counter produced.
    expect(replay.request).toMatchObject({ status: "open", version: 2, decisions: [] });
    expect(replay.request.proposals.map((proposal) => proposal.id)).toEqual([d1, d2]);
    expect(await count(pool, "schedule_change_proposals")).toBe(2);
    expect(await count(pool, "schedule_change_command_receipts")).toBe(2);

    const reused = await second.counter(captainB, teamB, { proposalId: d1, version: 1 }, 13);
    expect(errorCode(reused)).toBe("scheduling.schedule_change_idempotency_conflict");

    second.grants.revoke(captainB, ENCOUNTER_PERMISSION.rescheduleRequest, teamB);
    const revoked = await second.counter(captainB, teamB, { proposalId: d1, version: 1 });
    expect(errorCode(revoked)).toBe("authorization.forbidden");
  });

  it("rejects without touching the Encounter schedule and keeps the rejection on record", async () => {
    const pool = await migratedPool();
    const module = await negotiationModule(pool);
    const created = unwrap(await module.propose());

    const rejected = unwrap(
      await module.scheduling.rejectScheduleChangeProposal.execute({
        ...module.target,
        actorId: captainB,
        responder: { authority: "rival_team", teamId: teamB },
        requestId: created.id,
        proposalId: created.proposals[0].id,
        expectedVersion: 1,
        commandKey: "reject-1",
        reason: "Cannot play",
      }),
    );

    expect(rejected.request.status).toBe("rejected");
    const encounter = await module.scheduling.encounters.findById(encounterId);
    expect(encounter?.scheduledStartAt.toISOString()).toBe(D0);
    const stored = await new PostgresScheduleChangeRequestRepository(pool).findById(
      organizationId,
      created.id,
    );
    expect(stored?.decisions.map((decision) => [decision.kind, decision.reason])).toEqual([
      ["rejection", "Cannot play"],
    ]);
  });

  it("serializes concurrent consents so only one lands on a given version", async () => {
    const pool = await migratedPool();
    const module = await negotiationModule(pool, {
      requiresOpponentApproval: true,
      requiresOrganizerApproval: true,
    });
    const created = unwrap(await module.propose());
    const at = { proposalId: created.proposals[0].id, version: 1 };

    const results = await Promise.all([
      module.accept(captainB, { authority: "rival_team", teamId: teamB }, at),
      module.accept(organizer, { authority: "organizer" }, at),
    ]);

    expect(results.map((result) => (result.isOk() ? "ok" : result.error.code)).sort()).toEqual([
      "ok",
      "scheduling.schedule_change_version_conflict",
    ]);
    const stored = await new PostgresScheduleChangeRequestRepository(pool).findById(
      organizationId,
      created.id,
    );
    expect(stored).toMatchObject({ status: "open", version: 2 });
    expect(stored?.decisions).toHaveLength(1);
  });

  it("commits a transition only against the stored version", async () => {
    const pool = await migratedPool();
    const module = await negotiationModule(pool);
    const created = unwrap(await module.propose());
    const repository = new PostgresScheduleChangeRequestRepository(pool);
    const decision = {
      id: "decision-stale",
      proposalId: created.proposals[0].id,
      requestVersion: 1,
      kind: "consent" as const,
      responder: { authority: "rival_team" as const, teamId: teamB },
      actorId: captainB,
      reason: null,
      createdAt: new Date(D0),
    };
    const receipt = {
      id: "receipt-stale",
      organizationId,
      requestId: created.id,
      actorId: captainB,
      commandKey: "stale",
      commandType: "accept" as const,
      fingerprint: "{}",
      targetProposalId: created.proposals[0].id,
      resultingVersion: 3,
      resultingStatus: "accepted" as const,
      createdProposalId: null,
      decisionId: decision.id,
      occurredAt: new Date(D0),
    };

    const outcome = await repository.commit(
      {
        request: { ...created, status: "accepted", version: 3, decisions: [decision] },
        expectedVersion: 2,
        appendedProposal: null,
        appendedDecision: decision,
      },
      receipt,
    );

    expect(outcome).toEqual({ kind: "version_conflict", currentVersion: 1 });
    await expect(repository.findById(organizationId, created.id)).resolves.toMatchObject({
      status: "open",
      version: 1,
      decisions: [],
    });
    expect(await count(pool, "schedule_change_command_receipts")).toBe(0);
  });

  it("refuses to rewrite or delete proposal history directly", async () => {
    const pool = await migratedPool();
    const module = await negotiationModule(pool);
    const created = unwrap(await module.propose());

    await expect(
      pool.query(`UPDATE schedule_change_proposals SET reason = 'edited' WHERE id = $1`, [
        created.proposals[0].id,
      ]),
    ).rejects.toMatchObject({ code: "23001" });
    await expect(
      pool.query(`DELETE FROM schedule_change_proposals WHERE id = $1`, [created.proposals[0].id]),
    ).rejects.toMatchObject({ code: "23001" });
    const stored = await new PostgresScheduleChangeRequestRepository(pool).findById(
      organizationId,
      created.id,
    );
    expect(stored?.proposals[0]?.reason).toBe("Travel conflict");
  });

  it("upgrades a request created before 0048 to version 1 with no decisions", async () => {
    const schema = await createIsolatedSchema(requireUrl(), "sched_upgrade");
    schemas.push(schema);
    const before = await mkdtemp(join(tmpdir(), "futrob-migrations-"));
    try {
      for (const file of await readdir(MIGRATIONS_DIRECTORY)) {
        if (file.endsWith(".sql") && file < "0048") {
          await cp(join(MIGRATIONS_DIRECTORY, file), join(before, file));
        }
      }
      await migrateIsolatedSchema(schema.pool, before);
    } finally {
      await rm(before, { recursive: true, force: true });
    }
    await seed(schema.pool);
    await schema.pool.query(
      `INSERT INTO schedule_change_requests (
         id, organization_id, competition_id, encounter_id, requesting_team_id,
         initiated_by_actor_id, scope_type, official_slot, status, idempotency_key,
         created_at, updated_at
       ) VALUES ('legacy-1', $1, $2, $3, $4, $5, 'entire_encounter', NULL, 'open', 'legacy',
                 NOW(), NOW())`,
      [organizationId, competitionId, encounterId, teamA, captainA],
    );
    await schema.pool.query(
      `INSERT INTO schedule_change_proposals (
         id, request_id, organization_id, proposed_start_at, proposed_by_actor_id,
         proposed_by_team_id, reason, created_at, proposal_order
       ) VALUES ('legacy-p1', 'legacy-1', $1, $2, $3, $4, 'Legacy', NOW(), 1)`,
      [organizationId, D1, captainA, teamA],
    );

    await migrateIsolatedSchema(schema.pool);

    const upgraded = await new PostgresScheduleChangeRequestRepository(schema.pool).findById(
      organizationId,
      "legacy-1",
    );
    expect(upgraded).toMatchObject({ status: "open", version: 1, decisions: [] });
    expect(upgraded?.proposals.map((proposal) => proposal.id)).toEqual(["legacy-p1"]);

    const module = await negotiationModule(schema.pool);
    const accepted = unwrap(
      await module.accept(
        captainB,
        { authority: "rival_team", teamId: teamB },
        { proposalId: "legacy-p1", version: 1 },
        "legacy-1",
      ),
    );
    expect(accepted.request).toMatchObject({ status: "accepted", version: 2 });
  });
});

function requireUrl(): string {
  if (!databaseUrl) throw new Error("TEST_DATABASE_URL is required");
  return databaseUrl;
}

async function migratedPool(): Promise<Pool> {
  const schema = await createIsolatedSchema(requireUrl(), "sched_negotiation");
  schemas.push(schema);
  await migrateIsolatedSchema(schema.pool);
  await seed(schema.pool);
  return schema.pool;
}

async function seed(pool: Pool): Promise<void> {
  await seedActors(pool, captainA, captainB, organizer);
  await pool.query(
    `INSERT INTO organizations (
       id, name, normalized_name, slug, time_zone, created_at, created_by_actor_id
     ) VALUES ($1, 'Org A', 'org a', 'org-a', 'America/Lima', NOW(), $2)`,
    [organizationId, organizer],
  );
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
  await pool.query(
    `INSERT INTO encounter_schedule_snapshots (
       encounter_id, organization_id, competition_id, home_team_id, away_team_id,
       scheduled_start_at, official_match_count, stage_id
     ) VALUES ($1, $2, $3, $4, $5, $6, 2, 'stage-1')`,
    [encounterId, organizationId, competitionId, teamA, teamB, D0],
  );
}

async function count(pool: Pool, table: string): Promise<number> {
  const result = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::integer AS count FROM ${table}`,
  );
  return result.rows[0]?.count ?? 0;
}

class Grants implements AuthorizationPort {
  private readonly grants = new Set<string>();

  allow(actorId: ActorId, permission: Permission, teamId: TeamId | "*" = "*") {
    this.grants.add(`${actorId}|${permission}|${teamId}`);
  }

  revoke(actorId: ActorId, permission: Permission, teamId: TeamId | "*" = "*") {
    this.grants.delete(`${actorId}|${permission}|${teamId}`);
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

async function negotiationModule(
  pool: Pool,
  approvals = { requiresOpponentApproval: true, requiresOrganizerApproval: false },
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
  await competitions.saveDraft(competitionDraft(approvals));
  const scheduling = createSchedulingModule({
    pool,
    authorization: grants,
    participants: { isApprovedParticipant: async () => true },
    fixtureSource: { load: async () => null },
    eventPublisher: { publish: async () => undefined, publishMany: async () => undefined },
    transaction: new PostgresTransactionPort(pool),
    officialResults: { findApprovedByEncounter: async () => null },
    officialSelections: { findLatestByEncounter: async () => null },
    encounterMutationLock: new PostgresEncounterMutationLock(pool),
    competitions,
  });
  const target = { organizationId, competitionId, encounterId };

  return {
    grants,
    scheduling,
    target,
    async propose() {
      return scheduling.createScheduleChangeRequest.execute({
        ...target,
        actorId: captainA,
        requestingTeamId: teamA,
        scope: { type: "entire_encounter" },
        timeZone: "America/Lima",
        proposedWallTime: limaThreePm(11),
        reason: "Travel conflict",
        idempotencyKey: "create-1",
      });
    },
    async counter(
      actorId: ActorId,
      teamId: TeamId,
      at: { proposalId: string; version: number },
      day = 12,
    ) {
      const request = await scheduling.scheduleChangeRequests.findByIdempotencyKey(
        organizationId,
        "create-1",
      );
      return scheduling.counterScheduleChangeProposal.execute({
        ...target,
        actorId,
        teamId,
        requestId: request?.id ?? "missing",
        proposalId: at.proposalId,
        expectedVersion: at.version,
        commandKey: "counter-1",
        timeZone: "America/Lima",
        proposedWallTime: limaThreePm(day),
        reason: "Stadium unavailable",
      });
    },
    async accept(
      actorId: ActorId,
      responder: ScheduleChangeResponder,
      at: { proposalId: string; version: number },
      requestId?: string,
    ) {
      const request = requestId
        ? { id: requestId }
        : await scheduling.scheduleChangeRequests.findByIdempotencyKey(organizationId, "create-1");
      return scheduling.acceptScheduleChangeProposal.execute({
        ...target,
        actorId,
        responder,
        requestId: request?.id ?? "missing",
        proposalId: at.proposalId,
        expectedVersion: at.version,
        commandKey: `accept-${actorId}`,
      });
    },
  };
}

function competitionDraft(approvals: {
  readonly requiresOpponentApproval: boolean;
  readonly requiresOrganizerApproval: boolean;
}): CompetitionDraft {
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
        rescheduleRequiresOpponentApproval: approvals.requiresOpponentApproval,
        rescheduleRequiresOrganizerApproval: approvals.requiresOrganizerApproval,
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
