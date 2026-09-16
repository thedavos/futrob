import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  ScheduleChangeRequestIdempotencyConflict,
  ScheduleChangeRequestNotFound,
  type ScheduleChangeRequest,
} from "@futrob/scheduling";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
} from "@futrob/shared-kernel";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { Pool, type PoolClient } from "pg";
import { PostgresEncounterScheduleRepository } from "./encounter-schedule.repository.ts";
import { PostgresScheduleChangeRequestRepository } from "./schedule-change-request.repository.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const suite = describe.skipIf(!databaseUrl);
const schemas: string[] = [];

const organizationId = asOrganizationId("org-a");
const otherOrganizationId = asOrganizationId("org-b");
const competitionId = asCompetitionId("comp-a");
const otherCompetitionId = asCompetitionId("comp-b");
const encounterId = asEncounterId("encounter-1");
const secondEncounterId = asEncounterId("encounter-2");
const otherOrgEncounterId = asEncounterId("encounter-org-b-1");
const homeTeamId = asTeamId("team-home-a");
const awayTeamId = asTeamId("team-away-a");
const otherHomeTeamId = asTeamId("team-home-b");
const otherAwayTeamId = asTeamId("team-away-b");
const actorId = asActorId("captain-1");
const now = new Date("2026-09-14T20:00:00.000Z");

suite("0037 schedule change requests migration", () => {
  afterEach(async () => {
    const pool = new Pool({ connectionString: databaseUrl });
    try {
      for (const schema of schemas.splice(0)) {
        await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      }
    } finally {
      await pool.end();
    }
  });

  it("applies from a clean database", async () => {
    await withSchema(async (client) => {
      await applyMigrations(client);
      const result = await client.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = current_schema()
           AND table_name IN ('schedule_change_requests', 'schedule_change_proposals')
         ORDER BY table_name`,
      );
      expect(result.rows.map((row) => row.table_name)).toEqual([
        "schedule_change_proposals",
        "schedule_change_requests",
      ]);
      const foreignKeys = await client.query(
        `SELECT constraint_name FROM information_schema.table_constraints
         WHERE table_schema = current_schema()
           AND table_name = 'schedule_change_requests'
           AND constraint_type = 'FOREIGN KEY'
         ORDER BY constraint_name`,
      );
      expect(foreignKeys.rows.map((row) => row.constraint_name)).toEqual(
        expect.arrayContaining(["schedule_change_requests_encounter_snapshot_fkey"]),
      );
    });
  });

  it("enforces tenant idempotency and active-scope uniqueness", async () => {
    await withSchema(async (client) => {
      await applyMigrations(client);
      await seedTenants(client);
      await insertRequest(client, {
        id: "req-a",
        organizationId,
        competitionId,
        encounterId,
        teamId: homeTeamId,
        scopeType: "entire_encounter",
        officialSlot: null,
        idempotencyKey: "idem-shared",
      });

      await expect(
        insertRequest(client, {
          id: "req-a-duplicate-key",
          organizationId,
          competitionId,
          encounterId: secondEncounterId,
          teamId: awayTeamId,
          scopeType: "entire_encounter",
          officialSlot: null,
          idempotencyKey: "idem-shared",
        }),
      ).rejects.toMatchObject({ code: "23505" });

      await expect(
        insertRequest(client, {
          id: "req-b",
          organizationId: otherOrganizationId,
          competitionId: otherCompetitionId,
          encounterId: otherOrgEncounterId,
          teamId: otherHomeTeamId,
          scopeType: "entire_encounter",
          officialSlot: null,
          idempotencyKey: "idem-shared",
        }),
      ).resolves.toBeUndefined();

      await expect(
        insertRequest(client, {
          id: "req-slot-on-entire",
          organizationId,
          competitionId,
          encounterId,
          teamId: awayTeamId,
          scopeType: "official_match",
          officialSlot: 1,
          idempotencyKey: "idem-slot",
        }),
      ).rejects.toMatchObject({ code: "23505" });
    });
  });

  it("allows two open OfficialMatch slots and rejects a second request for the same slot", async () => {
    await withSchema(async (client) => {
      await applyMigrations(client);
      await seedTenants(client);
      await insertRequest(client, {
        id: "req-slot-1",
        organizationId,
        competitionId,
        encounterId,
        teamId: homeTeamId,
        scopeType: "official_match",
        officialSlot: 1,
        idempotencyKey: "idem-slot-1",
      });
      await expect(
        insertRequest(client, {
          id: "req-slot-2",
          organizationId,
          competitionId,
          encounterId,
          teamId: awayTeamId,
          scopeType: "official_match",
          officialSlot: 2,
          idempotencyKey: "idem-slot-2",
        }),
      ).resolves.toBeUndefined();
      await expect(
        insertRequest(client, {
          id: "req-slot-1-again",
          organizationId,
          competitionId,
          encounterId,
          teamId: awayTeamId,
          scopeType: "official_match",
          officialSlot: 1,
          idempotencyKey: "idem-slot-1-again",
        }),
      ).rejects.toMatchObject({ code: "23505" });
    });
  });

  it("persists and isolates requests through the Postgres adapter", async () => {
    await withPool(async (pool) => {
      const repository = new PostgresScheduleChangeRequestRepository(pool);
      const home = adapterRequest({
        id: "req-a",
        organizationId,
        competitionId,
        idempotencyKey: "idem-a",
        teamId: homeTeamId,
      });
      const away = adapterRequest({
        id: "req-b",
        organizationId: otherOrganizationId,
        competitionId: otherCompetitionId,
        encounterId: otherOrgEncounterId,
        idempotencyKey: "idem-a",
        teamId: otherHomeTeamId,
      });
      await repository.save(home);
      await repository.save(away);

      await expect(repository.findByIdempotencyKey(organizationId, "idem-a")).resolves.toEqual(
        home,
      );
      await expect(repository.findByIdempotencyKey(otherOrganizationId, "idem-a")).resolves.toEqual(
        away,
      );
      await expect(repository.listActiveByEncounter(organizationId, encounterId)).resolves.toEqual([
        home,
      ]);
      await expect(
        repository.listActiveByEncounter(otherOrganizationId, otherOrgEncounterId),
      ).resolves.toEqual([away]);

      const [homeProposal] = home.proposals;
      const accepted: ScheduleChangeRequest = {
        ...home,
        id: "req-accepted",
        status: "accepted",
        idempotencyKey: "idem-accepted",
        proposals: [{ ...homeProposal, id: "req-accepted-proposal" }],
      };
      await repository.save(accepted);
      await expect(
        repository.countAcceptedByTeam({
          organizationId,
          competitionId,
          encounterId,
          teamId: homeTeamId,
        }),
      ).resolves.toBe(1);
    });
  });

  it("maps a reused organization idempotency key on a different Encounter to a domain conflict", async () => {
    await withPool(async (pool) => {
      const repository = new PostgresScheduleChangeRequestRepository(pool);
      await repository.save(
        adapterRequest({
          id: "req-first",
          organizationId,
          competitionId,
          encounterId,
          idempotencyKey: "idem-shared",
          teamId: homeTeamId,
        }),
      );

      await expect(
        repository.save(
          adapterRequest({
            id: "req-second-encounter",
            organizationId,
            competitionId,
            encounterId: secondEncounterId,
            idempotencyKey: "idem-shared",
            teamId: awayTeamId,
          }),
        ),
      ).rejects.toBeInstanceOf(ScheduleChangeRequestIdempotencyConflict);
      await expect(
        repository.findByIdempotencyKey(organizationId, "idem-shared"),
      ).resolves.toMatchObject({ id: "req-first", encounterId });
    });
  });

  it("refuses to save an open request without an encounter snapshot", async () => {
    await withPool(async (pool) => {
      const repository = new PostgresScheduleChangeRequestRepository(pool);
      const missingEncounterId = asEncounterId("missing-encounter");
      await expect(
        repository.save(
          adapterRequest({
            id: "req-orphan",
            organizationId,
            competitionId,
            encounterId: missingEncounterId,
            idempotencyKey: "idem-orphan",
            teamId: homeTeamId,
          }),
        ),
      ).rejects.toBeInstanceOf(ScheduleChangeRequestNotFound);
      await expect(
        repository.findByIdempotencyKey(organizationId, "idem-orphan"),
      ).resolves.toBeNull();
    });
  });

  it("cascades open requests when the encounter snapshot is deleted", async () => {
    await withPool(async (pool) => {
      const repository = new PostgresScheduleChangeRequestRepository(pool);
      const encounters = new PostgresEncounterScheduleRepository(pool);
      await repository.save(
        adapterRequest({
          id: "req-open",
          organizationId,
          competitionId,
          encounterId,
          idempotencyKey: "idem-open",
          teamId: homeTeamId,
        }),
      );

      await encounters.deleteByEncounterIds([encounterId]);

      await expect(
        repository.findByIdempotencyKey(organizationId, "idem-open"),
      ).resolves.toBeNull();
      await expect(repository.listActiveByEncounter(organizationId, encounterId)).resolves.toEqual(
        [],
      );
    });
  });
});

function adapterRequest(input: {
  readonly id: string;
  readonly organizationId: ReturnType<typeof asOrganizationId>;
  readonly competitionId: ReturnType<typeof asCompetitionId>;
  readonly encounterId?: ReturnType<typeof asEncounterId>;
  readonly idempotencyKey: string;
  readonly teamId: ReturnType<typeof asTeamId>;
}): ScheduleChangeRequest {
  return {
    id: input.id,
    organizationId: input.organizationId,
    competitionId: input.competitionId,
    encounterId: input.encounterId ?? encounterId,
    requestingTeamId: input.teamId,
    initiatedByActorId: actorId,
    scope: { type: "entire_encounter" },
    status: "open",
    proposals: [
      {
        id: `${input.id}-proposal`,
        proposedStartAt: new Date("2026-09-21T21:30:00.000Z"),
        proposedByActorId: actorId,
        proposedByTeamId: input.teamId,
        reason: "Team travel conflict",
        createdAt: now,
      },
    ],
    idempotencyKey: input.idempotencyKey,
    createdAt: now,
    updatedAt: now,
  };
}

async function insertRequest(
  client: PoolClient,
  input: {
    readonly id: string;
    readonly organizationId: string;
    readonly competitionId: string;
    readonly encounterId: string;
    readonly teamId: string;
    readonly scopeType: "entire_encounter" | "official_match";
    readonly officialSlot: 1 | 2 | null;
    readonly idempotencyKey: string;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO schedule_change_requests (
       id, organization_id, competition_id, encounter_id, requesting_team_id,
       initiated_by_actor_id, scope_type, official_slot, status, idempotency_key,
       created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', $9, $10, $10)`,
    [
      input.id,
      input.organizationId,
      input.competitionId,
      input.encounterId,
      input.teamId,
      actorId,
      input.scopeType,
      input.officialSlot,
      input.idempotencyKey,
      now.toISOString(),
    ],
  );
}

async function seedTenants(client: PoolClient): Promise<void> {
  await insertOrganization(client, organizationId, "Org A");
  await insertOrganization(client, otherOrganizationId, "Org B");
  await insertCompetition(client, organizationId, competitionId);
  await insertCompetition(client, otherOrganizationId, otherCompetitionId);
  await insertTeam(client, homeTeamId, organizationId, "Home A");
  await insertTeam(client, awayTeamId, organizationId, "Away A");
  await insertTeam(client, otherHomeTeamId, otherOrganizationId, "Home B");
  await insertTeam(client, otherAwayTeamId, otherOrganizationId, "Away B");
  await insertSnapshot(client, {
    encounterId,
    organizationId,
    competitionId,
    homeTeamId,
    awayTeamId,
  });
  await insertSnapshot(client, {
    encounterId: secondEncounterId,
    organizationId,
    competitionId,
    homeTeamId,
    awayTeamId,
  });
  await insertSnapshot(client, {
    encounterId: otherOrgEncounterId,
    organizationId: otherOrganizationId,
    competitionId: otherCompetitionId,
    homeTeamId: otherHomeTeamId,
    awayTeamId: otherAwayTeamId,
  });
}

async function insertSnapshot(
  client: PoolClient,
  input: {
    readonly encounterId: string;
    readonly organizationId: string;
    readonly competitionId: string;
    readonly homeTeamId: string;
    readonly awayTeamId: string;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO encounter_schedule_snapshots (
       encounter_id, organization_id, competition_id, home_team_id, away_team_id,
       scheduled_start_at, official_match_count
     ) VALUES ($1, $2, $3, $4, $5, $6, 2)`,
    [
      input.encounterId,
      input.organizationId,
      input.competitionId,
      input.homeTeamId,
      input.awayTeamId,
      now.toISOString(),
    ],
  );
}

async function insertOrganization(client: PoolClient, id: string, name: string): Promise<void> {
  await client.query(
    `INSERT INTO organizations (
       id, name, normalized_name, created_at, created_by_actor_id
     ) VALUES ($1, $2, $3, NOW(), 'organizer')`,
    [id, name, name.toLowerCase()],
  );
}

async function insertCompetition(client: PoolClient, orgId: string, id: string): Promise<void> {
  await client.query(
    `INSERT INTO competitions (
       id, organization_id, name, status, modality, game_edition, platform,
       region, time_zone, format, created_by_actor_id, created_at, updated_at
     ) VALUES (
       $1, $2, $1, 'published', 'fc-clubs', 'fc26', 'playstation',
       'south-america', 'America/Lima', 'league', 'organizer', NOW(), NOW()
     )`,
    [id, orgId],
  );
}

async function insertTeam(
  client: PoolClient,
  id: string,
  orgId: string,
  name: string,
): Promise<void> {
  await client.query(
    `INSERT INTO teams (
       id, organization_id, name, created_at, created_by_actor_id
     ) VALUES ($1, $2, $3, NOW(), 'organizer')`,
    [id, orgId, name],
  );
}

async function withSchema(run: (client: PoolClient) => Promise<void>): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  const schema = `schedule_change_${randomUUID().replaceAll("-", "")}`;
  schemas.push(schema);
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    await run(client);
  } finally {
    client.release();
    await pool.end();
  }
}

async function withPool(run: (pool: Pool) => Promise<void>): Promise<void> {
  const admin = new Pool({ connectionString: databaseUrl });
  const client = await admin.connect();
  const schema = `schedule_change_pool_${randomUUID().replaceAll("-", "")}`;
  schemas.push(schema);
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    await applyMigrations(client);
    await seedTenants(client);
  } finally {
    client.release();
    await admin.end();
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    options: `-c search_path=${schema}`,
  });
  try {
    await run(pool);
  } finally {
    await pool.end();
  }
}

async function applyMigrations(client: PoolClient): Promise<void> {
  const directory = resolve(import.meta.dirname, "../../../migrations");
  const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    await client.query(await readFile(resolve(directory, file), "utf8"));
  }
}
