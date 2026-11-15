import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { createIsolatedSchema } from "@/testing/isolated-schema.ts";
import { seedActors } from "@/testing/seed-actors.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const suite = describe.skipIf(!databaseUrl);
const directory = resolve(import.meta.dirname, "../../../migrations");
const migration = "0063_remove_onboarding_competition_step.sql";

suite("onboarding without a competition step", () => {
  it("upgrades existing progress, keeps completion and permits the optional organization account", async () => {
    const isolated = await createIsolatedSchema(databaseUrl ?? "", "onboarding_no_competition");
    const client = await isolated.pool.connect();
    try {
      const files = (await readdir(directory))
        .filter((name) => name.endsWith(".sql") && name < migration)
        .sort();
      for (const file of files)
        await client.query(await readFile(resolve(directory, file), "utf8"));
      await seedActors(client, "actor-old-step", "actor-done", "actor-optional");
      await client.query(`INSERT INTO actor_onboarding (actor_id, onboarding_completed, onboarding_path, onboarding_current_step, created_at, updated_at)
        VALUES ('actor-old-step', FALSE, 'organization', 'competition', NOW(), NOW())`);
      await client.query(`INSERT INTO actor_onboarding (actor_id, onboarding_completed, onboarding_completed_at, onboarding_version, onboarding_path, onboarding_current_step, created_at, updated_at)
        VALUES ('actor-done', TRUE, NOW(), 3, 'organization', NULL, NOW(), NOW())`);
      await client.query(await readFile(resolve(directory, migration), "utf8"));
      const progress = await client.query(
        `SELECT actor_id, onboarding_completed, onboarding_current_step FROM actor_onboarding ORDER BY actor_id`,
      );
      expect(progress.rows).toEqual([
        { actor_id: "actor-done", onboarding_completed: true, onboarding_current_step: null },
        {
          actor_id: "actor-old-step",
          onboarding_completed: false,
          onboarding_current_step: "organization",
        },
      ]);
      await client.query(`INSERT INTO actor_onboarding (actor_id, onboarding_completed, onboarding_path, onboarding_current_step, created_at, updated_at)
        VALUES ('actor-optional', FALSE, 'organization', 'game-account', NOW(), NOW())`);
      await expect(
        client.query(
          `UPDATE actor_onboarding SET onboarding_current_step = 'competition' WHERE actor_id = 'actor-optional'`,
        ),
      ).rejects.toMatchObject({ code: "23514" });
    } finally {
      client.release();
      await isolated.drop();
    }
  }, 180_000);
});
