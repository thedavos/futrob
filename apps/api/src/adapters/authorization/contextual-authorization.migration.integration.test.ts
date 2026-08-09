import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { Pool, type PoolClient } from "pg";

const databaseUrl = process.env.TEST_DATABASE_URL;
const suite = describe.skipIf(!databaseUrl);
const schemas: string[] = [];

suite("0017 contextual authorization migration", () => {
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
           AND table_name IN (
             'authorization_grants',
             'authorization_audit_log',
             'platform_role_assignments'
           )
         ORDER BY table_name`,
      );
      expect(result.rows.map((row) => row.table_name)).toEqual([
        "authorization_audit_log",
        "authorization_grants",
        "platform_role_assignments",
      ]);
    });
  });

  it("maps legacy captain/player tenant roles to member", async () => {
    await withSchema(async (client) => {
      await applyMigrations(client, 16);
      await client.query(
        `INSERT INTO organizations (
           id, name, normalized_name, created_at, created_by_actor_id
         ) VALUES ('org-legacy', 'Legacy', 'legacy', NOW(), 'organizer')`,
      );
      await client.query(
        `INSERT INTO organization_memberships (organization_id, actor_id, role, created_at)
         VALUES
           ('org-legacy', 'captain', 'captain', NOW()),
           ('org-legacy', 'player', 'player', NOW())`,
      );
      await client.query(
        `INSERT INTO organization_invitations (
           id, organization_id, role, token_hash, status, invited_by_actor_id,
           expires_at, created_at
         ) VALUES (
           'invite-legacy', 'org-legacy', 'captain', 'legacy-hash', 'pending',
           'organizer', NOW() + INTERVAL '1 day', NOW()
         )`,
      );

      await applyMigrations(client, 17, 17);

      const result = await client.query(
        `SELECT actor_id, role FROM organization_memberships ORDER BY actor_id`,
      );
      expect(result.rows).toEqual([
        { actor_id: "captain", role: "member" },
        { actor_id: "player", role: "member" },
      ]);
      const invitation = await client.query(
        `SELECT role FROM organization_invitations WHERE id = 'invite-legacy'`,
      );
      expect(invitation.rows[0]).toEqual({ role: "member" });
    });
  });

  it("keeps competition invitation roles while remapping ambiguous org invites", async () => {
    await withSchema(async (client) => {
      await applyMigrations(client, 16);
      await client.query(
        `INSERT INTO organizations (
           id, name, normalized_name, created_at, created_by_actor_id
         ) VALUES ('org-legacy', 'Legacy', 'legacy', NOW(), 'organizer')`,
      );
      await client.query(
        `INSERT INTO competitions (
           id, organization_id, name, status, modality, game_edition, platform,
           region, time_zone, format, created_by_actor_id, created_at, updated_at
         ) VALUES (
           'comp-legacy', 'org-legacy', 'Legacy Cup', 'draft', 'fc-clubs', 'fc26',
           'playstation', 'south-america', 'America/Lima', 'league', 'organizer',
           NOW(), NOW()
         )`,
      );
      await client.query(
        `INSERT INTO organization_invitations (
           id, organization_id, competition_id, role, token_hash, status,
           invited_by_actor_id, expires_at, created_at
         ) VALUES
           (
             'invite-org-player', 'org-legacy', NULL, 'player', 'org-hash', 'pending',
             'organizer', NOW() + INTERVAL '1 day', NOW()
           ),
           (
             'invite-comp-captain', 'org-legacy', 'comp-legacy', 'captain', 'comp-hash',
             'pending', 'organizer', NOW() + INTERVAL '1 day', NOW()
           )`,
      );

      await applyMigrations(client, 17, 17);

      const invitations = await client.query(
        `SELECT id, role FROM organization_invitations ORDER BY id`,
      );
      expect(invitations.rows).toEqual([
        { id: "invite-comp-captain", role: "captain" },
        { id: "invite-org-player", role: "member" },
      ]);
    });
  });
});

async function withSchema(run: (client: PoolClient) => Promise<void>): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  const schema = `auth_migration_${randomUUID().replaceAll("-", "")}`;
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

async function applyMigrations(
  client: PoolClient,
  through = Number.POSITIVE_INFINITY,
  from = 1,
): Promise<void> {
  const directory = resolve(import.meta.dirname, "../../../migrations");
  const files = (await readdir(directory))
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .filter((file) => {
      const number = Number.parseInt(file.slice(0, 4), 10);
      return number >= from && number <= through;
    });
  for (const file of files) {
    await client.query(await readFile(resolve(directory, file), "utf8"));
  }
}
