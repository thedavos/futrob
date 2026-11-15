import { afterAll, describe, expect, it } from "vite-plus/test";
import {
  createIsolatedSchema,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "../../src/testing/isolated-schema.ts";
import { seedActors } from "../../src/testing/seed-actors.ts";
import { seedAccessStates } from "./access.ts";
import { createSystemActor, hashPasswordLikeBetterAuth } from "./accounts.ts";
import { createSeedContext } from "./context.ts";
import { DemoEaWorld } from "./fake-ea.ts";
import { openOrganization, seedMegaLiga } from "./orgs.ts";
import { createPeople } from "./people.ts";
import { resetDemoData } from "./reset.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const EXISTING_ADMIN = "existing-admin";

describe.skipIf(!databaseUrl)("demo seed on a database that already has a superuser", () => {
  let isolated: IsolatedSchema | undefined;
  afterAll(() => isolated?.drop());

  async function seedOnce(pool: IsolatedSchema["pool"]) {
    const context = createSeedContext({
      pool,
      ea: new DemoEaWorld(),
      internalJobSecret: "demo-seed-test-secret",
      systemActorId: await createSystemActor(pool, new Date()),
    });
    const people = await createPeople(
      pool,
      await hashPasswordLikeBetterAuth("Test123"),
      context.now,
    );
    await seedAccessStates(context, people);
    const toOpen = [
      { organizer: people.named.orgFree, name: "Barrio FC", planKey: "free" },
      { organizer: people.named.orgPro, name: "Liga Andina", planKey: "league" },
    ] as const;
    const opened = await Promise.all(
      toOpen.map((input) => openOrganization(context, people, { ...input, reason: "Demo test" })),
    );
    const mega = await seedMegaLiga(context, people);
    return { opened, mega };
  }

  async function organizationPlan(pool: IsolatedSchema["pool"], organizationId: string) {
    const result = await pool.query<{ plan_key: string }>(
      "SELECT plan_key FROM billing_subscriptions WHERE organization_id = $1",
      [organizationId],
    );
    return result.rows[0]?.plan_key;
  }

  async function competitionNames(pool: IsolatedSchema["pool"], organizationId: string) {
    const result = await pool.query<{ name: string }>(
      "SELECT name FROM competitions WHERE organization_id = $1 ORDER BY name",
      [organizationId],
    );
    return result.rows.map((row) => row.name);
  }

  it("seeds, resets and reseeds without touching the existing administrator", async () => {
    isolated = await createIsolatedSchema(databaseUrl!, "demo_seed");
    const { pool } = isolated;
    await migrateIsolatedSchema(pool);
    await seedActors(pool, EXISTING_ADMIN);
    await pool.query(
      `INSERT INTO platform_role_assignments (actor_id, role, assigned_by_actor_id, created_at)
       VALUES ($1, 'superuser', $1, NOW())`,
      [EXISTING_ADMIN],
    );

    for (const round of ["seed", "reseed"]) {
      const { opened, mega } = await seedOnce(pool);
      expect(await organizationPlan(pool, opened[0]!.id), round).toBe("free");
      expect(await organizationPlan(pool, opened[1]!.id), round).toBe("league");
      expect(await organizationPlan(pool, mega.id), round).toBe("league");
      expect(await competitionNames(pool, mega.id), round).toEqual(["Liga Pausada", "Superliga"]);

      const removed = await resetDemoData(pool);
      expect(removed.organizations, round).toBe(3);
      const admins = await pool.query<{ actor_id: string }>(
        "SELECT actor_id FROM platform_role_assignments",
      );
      expect(
        admins.rows.map((row) => row.actor_id),
        round,
      ).toEqual([EXISTING_ADMIN]);
    }
  }, 300_000);
});
