import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vite-plus/test";
import { asCompetitionId, asOrganizationId } from "@futrob/shared-kernel";
import { PostgresOrganizationRepository } from "@/adapters/organizations/postgres-organization.repository.ts";
import { seedActors } from "@/testing/seed-actors.ts";
import { PostgresCompetitionDiscoveryReader } from "./postgres-discovery.reader.ts";
import { encodeDiscoveryCursor } from "./discovery-cursor.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
// Applies every migration to a possibly remote database (one round trip per statement).
const MIGRATION_HOOK_TIMEOUT_MS = 120_000;
const schema = `discovery_${randomUUID().replaceAll("-", "")}`;
const admin = new Pool({ connectionString: databaseUrl });
const pool = new Pool({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
const reader = new PostgresCompetitionDiscoveryReader(pool);

describe.skipIf(!databaseUrl)("competition discovery Postgres", () => {
  beforeAll(async () => {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    const directory = resolve(import.meta.dirname, "../../../migrations");
    const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
    for (const file of files) await pool.query(await readFile(resolve(directory, file), "utf8"));
    await seedActors(pool, "actor");
    await pool.query(`
      INSERT INTO organizations (id, name, normalized_name, created_at, created_by_actor_id)
      VALUES ('org-1', 'First', 'first', NOW(), 'actor'), ('org-2', 'Second', 'second', NOW(), 'actor');
      INSERT INTO competitions (id, organization_id, name, status, modality, game_edition,
        platform, region, time_zone, format, created_by_actor_id, created_at, updated_at)
      VALUES
        ('c-3', 'org-1', 'Alpha', 'registration', 'fc-clubs', 'fc26', 'pc', 'america',
         'America/Lima', 'league', 'actor', NOW(), '2026-09-01T12:00:00.000003Z'),
        ('c-2', 'org-2', 'Beta', 'published', 'fc-clubs', 'fc26', 'pc', 'america',
         'America/Lima', 'league', 'actor', NOW(), '2026-09-01T12:00:00.000002Z'),
        ('c-1', 'org-1', 'Copa 100%', 'finished', 'fc-clubs', 'fc26', 'pc', 'america',
         'America/Lima', 'knockout', 'actor', NOW(), '2026-09-01T12:00:00.000001Z'),
        ('private', 'org-1', 'Hidden', 'draft', 'fc-clubs', 'fc26', 'pc', 'america',
         'America/Lima', 'league', 'actor', NOW(), NOW());
      INSERT INTO teams (id, organization_id, name, created_at, created_by_actor_id)
      VALUES ('t-1', 'org-1', 'One', NOW(), 'actor'), ('t-2', 'org-1', 'Two', NOW(), 'actor'),
             ('foreign', 'org-2', 'Foreign', NOW(), 'actor');
      INSERT INTO competition_entries (id, organization_id, competition_id, team_id, status, created_at)
      VALUES ('e-1', 'org-1', 'c-3', 't-1', 'approved', NOW()),
             ('e-2', 'org-1', 'c-3', 't-2', 'pending', NOW()),
             ('foreign', 'org-2', 'c-3', 'foreign', 'approved', NOW());
    `);
  }, MIGRATION_HOOK_TIMEOUT_MS);

  afterAll(async () => {
    await pool.end();
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.end();
  });

  it.each(["updated-desc", "name-asc"] as const)(
    "keeps total and every row across %s pages",
    async (sort) => {
      const ids: string[] = [];
      let cursor: string | undefined;
      do {
        const page = await reader.list({ sort, limit: 1, cursor });
        expect(page.total).toBe(3);
        ids.push(...page.items.map((item) => item.competition.id));
        cursor = page.nextCursor ?? undefined;
      } while (cursor && ids.length < 5);
      expect(ids).toEqual(["c-3", "c-2", "c-1"]);
    },
  );

  it("keeps the filtered total even beyond the last page", async () => {
    const page = await reader.list({
      sort: "name-asc",
      limit: 1,
      cursor: encodeDiscoveryCursor({ sort: "name-asc", name: "ZZZZ", id: "last" }),
    });
    expect(page).toEqual({ items: [], total: 3, nextCursor: null });
    expect(await reader.list({ sort: "name-asc", limit: 1, q: "absent" })).toEqual({
      items: [],
      total: 0,
      nextCursor: null,
    });
  });

  it("counts only approved entries in the competition's tenant and hides drafts", async () => {
    const page = await reader.list({ sort: "updated-desc", limit: 1 });
    expect(page.items[0]?.approvedTeamCount).toBe(1);
    expect((await reader.findById(asCompetitionId("c-3")))?.approvedTeamCount).toBe(1);
    expect(await reader.findById(asCompetitionId("private"))).toBeNull();
  });

  it("applies literal search, all filters and rejects invalid timestamp cursors safely", async () => {
    const page = await reader.list({
      sort: "name-asc",
      limit: 10,
      q: "%",
      format: "knockout",
      status: "finished",
      region: "america",
      platform: "pc",
    });
    expect(page.items.map((item) => item.competition.id)).toEqual(["c-1"]);
    expect(page.total).toBe(1);
    const invalid = Buffer.from(
      JSON.stringify({ sort: "updated-desc", updatedAt: "invalid", id: "x" }),
    ).toString("base64url");
    expect(
      (await reader.list({ sort: "updated-desc", limit: 1, cursor: invalid })).items[0]?.competition
        .id,
    ).toBe("c-3");
  });

  it("resolves organization names in one query and skips empty batches", async () => {
    const organizations = new PostgresOrganizationRepository(pool);
    const query = vi.spyOn(pool, "query");
    try {
      const result = await organizations.getByIds([
        asOrganizationId("org-1"),
        asOrganizationId("org-2"),
        asOrganizationId("org-1"),
      ]);
      expect(result.map((org) => org.name).sort()).toEqual(["First", "Second"]);
      expect(query).toHaveBeenCalledTimes(1);
      expect(await organizations.getByIds([])).toEqual([]);
      expect(query).toHaveBeenCalledTimes(1);
    } finally {
      query.mockRestore();
    }
  });

  it("supports upgrading query indexes from the previous schema", async () => {
    await pool.query(`DROP INDEX competitions_discovery_updated_id_index;
      DROP INDEX competitions_discovery_name_id_index;
      DROP INDEX competition_entries_approved_competition_index`);
    const migration = await readFile(
      resolve(
        import.meta.dirname,
        "../../../migrations/0042_competition_discovery_query_indexes.sql",
      ),
      "utf8",
    );
    await pool.query(migration);
    const result = await pool.query(
      `SELECT indexname FROM pg_indexes WHERE schemaname = $1
      AND indexname IN ('competitions_discovery_updated_id_index', 'competitions_discovery_name_id_index', 'competition_entries_approved_competition_index')`,
      [schema],
    );
    expect(result.rowCount).toBe(3);
  });
});
