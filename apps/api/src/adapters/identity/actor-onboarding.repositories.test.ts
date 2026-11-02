import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterAll, describe, expect, it } from "vite-plus/test";
import { Pool } from "pg";
import type { ActorOnboardingPort } from "@futrob/identity";
import { asActorId } from "@futrob/shared-kernel";
import { seedActors } from "@/testing/seed-actors.ts";
import { InMemoryActorOnboardingRepository } from "./in-memory-actor-onboarding.repository.ts";
import { PostgresActorOnboardingRepository } from "./postgres-actor-onboarding.repository.ts";

type HistoryRow = readonly [string, string | null, string | null, number, string];

interface RepositoryCase {
  readonly repository: ActorOnboardingPort;
  history(): Promise<readonly HistoryRow[]>;
}

const databaseUrl = process.env.TEST_DATABASE_URL;
const migrationsDirectory = resolve(import.meta.dirname, "../../../migrations");
const pools: Pool[] = [];

afterAll(async () => {
  for (const pool of pools.splice(0)) {
    const schema = (await pool.query("SELECT current_schema() AS schema")).rows[0].schema;
    await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await pool.end();
  }
});

function inMemoryCase(): RepositoryCase {
  const repository = new InMemoryActorOnboardingRepository();
  return {
    repository,
    async history() {
      return repository.events.map((event) => [
        event.kind,
        event.path,
        event.kind === "step-entered" ? event.step : null,
        event.version,
        event.occurredAt.toISOString(),
      ]);
    },
  };
}

async function postgresCase(): Promise<RepositoryCase> {
  const schema = `actor_onboarding_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString: databaseUrl });
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await admin.end();
  const pool = new Pool({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
  pools.push(pool);
  const files = (await readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    await pool.query(await readFile(resolve(migrationsDirectory, file), "utf8"));
  }
  await seedActors(pool, "actor-resume", "actor-funnel");
  return {
    repository: new PostgresActorOnboardingRepository(pool),
    async history() {
      const result = await pool.query(
        `SELECT kind, onboarding_path, onboarding_step, onboarding_version,
                to_char(occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS at
         FROM actor_onboarding_events ORDER BY id`,
      );
      return result.rows.map((row) => [
        row.kind,
        row.onboarding_path,
        row.onboarding_step,
        row.onboarding_version,
        row.at,
      ]);
    },
  };
}

const cases: Array<[string, () => Promise<RepositoryCase> | RepositoryCase]> = [
  ["in-memory", inMemoryCase],
];
if (databaseUrl) cases.push(["Postgres", postgresCase]);

describe.each(cases)("actor onboarding %s repository", (_name, createCase) => {
  it("saves, retrieves and completes progress while clearing the current step", async () => {
    const { repository } = await createCase();
    const actorId = asActorId("actor-resume");

    await repository.saveProgress({
      actorId,
      path: "player",
      currentStep: "game-account",
      version: 3,
      updatedAt: new Date("2026-07-30T10:00:00.000Z"),
    });

    await expect(repository.findByActor(actorId)).resolves.toMatchObject({
      completed: false,
      path: "player",
      currentStep: "game-account",
    });

    await repository.saveCompleted({
      actorId,
      completedAt: new Date("2026-07-30T11:00:00.000Z"),
      version: 1,
      path: "player",
    });

    await expect(repository.findByActor(actorId)).resolves.toEqual({
      actorId,
      completed: true,
      completedAt: new Date("2026-07-30T11:00:00.000Z"),
      version: 1,
      path: "player",
      currentStep: null,
    });
  });

  it("records one history entry per real transition, none for repeats or after completion", async () => {
    const { repository, history } = await createCase();
    const actorId = asActorId("actor-funnel");
    const progress = (
      path: "player" | null,
      currentStep: "intention" | "game-account" | "club" | "review",
      at: string,
    ) =>
      repository.saveProgress({ actorId, path, currentStep, version: 3, updatedAt: new Date(at) });

    await progress(null, "intention", "2026-11-02T10:00:00.000Z");
    await progress("player", "game-account", "2026-11-02T10:01:00.000Z");
    await progress("player", "game-account", "2026-11-02T10:01:30.000Z");
    await progress("player", "club", "2026-11-02T10:02:00.000Z");
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await repository.saveCompleted({
        actorId,
        path: "player",
        version: 3,
        completedAt: new Date("2026-11-02T10:03:00.000Z"),
      });
    }
    await progress("player", "review", "2026-11-02T10:04:00.000Z");

    await expect(history()).resolves.toEqual([
      ["step-entered", null, "intention", 3, "2026-11-02T10:00:00.000Z"],
      ["step-entered", "player", "game-account", 3, "2026-11-02T10:01:00.000Z"],
      ["step-entered", "player", "club", 3, "2026-11-02T10:02:00.000Z"],
      ["completed", "player", null, 3, "2026-11-02T10:03:00.000Z"],
    ]);
  });
});
