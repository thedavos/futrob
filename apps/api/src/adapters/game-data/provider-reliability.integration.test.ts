import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { Pool } from "pg";
import type { QueuedProviderSyncJob } from "@futrob/game-data";
import { PostgresProviderSyncJobRepository } from "./jobs/postgres-provider-sync-job.repository.ts";
import { PostgresProviderCircuitBreaker } from "./resilience/postgres-provider-circuit-breaker.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const schema = `provider_reliability_${randomUUID().replaceAll("-", "")}`;
let admin: Pool;
let pool: Pool;

describe.skipIf(!databaseUrl)("provider reliability Postgres", () => {
  beforeAll(async () => {
    admin = new Pool({ connectionString: databaseUrl });
    await admin.query(`CREATE SCHEMA "${schema}"`);
    pool = new Pool({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
    for (const migration of ["0026_provider_sync_jobs.sql", "0027_provider_resilience.sql"]) {
      const sql = await readFile(
        new URL(`../../../../migrations/${migration}`, import.meta.url),
        "utf8",
      );
      await pool.query(sql);
    }
  });

  afterAll(async () => {
    await pool?.end();
    if (admin) {
      await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await admin.end();
    }
  });

  it("claims one attempt and rejects a stale half-open completion", async () => {
    const jobs = new PostgresProviderSyncJobRepository(pool);
    await jobs.enqueue(queuedJob());
    const now = new Date("2026-08-11T20:00:00.000Z");
    const claims = await Promise.all([
      jobs.claimNext({
        jobId: "job-1",
        now,
        leaseToken: "lease-a",
        leaseExpiresAt: new Date("2026-08-11T20:01:30.000Z"),
      }),
      jobs.claimNext({
        jobId: "job-1",
        now,
        leaseToken: "lease-b",
        leaseExpiresAt: new Date("2026-08-11T20:01:30.000Z"),
      }),
    ]);
    expect(claims.filter(Boolean)).toHaveLength(1);

    const circuit = new PostgresProviderCircuitBreaker(pool);
    const key = "ea-clubs:/clubs/info";
    await circuit.recordTransientFailure({ key, now, failureThreshold: 1, cooldownMs: 1_000 });
    const first = await circuit.beforeRequest({
      key,
      now: new Date("2026-08-11T20:00:01.000Z"),
      probeLeaseToken: "probe-a",
      probeLeaseExpiresAt: new Date("2026-08-11T20:00:02.000Z"),
    });
    const second = await circuit.beforeRequest({
      key,
      now: new Date("2026-08-11T20:00:02.000Z"),
      probeLeaseToken: "probe-b",
      probeLeaseExpiresAt: new Date("2026-08-11T20:00:03.000Z"),
    });
    if (!first.allowed || first.state !== "half_open") throw new TypeError("missing probe-a");
    if (!second.allowed || second.state !== "half_open") throw new TypeError("missing probe-b");
    await circuit.recordTransientFailure({
      key,
      now: new Date("2026-08-11T20:00:02.100Z"),
      failureThreshold: 1,
      cooldownMs: 60_000,
      probeLeaseToken: second.probeLeaseToken,
    });
    await circuit.recordSuccess({
      key,
      now: new Date("2026-08-11T20:00:02.200Z"),
      probeLeaseToken: first.probeLeaseToken,
    });
    await expect(
      circuit.getProviderState("ea-clubs", new Date("2026-08-11T20:00:03.000Z")),
    ).resolves.toBe("open");
  });
});

function queuedJob(): QueuedProviderSyncJob {
  const now = new Date("2026-08-11T20:00:00.000Z");
  return {
    id: "job-1",
    organizationId: "org-1",
    providerKey: "ea-clubs",
    kind: "recent-matches",
    sync: {
      externalClubId: "10754",
      platform: "common-gen5",
      gameEdition: "fc26",
      matchType: "friendlyMatch",
      maxResultCount: 10,
    },
    dedupeKey: "dedupe",
    requestId: "81d89ee9-f42c-42f6-aad2-bc7136d326e9",
    status: "queued",
    attempt: 0,
    maxAttempts: 4,
    availableAt: now,
    createdAt: now,
    updatedAt: now,
  };
}
