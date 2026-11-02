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
const RETIRE_GAME_STEP = "0061_retire_legacy_onboarding_game_step.sql";

suite("0061 retire legacy onboarding game step", () => {
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

  it("moves incomplete game progress to the first step of its path and keeps other rows", async () => {
    await withSchema(async (client) => {
      await applyMigrations(client, { before: RETIRE_GAME_STEP });
      await seedActors(client, "a-org", "a-player", "a-club", "a-done");
      await client.query(
        `INSERT INTO actor_onboarding (
           actor_id, onboarding_completed, onboarding_path, onboarding_current_step,
           created_at, updated_at
         ) VALUES
           ('a-org', FALSE, 'organization', 'game', NOW(), NOW()),
           ('a-player', FALSE, 'player', 'game', NOW(), NOW()),
           ('a-club', FALSE, 'player', 'club', NOW(), NOW())`,
      );
      await client.query(
        `INSERT INTO actor_onboarding (
           actor_id, onboarding_completed, onboarding_completed_at, onboarding_version,
           onboarding_path, onboarding_current_step, created_at, updated_at
         ) VALUES ('a-done', TRUE, NOW(), 3, 'player', NULL, NOW(), NOW())`,
      );

      await applyMigrations(client, { only: RETIRE_GAME_STEP });

      const result = await client.query(
        `SELECT actor_id, onboarding_path, onboarding_current_step
         FROM actor_onboarding ORDER BY actor_id`,
      );
      expect(result.rows).toEqual([
        { actor_id: "a-club", onboarding_path: "player", onboarding_current_step: "club" },
        { actor_id: "a-done", onboarding_path: "player", onboarding_current_step: null },
        {
          actor_id: "a-org",
          onboarding_path: "organization",
          onboarding_current_step: "organization",
        },
        {
          actor_id: "a-player",
          onboarding_path: "player",
          onboarding_current_step: "game-account",
        },
      ]);
    });
  });

  it("rejects the game step once applied", async () => {
    await withSchema(async (client) => {
      await applyMigrations(client);
      await seedActors(client, "a-new");

      await expect(
        client.query(
          `INSERT INTO actor_onboarding (
             actor_id, onboarding_completed, onboarding_path, onboarding_current_step,
             created_at, updated_at
           ) VALUES ('a-new', FALSE, 'player', 'game', NOW(), NOW())`,
        ),
      ).rejects.toThrow(/actor_onboarding/);
    });
  });
});

async function withSchema(run: (client: PoolClient) => Promise<void>): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();
  const schema = `onboarding_game_step_${randomUUID().replaceAll("-", "")}`;
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
  filter: { readonly before?: string; readonly only?: string } = {},
): Promise<void> {
  const files = (await readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    if (filter.before !== undefined && file >= filter.before) continue;
    if (filter.only !== undefined && file !== filter.only) continue;
    await client.query(await readFile(resolve(migrationsDirectory, file), "utf8"));
  }
}
