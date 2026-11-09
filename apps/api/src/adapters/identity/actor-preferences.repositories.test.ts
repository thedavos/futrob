import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterAll, describe, expect, it } from "vite-plus/test";
import { Pool } from "pg";
import type { ActorPreferencesPort } from "@futrob/identity";
import { asActorId } from "@futrob/shared-kernel";
import { seedActors } from "@/testing/seed-actors.ts";
import { InMemoryActorPreferencesRepository } from "./in-memory-actor-preferences.repository.ts";
import { PostgresActorPreferencesRepository } from "./postgres-actor-preferences.repository.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const migrationsDirectory = resolve(import.meta.dirname, "../../../migrations");
const pools: Pool[] = [];
const TEST_TIMEOUT_MS = 60_000;

afterAll(async () => {
  for (const pool of pools.splice(0)) {
    const schema = (await pool.query("SELECT current_schema() AS schema")).rows[0].schema;
    await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await pool.end();
  }
});

async function postgresRepository(): Promise<ActorPreferencesPort> {
  const schema = `actor_preferences_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString: databaseUrl });
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await admin.end();
  const pool = new Pool({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
  pools.push(pool);
  const files = (await readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    await pool.query(await readFile(resolve(migrationsDirectory, file), "utf8"));
  }
  await seedActors(pool, "actor-a", "actor-b");
  return new PostgresActorPreferencesRepository(pool);
}

const cases: Array<[string, () => Promise<ActorPreferencesPort> | ActorPreferencesPort]> = [
  ["in-memory", () => new InMemoryActorPreferencesRepository()],
];
if (databaseUrl) cases.push(["Postgres", postgresRepository]);

describe.each(cases)(
  "actor preferences %s repository",
  { timeout: TEST_TIMEOUT_MS },
  (_name, createRepository) => {
    it("stores one replaceable layout per actor", async () => {
      const repository = await createRepository();
      const actorA = asActorId("actor-a");
      const actorB = asActorId("actor-b");
      const updatedAt = new Date("2026-11-06T10:00:00.000Z");

      await expect(repository.findByActor(actorA)).resolves.toBeNull();

      await repository.save({ actorId: actorA, sidebarLayout: "pending-queue", updatedAt });
      await repository.save({ actorId: actorA, sidebarLayout: "navigation", updatedAt });
      await repository.save({ actorId: actorB, sidebarLayout: "pending-queue", updatedAt });

      await expect(repository.findByActor(actorA)).resolves.toEqual({
        sidebarLayout: "navigation",
      });
      await expect(repository.findByActor(actorB)).resolves.toEqual({
        sidebarLayout: "pending-queue",
      });
    });
  },
);
