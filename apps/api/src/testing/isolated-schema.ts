import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { Client, Pool, type PoolClient } from "pg";
import { runMigrations } from "@/adapters/persistence/migration-runner.ts";
import { seedActors } from "@/testing/seed-actors.ts";

export const MIGRATIONS_DIRECTORY = resolve(import.meta.dirname, "../../migrations");

export interface IsolatedSchema {
  readonly schema: string;
  /** Every connection of this pool has `search_path` pinned to the throwaway schema. */
  readonly pool: Pool;
  drop(): Promise<void>;
}

/** Creates a throwaway schema; never touches `public`. */
export async function createIsolatedSchema(
  databaseUrl: string,
  prefix: string,
): Promise<IsolatedSchema> {
  const schema = `${prefix}_${randomUUID().replaceAll("-", "")}`;
  const admin = new Client({ connectionString: databaseUrl });
  await admin.connect();
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
  } finally {
    await admin.end();
  }

  const pool = new Pool({ connectionString: databaseUrl, max: 6 });
  pool.on("connect", (client) => {
    void client.query(`SET search_path TO "${schema}"`);
  });

  return {
    schema,
    pool,
    async drop() {
      await pool.end();
      const cleanup = new Client({ connectionString: databaseUrl });
      await cleanup.connect();
      try {
        await cleanup.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      } finally {
        await cleanup.end();
      }
    },
  };
}

/** Applies a migrations directory on one pooled connection of the isolated schema. */
export async function migrateIsolatedSchema(pool: Pool, directory = MIGRATIONS_DIRECTORY) {
  const client = await pool.connect();
  try {
    return await runMigrations(client, { directory });
  } finally {
    client.release();
  }
}

export async function insertTenant(
  db: Pick<PoolClient, "query">,
  organizationId: string,
  competitionId: string,
): Promise<void> {
  await seedActors(db, "tenant-organizer");
  await db.query(
    `INSERT INTO organizations (
       id, name, normalized_name, created_at, created_by_actor_id
     ) VALUES ($1, $1, $1, NOW(), 'tenant-organizer')`,
    [organizationId],
  );
  await db.query(
    `INSERT INTO competitions (
       id, organization_id, name, status, modality, game_edition, platform,
       region, time_zone, format, created_by_actor_id, created_at, updated_at
     ) VALUES (
       $1, $2, $1, 'published', 'fc-clubs', 'fc26', 'playstation',
       'south-america', 'America/Lima', 'league', 'tenant-organizer', NOW(), NOW()
     )`,
    [competitionId, organizationId],
  );
}
