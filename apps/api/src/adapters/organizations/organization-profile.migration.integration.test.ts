import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { Pool, type PoolClient } from "pg";
import { seedActors } from "@/testing/seed-actors.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const suite = describe.skipIf(!databaseUrl);
const schemas: string[] = [];
const migrationsDirectory = resolve(import.meta.dirname, "../../../migrations");
const PROFILE_MIGRATION = "0045_organization_profile.sql";

suite("0045 organization profile migration", () => {
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

  it("backfills slug, time zone and logo for organizations that already exist", async () => {
    await withSchema(async (client) => {
      await applyMigrations(client, { before: PROFILE_MIGRATION });
      await seedActors(client, "organizer");
      await insertOrganization(client, "org-1", "Liga Ñandú", "2026-01-01T00:00:00Z");
      await insertOrganization(client, "org-2", "Liga  Nandu", "2026-01-02T00:00:00Z");
      await insertOrganization(client, "org-3", "Admin", "2026-01-03T00:00:00Z");
      await insertOrganization(client, "org-4", "!!", "2026-01-04T00:00:00Z");
      await insertOrganization(client, "org-5", "A", "2026-01-05T00:00:00Z");
      await insertOrganization(
        client,
        "org-6",
        `${"Torneo ".repeat(10)}Final`,
        "2026-01-06T00:00:00Z",
      );
      await insertCompetition(client, "comp-new", "org-1", "Europe/Madrid", "2026-03-01T00:00:00Z");
      await insertCompetition(client, "comp-old", "org-1", "America/Lima", "2026-02-01T00:00:00Z");

      await applyMigrations(client, { only: PROFILE_MIGRATION });

      const result = await client.query(
        `SELECT id, slug, time_zone, logo_kind, logo_value FROM organizations ORDER BY id`,
      );
      expect(result.rows).toEqual([
        {
          id: "org-1",
          slug: "liga-nandu",
          time_zone: "America/Lima",
          logo_kind: "monogram",
          logo_value: null,
        },
        {
          id: "org-2",
          slug: "liga-nandu-2",
          time_zone: "UTC",
          logo_kind: "monogram",
          logo_value: null,
        },
        { id: "org-3", slug: "admin-2", time_zone: "UTC", logo_kind: "monogram", logo_value: null },
        { id: "org-4", slug: "org", time_zone: "UTC", logo_kind: "monogram", logo_value: null },
        { id: "org-5", slug: "org-2", time_zone: "UTC", logo_kind: "monogram", logo_value: null },
        {
          id: "org-6",
          slug: "torneo-torneo-torneo-torneo-torneo-torneo-torneo",
          time_zone: "UTC",
          logo_kind: "monogram",
          logo_value: null,
        },
      ]);
    });
  });

  it("applies from a clean database with a monogram default", async () => {
    await withSchema(async (client) => {
      await applyMigrations(client);
      await seedActors(client, "organizer");

      await client.query(
        `INSERT INTO organizations (
           id, name, normalized_name, slug, time_zone, created_at, created_by_actor_id
         ) VALUES ('org-a', 'Liga A', 'liga a', 'liga-a', 'UTC', NOW(), 'organizer')`,
      );

      const result = await client.query(
        `SELECT logo_kind, logo_value FROM organizations WHERE id = 'org-a'`,
      );
      expect(result.rows).toEqual([{ logo_kind: "monogram", logo_value: null }]);
    });
  });

  it("rejects a duplicate slug, a malformed slug and an inconsistent logo", async () => {
    await withSchema(async (client) => {
      await applyMigrations(client);
      await seedActors(client, "organizer");
      await insertProfiledOrganization(client, "org-a", "Liga A", "liga-a");

      await expect(
        insertProfiledOrganization(client, "org-b", "Liga B", "liga-a"),
      ).rejects.toMatchObject({ code: "23505" });
      await expect(
        insertProfiledOrganization(client, "org-c", "Liga C", "Liga-C"),
      ).rejects.toMatchObject({ code: "23514" });
      await expect(
        insertProfiledOrganization(client, "org-d", "Liga D", "ab"),
      ).rejects.toMatchObject({ code: "23514" });
      await expect(
        client.query(`UPDATE organizations SET logo_kind = 'upload' WHERE id = 'org-a'`),
      ).rejects.toMatchObject({ code: "23514" });
      await expect(
        client.query(
          `UPDATE organizations SET logo_value = 'organization-logos/org-a/x.png' WHERE id = 'org-a'`,
        ),
      ).rejects.toMatchObject({ code: "23514" });

      await client.query(
        `UPDATE organizations
         SET logo_kind = 'upload', logo_value = 'organization-logos/org-a/x.png'
         WHERE id = 'org-a'`,
      );
      const result = await client.query(`SELECT logo_kind FROM organizations WHERE id = 'org-a'`);
      expect(result.rows).toEqual([{ logo_kind: "upload" }]);
    });
  });
});

async function insertOrganization(
  client: PoolClient,
  id: string,
  name: string,
  createdAt: string,
): Promise<void> {
  await client.query(
    `INSERT INTO organizations (id, name, normalized_name, created_at, created_by_actor_id)
     VALUES ($1, $2, $3, $4, 'organizer')`,
    [id, name, name.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase(), createdAt],
  );
}

async function insertCompetition(
  client: PoolClient,
  id: string,
  organizationId: string,
  timeZone: string,
  createdAt: string,
): Promise<void> {
  await client.query(
    `INSERT INTO competitions (
       id, organization_id, name, status, modality, game_edition, platform,
       region, time_zone, format, created_by_actor_id, created_at, updated_at
     ) VALUES (
       $1, $2, $1, 'published', 'fc-clubs', 'fc26', 'playstation',
       'south-america', $3, 'league', 'organizer', $4, $4
     )`,
    [id, organizationId, timeZone, createdAt],
  );
}

async function insertProfiledOrganization(
  client: PoolClient,
  id: string,
  name: string,
  slug: string,
): Promise<void> {
  await client.query(
    `INSERT INTO organizations (
       id, name, normalized_name, slug, time_zone, created_at, created_by_actor_id
     ) VALUES ($1, $2, $3, $4, 'UTC', NOW(), 'organizer')`,
    [id, name, name.toLowerCase(), slug],
  );
}

async function withSchema(run: (client: PoolClient) => Promise<void>): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  const schema = `org_profile_migration_${randomUUID().replaceAll("-", "")}`;
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

/** Applies every migration, only those before `before`, or only `only`, in filename order. */
async function applyMigrations(
  client: PoolClient,
  filter: { readonly before?: string; readonly only?: string } = {},
): Promise<void> {
  const files = (await readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    if (filter.before !== undefined && file >= filter.before) continue;
    if (filter.only !== undefined && file !== filter.only) continue;
    await client.query(await readFile(resolve(migrationsDirectory, file), "utf8"));
  }
}
