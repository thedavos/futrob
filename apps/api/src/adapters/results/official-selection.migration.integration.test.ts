import { copyFile, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { asEncounterId } from "@futrob/shared-kernel";
import type { Pool } from "pg";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { runMigrations } from "@/adapters/persistence/migration-runner.ts";
import {
  createIsolatedSchema,
  MIGRATIONS_DIRECTORY,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";
import { seedActors } from "@/testing/seed-actors.ts";
import { PostgresOfficialMatchSelectionRepository } from "./official-result.repository.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const suite = describe.skipIf(!databaseUrl);
// Every case applies migrations to a possibly remote database, one round trip each.
const TEST_TIMEOUT_MS = 300_000;

const isolatedSchemas: IsolatedSchema[] = [];
const tempDirectories: string[] = [];

const NEW_TABLES = [
  "official_selection_proposals",
  "official_selection_actions",
  "match_disputes",
  "official_selection_reference_claims",
  "encounter_candidates",
  "encounter_candidate_sets",
];

suite("0045/0046 official selection and candidate migrations", () => {
  afterEach(async () => {
    for (const isolated of isolatedSchemas.splice(0)) await isolated.drop();
    for (const directory of tempDirectories.splice(0)) {
      await rm(directory, { recursive: true, force: true });
    }
  }, TEST_TIMEOUT_MS);

  it(
    "applies on a clean database and is a no-op the second time",
    async () => {
      const { pool } = await newSchema();
      const client = await pool.connect();
      try {
        const first = await runMigrations(client, { directory: MIGRATIONS_DIRECTORY });
        expect(first.applied).toHaveLength(first.total);
        expect(first.applied).toEqual(
          expect.arrayContaining([
            "0045_official_selection_disputes.sql",
            "0046_encounter_candidates.sql",
          ]),
        );
        for (const table of NEW_TABLES) expect(await tableExists(pool, table)).toBe(true);

        const second = await runMigrations(client, { directory: MIGRATIONS_DIRECTORY });
        expect(second.applied).toEqual([]);
      } finally {
        client.release();
      }
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "upgrades from 0044 and backfills legacy selections",
    async () => {
      const { pool } = await newSchema();
      const client = await pool.connect();
      try {
        const before = await copyMigrationsUpTo(44);
        const first = await runMigrations(client, { directory: before });
        expect(first.applied.at(-1)).toBe("0044_actor_foreign_keys.sql");

        await seedLegacyData(pool);

        const upgraded = await runMigrations(client, { directory: MIGRATIONS_DIRECTORY });
        expect(upgraded.applied).toEqual([
          "0045_official_selection_disputes.sql",
          "0045_organization_profile.sql",
          "0046_encounter_candidates.sql",
          "0047_team_performance_rankings.sql",
          "0048_schedule_change_negotiation.sql",
          "0049_provider_sync_ingestion_checkpoint.sql",
          "0051_official_selection_confirmation_deadlines.sql",
        ]);
      } finally {
        client.release();
      }

      await expectBackfilledLegacyData(pool);

      // The upgrade file is also safe to replay by hand.
      const replay = await readFile(
        resolve(MIGRATIONS_DIRECTORY, "0045_official_selection_disputes.sql"),
        "utf8",
      );
      const before = await snapshotCounts(pool);
      await pool.query(replay);
      expect(await snapshotCounts(pool)).toEqual(before);

      const repository = new PostgresOfficialMatchSelectionRepository(pool);
      const review = await repository.findLatestByEncounter(asEncounterId("enc-awaiting"));
      expect(review).toMatchObject({
        id: "sel-awaiting",
        status: "organizer_review",
        version: 1,
        round: 1,
        currentProposalId: "legacy:sel-awaiting",
      });
      await expect(repository.listProposals("sel-awaiting")).resolves.toHaveLength(1);
      await expect(repository.listActions(asEncounterId("enc-awaiting"))).resolves.toMatchObject([
        { type: "legacy_review_required", capacity: "system" },
      ]);
      await expect(
        repository.findLatestByEncounter(asEncounterId("enc-orphan")),
      ).resolves.toBeNull();
    },
    TEST_TIMEOUT_MS,
  );
});

async function newSchema(): Promise<IsolatedSchema> {
  const isolated = await createIsolatedSchema(databaseUrl!, "selection_migration");
  isolatedSchemas.push(isolated);
  return isolated;
}

async function copyMigrationsUpTo(last: number): Promise<string> {
  const directory = await mkdtemp(resolve(tmpdir(), "futrob-migrations-"));
  tempDirectories.push(directory);
  for (const file of await readdir(MIGRATIONS_DIRECTORY)) {
    if (file.endsWith(".sql") && Number.parseInt(file.slice(0, 4), 10) <= last) {
      await copyFile(resolve(MIGRATIONS_DIRECTORY, file), resolve(directory, file));
    }
  }
  return directory;
}

async function tableExists(pool: Pool, table: string): Promise<boolean> {
  const result = await pool.query("SELECT to_regclass($1) IS NOT NULL AS present", [table]);
  return result.rows[0].present === true;
}

function slots(...externalIds: string[]): string {
  return JSON.stringify(
    externalIds.map((externalId, index) => ({
      officialSlot: index + 1,
      providerMatchRef: { providerKey: "ea-clubs", externalId },
    })),
  );
}

const hoursAgo = (hours: number) =>
  new Date(Date.parse("2026-09-14T20:00:00.000Z") - hours * 3_600_000);

async function seedLegacyData(pool: Pool): Promise<void> {
  await seedActors(pool, "legacy-proposer", "tenant-organizer");
  // This fixture intentionally targets 0044, before organization profile columns exist.
  for (const [organizationId, competitionId] of [
    ["org-1", "comp-1"],
    ["org-2", "comp-2"],
  ]) {
    await pool.query(
      `INSERT INTO organizations (id, name, normalized_name, created_at, created_by_actor_id)
       VALUES ($1, $1, $1, NOW(), 'tenant-organizer')`,
      [organizationId],
    );
    await pool.query(
      `INSERT INTO competitions (
         id, organization_id, name, status, modality, game_edition, platform,
         region, time_zone, format, created_by_actor_id, created_at, updated_at
       ) VALUES ($1, $2, $1, 'published', 'fc-clubs', 'fc26', 'playstation',
         'south-america', 'America/Lima', 'league', 'tenant-organizer', NOW(), NOW())`,
      [competitionId, organizationId],
    );
  }
  for (const [teamId, organizationId] of [
    ["team-1", "org-1"],
    ["team-2", "org-1"],
    ["team-3", "org-2"],
    ["team-4", "org-2"],
  ] as const) {
    await pool.query(
      `INSERT INTO teams (id, organization_id, name, created_at, created_by_actor_id)
       VALUES ($1, $2, $1, NOW(), 'legacy-proposer')`,
      [teamId, organizationId],
    );
  }
  const encounters: ReadonlyArray<readonly [string, string, string, string, string]> = [
    ["enc-history", "org-1", "comp-1", "team-1", "team-2"],
    ["enc-awaiting", "org-1", "comp-1", "team-1", "team-2"],
    ["enc-approved", "org-1", "comp-1", "team-1", "team-2"],
    ["enc-voided", "org-1", "comp-1", "team-1", "team-2"],
    ["enc-duplicate", "org-1", "comp-1", "team-1", "team-2"],
    ["enc-other-org", "org-2", "comp-2", "team-3", "team-4"],
  ];
  for (const [encounterId, organizationId, competitionId, home, away] of encounters) {
    await pool.query(
      `INSERT INTO encounter_schedule_snapshots (
         encounter_id, organization_id, competition_id, home_team_id, away_team_id,
         scheduled_start_at, official_match_count
       ) VALUES ($1, $2, $3, $4, $5, NOW(), 2)`,
      [encounterId, organizationId, competitionId, home, away],
    );
  }

  // [id, encounter, status, hours ago, refs]. `enc-orphan` has no schedule snapshot.
  const selections: ReadonlyArray<readonly [string, string, string, number, string[]]> = [
    ["sel-history-old", "enc-history", "awaiting_opponent_confirmation", 9, ["r1"]],
    ["sel-history-mid", "enc-history", "confirmed", 8, ["r2"]],
    ["sel-history-new", "enc-history", "confirmed", 7, ["r3"]],
    ["sel-awaiting", "enc-awaiting", "awaiting_opponent_confirmation", 3, ["r4", "r5"]],
    ["sel-approved", "enc-approved", "approved", 5, ["r6", "r7"]],
    ["sel-voided", "enc-voided", "voided", 2, ["r8"]],
    ["sel-orphan", "enc-orphan", "awaiting_opponent_confirmation", 1, ["r9"]],
    ["sel-duplicate", "enc-duplicate", "confirmed", 4, ["r6", "r10", "r11"]],
    ["sel-other-org", "enc-other-org", "confirmed", 6, ["r10"]],
  ];
  for (const [id, encounterId, status, hours, refs] of selections) {
    await pool.query(
      `INSERT INTO official_match_selections (
         id, encounter_id, status, proposed_by_actor_id, proposed_at, slots
       ) VALUES ($1, $2, $3, 'legacy-proposer', $4, $5::jsonb)`,
      [id, encounterId, status, hoursAgo(hours).toISOString(), slots(...refs)],
    );
  }
}

async function snapshotCounts(pool: Pool): Promise<Record<string, number>> {
  const result = await pool.query(
    `SELECT
       (SELECT count(*) FROM official_match_selections) AS selections,
       (SELECT count(*) FROM official_match_selections WHERE superseded_at IS NULL) AS live,
       (SELECT count(*) FROM official_selection_proposals) AS proposals,
       (SELECT count(*) FROM official_selection_actions) AS actions,
       (SELECT count(*) FROM official_selection_reference_claims) AS claims`,
  );
  return Object.fromEntries(
    Object.entries(result.rows[0] as Record<string, string>).map(([key, value]) => [
      key,
      Number(value),
    ]),
  );
}

async function expectBackfilledLegacyData(pool: Pool): Promise<void> {
  const selections = await pool.query(
    `SELECT id, status, organization_id, competition_id, version, round, current_proposal_id,
            created_at, updated_at, proposed_at, superseded_at
     FROM official_match_selections ORDER BY id`,
  );
  const byId = new Map(selections.rows.map((row) => [row.id as string, row]));
  const live = (id: string) => byId.get(id)?.superseded_at === null;

  // Several rows for one encounter: only the most recent stays live.
  expect(live("sel-history-new")).toBe(true);
  expect(live("sel-history-mid")).toBe(false);
  expect(live("sel-history-old")).toBe(false);
  // Without a schedule snapshot there is no tenant, so the row is superseded.
  expect(live("sel-orphan")).toBe(false);
  expect(byId.get("sel-orphan")?.organization_id).toBeNull();
  for (const id of [
    "sel-awaiting",
    "sel-approved",
    "sel-voided",
    "sel-duplicate",
    "sel-other-org",
  ]) {
    expect(live(id)).toBe(true);
  }

  const historyNew = byId.get("sel-history-new");
  expect(historyNew).toMatchObject({
    organization_id: "org-1",
    competition_id: "comp-1",
    version: 1,
    round: 1,
    status: "confirmed",
    current_proposal_id: "legacy:sel-history-new",
  });
  expect(historyNew?.created_at).toEqual(historyNew?.proposed_at);
  expect(historyNew?.updated_at).toEqual(historyNew?.proposed_at);
  expect(byId.get("sel-other-org")?.organization_id).toBe("org-2");
  expect(byId.get("sel-approved")?.status).toBe("approved");
  expect(byId.get("sel-voided")?.status).toBe("voided");
  // Superseded rows get no proposal pointer.
  expect(byId.get("sel-history-old")?.current_proposal_id).toBeNull();

  // The proposer's Team is unknown, so the pending confirmation goes to an organizer.
  expect(byId.get("sel-awaiting")).toMatchObject({
    status: "organizer_review",
    current_proposal_id: "legacy:sel-awaiting",
    version: 1,
  });

  const proposals = await pool.query(
    `SELECT id, selection_id, sequence, round, proposing_team_id, proposed_by_actor_id, slots
     FROM official_selection_proposals ORDER BY id`,
  );
  expect(proposals.rows.map((row) => row.id)).toEqual([
    "legacy:sel-approved",
    "legacy:sel-awaiting",
    "legacy:sel-duplicate",
    "legacy:sel-history-new",
    "legacy:sel-other-org",
    "legacy:sel-voided",
  ]);
  for (const row of proposals.rows) {
    expect(row).toMatchObject({
      sequence: 1,
      round: 1,
      proposing_team_id: null,
      proposed_by_actor_id: "legacy-proposer",
    });
  }
  expect(proposals.rows.find((row) => row.id === "legacy:sel-approved")?.slots).toEqual(
    JSON.parse(slots("r6", "r7")),
  );

  const actions = await pool.query(
    `SELECT selection_id, proposal_id, action_type, from_status, to_status, version_before,
            version_after, actor_id, team_id, capacity, reason
     FROM official_selection_actions`,
  );
  expect(actions.rows).toHaveLength(1);
  expect(actions.rows[0]).toMatchObject({
    selection_id: "sel-awaiting",
    proposal_id: "legacy:sel-awaiting",
    action_type: "legacy_review_required",
    from_status: "awaiting_opponent_confirmation",
    to_status: "organizer_review",
    version_before: 1,
    version_after: 1,
    actor_id: "legacy-proposer",
    team_id: null,
    capacity: "system",
  });
  expect(actions.rows[0].reason).toEqual(expect.any(String));

  // Live, non-voided selections own their references; the earliest selection wins a duplicate.
  const claims = await pool.query(
    `SELECT external_match_id, selection_id, organization_id, released_at
     FROM official_selection_reference_claims ORDER BY external_match_id`,
  );
  expect(
    claims.rows.map((row) => [row.external_match_id, row.selection_id, row.released_at]),
  ).toEqual([
    ["r10", "sel-other-org", null],
    ["r11", "sel-duplicate", null],
    ["r3", "sel-history-new", null],
    ["r4", "sel-awaiting", null],
    ["r5", "sel-awaiting", null],
    ["r6", "sel-approved", null],
    ["r7", "sel-approved", null],
  ]);

  // The new invariants hold on the migrated data.
  await expect(
    pool.query(
      `INSERT INTO official_match_selections (id, encounter_id, status, organization_id,
         competition_id, created_at, updated_at)
       VALUES ('sel-second-live', 'enc-history', 'confirmed', 'org-1', 'comp-1', NOW(), NOW())`,
    ),
  ).rejects.toMatchObject({ code: "23505" });
  await expect(
    pool.query(
      `INSERT INTO official_match_selections (id, encounter_id, status, created_at, updated_at)
       VALUES ('sel-no-tenant', 'enc-x', 'confirmed', NOW(), NOW())`,
    ),
  ).rejects.toMatchObject({ code: "23514" });
  await expect(
    pool.query(
      `INSERT INTO official_selection_reference_claims (
         id, provider_key, external_match_id, selection_id, organization_id, competition_id,
         encounter_id, claimed_at
       ) VALUES ('claim-dup', 'ea-clubs', 'r6', 'sel-duplicate', 'org-1', 'comp-1',
         'enc-duplicate', NOW())`,
    ),
  ).rejects.toMatchObject({ code: "23505" });
}
