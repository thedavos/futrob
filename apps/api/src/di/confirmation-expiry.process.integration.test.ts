import { fork, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vite-plus/test";
import { asActorId } from "@futrob/shared-kernel";
import { z } from "zod";
import { PostgresProviderMatchRepository } from "@/adapters/game-data/persistence/postgres.repository.ts";
import {
  createIsolatedSchema,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";
import { seedActors } from "@/testing/seed-actors.ts";
import {
  HOME_CAPTAIN,
  HOME,
  ORG,
  ENCOUNTER,
  seedComposition,
  slot,
} from "./official-selection.composition.fixture.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const CRASH_LOCK_KEY = 1_300_051;

describe.skipIf(!databaseUrl)("confirmation expiry across a real API process crash", () => {
  let isolated: IsolatedSchema;
  let child: ChildProcess | undefined;
  let childErrors = "";
  beforeAll(async () => {
    isolated = await createIsolatedSchema(databaseUrl!, "confirmation_process");
    await migrateIsolatedSchema(isolated.pool);
  }, 180_000);
  afterAll(async () => {
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGKILL");
      await exited;
    }
    await isolated?.drop();
  }, 180_000);

  async function start() {
    childErrors = "";
    child = fork(
      resolve(import.meta.dirname, "../testing/confirmation-expiry-process.fixture.ts"),
      [],
      {
        cwd: resolve(import.meta.dirname, "../.."),
        execArgv: ["--import", "tsx"],
        env: {
          ...process.env,
          TEST_DATABASE_URL: databaseUrl,
          TEST_SCHEMA: isolated.schema,
          TEST_CLOCK: "2026-10-05T03:00:00.000Z",
          TEST_ACTOR_ID: "actor-process-system",
        },
        stdio: ["ignore", "pipe", "pipe", "ipc"],
      },
    );
    const appendChildOutput = (chunk: Buffer) => {
      childErrors += chunk.toString();
    };
    child.stdout?.on("data", appendChildOutput);
    child.stderr?.on("data", appendChildOutput);
    const ready = await Promise.race([
      once(child, "message").then(
        ([message]) => z.object({ port: z.number() }).parse(message).port,
      ),
      once(child, "exit").then(() => {
        throw new Error(`API process exited before ready: ${childErrors}`);
      }),
    ]);
    return `http://127.0.0.1:${ready}/api/v1/internal/results/confirmation-expiry/run`;
  }

  it("rolls back an interrupted expiry and rediscovers it after restart; replay stays unique", async () => {
    const matches = new PostgresProviderMatchRepository(isolated.pool);
    const { modules } = await seedComposition({
      pool: isolated.pool,
      matches,
      clock: { now: () => new Date("2026-10-03T20:00:00.000Z") },
    });
    await seedActors(isolated.pool, "actor-process-system");
    const proposed = await modules.officialSelection.propose.execute({
      actorId: HOME_CAPTAIN,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      actingTeamId: HOME,
      selections: slot("m-1"),
      expectedVersion: 0,
      commandKey: "propose",
    });
    expect(proposed.isOk() ? proposed.value.selection.status : proposed.error.code).toBe(
      "awaiting_opponent_confirmation",
    );
    const before = (await isolated.pool.query("SELECT * FROM official_selection_proposals")).rows;
    const blocker = await isolated.pool.connect();
    await blocker.query("SELECT pg_advisory_lock($1::bigint)", [CRASH_LOCK_KEY]);
    await isolated.pool.query(`CREATE FUNCTION block_expiry_action() RETURNS trigger AS $$ BEGIN
      IF NEW.action_type = 'confirmation_expired' THEN PERFORM pg_advisory_xact_lock(${CRASH_LOCK_KEY}); END IF;
      RETURN NEW; END; $$ LANGUAGE plpgsql;
      CREATE TRIGGER block_expiry BEFORE INSERT ON official_selection_actions FOR EACH ROW EXECUTE FUNCTION block_expiry_action()`);
    const headers = { Authorization: "Bearer process-expiry-secret" };
    const firstUrl = await start();
    const interrupted = fetch(firstUrl, { method: "POST", headers }).catch(() => null);
    try {
      // Coverage CI saturates the runner; 200 tight polls returned before the forked
      // API reached this lock (~5–7s). Wait with a yield so the child can progress.
      await vi.waitFor(
        async () => {
          if (child === undefined || child.exitCode !== null || child.signalCode !== null) {
            throw new Error(`API process exited before crash boundary: ${childErrors}`);
          }
          const query = await isolated.pool.query(
            `SELECT EXISTS (
               SELECT 1 FROM pg_locks
               WHERE locktype = 'advisory' AND objsubid = 1 AND objid = $1 AND NOT granted
             ) AS waiting`,
            [CRASH_LOCK_KEY],
          );
          expect(query.rows[0].waiting).toBe(true);
        },
        { timeout: 15_000, interval: 50 },
      );
      const exited = once(child!, "exit");
      child!.kill("SIGKILL");
      await exited;
      await interrupted;
    } finally {
      await blocker.query("SELECT pg_advisory_unlock($1::bigint)", [CRASH_LOCK_KEY]);
      blocker.release();
      await isolated.pool.query(
        "DROP TRIGGER block_expiry ON official_selection_actions; DROP FUNCTION block_expiry_action()",
      );
    }
    const pending = await modules.results.selections.findLatestByEncounter(ENCOUNTER);
    expect(pending).toMatchObject({ status: "awaiting_opponent_confirmation", version: 1 });
    expect((await modules.results.selections.listActions(ENCOUNTER)).map((a) => a.type)).toEqual([
      "proposed",
    ]);
    const restartedUrl = await start();
    const recovered = await fetch(restartedUrl, { method: "POST", headers });
    expect(recovered.status).toBe(200);
    expect(await recovered.json()).toEqual({ expired: 1, skipped: 0 });
    const replay = await fetch(restartedUrl, { method: "POST", headers });
    expect(await replay.json()).toEqual({ expired: 0, skipped: 0 });
    const viewed = await modules.officialSelection.get.execute({
      actorId: asActorId("actor-operator"),
      organizationId: ORG,
      encounterId: ENCOUNTER,
    });
    expect(viewed.isOk() ? viewed.value.selection : viewed.error.code).toMatchObject({
      status: "organizer_review",
      version: 2,
    });
    expect(
      (await modules.results.selections.listActions(ENCOUNTER)).map((a) => ({
        type: a.type,
        actorId: a.actorId,
        at: a.occurredAt.toISOString(),
      })),
    ).toEqual([
      { type: "proposed", actorId: "actor-home-captain", at: "2026-10-03T20:00:00.000Z" },
      {
        type: "confirmation_expired",
        actorId: "actor-process-system",
        at: "2026-10-05T03:00:00.000Z",
      },
    ]);
    expect((await isolated.pool.query("SELECT * FROM official_selection_proposals")).rows).toEqual(
      before,
    );
    expect(
      (await isolated.pool.query("SELECT released_at FROM official_selection_reference_claims"))
        .rows,
    ).toEqual([{ released_at: null }]);
    expect(
      (await isolated.pool.query("SELECT count(*)::int AS n FROM official_results")).rows,
    ).toEqual([{ n: 0 }]);
    expect(
      (await isolated.pool.query("SELECT count(*)::int AS n FROM team_match_contributions")).rows,
    ).toEqual([{ n: 0 }]);
  }, 60_000);
});
