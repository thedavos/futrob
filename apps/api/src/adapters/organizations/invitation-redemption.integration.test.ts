import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { asActorId } from "@futrob/shared-kernel";
import { Pool, type PoolClient } from "pg";
import { PostgresTransactionPort } from "@/adapters/persistence/pg-transaction.ts";
import { PostgresInvitationRepository } from "./postgres.repository.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const suite = describe.skipIf(!databaseUrl);
const schemas: string[] = [];

suite("PostgresInvitationRepository.claimRedemption", () => {
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

  it.each([1, 3])(
    "keeps concurrent retries by the same actor idempotent with capacity %s",
    async (maxRedemptions) => {
      await withSchema(async (pool) => {
        await pool.query(
          `INSERT INTO organizations (
             id, name, normalized_name, created_at, created_by_actor_id
           ) VALUES ('org-race', 'Race League', 'race league', NOW(), 'organizer')`,
        );
        await pool.query(
          `INSERT INTO organization_invitations (
             id, organization_id, role, token_hash, status, invited_by_actor_id,
             expires_at, created_at, redeem_policy, max_redemptions, redeemed_count
           ) VALUES (
             'invite-race', 'org-race', 'member', 'hash:race-token', 'pending',
             'organizer', NOW() + INTERVAL '1 day', NOW(), 'multi', $1, 0
           )`,
          [maxRedemptions],
        );
        const invitations = new PostgresInvitationRepository(pool);
        const transaction = new PostgresTransactionPort(pool);
        const actorId = asActorId("same-actor");
        const now = new Date();

        const results = await Promise.all([
          transaction.runInTransaction(() =>
            invitations.claimRedemption("hash:race-token", actorId, now),
          ),
          transaction.runInTransaction(() =>
            invitations.claimRedemption("hash:race-token", actorId, now),
          ),
        ]);

        expect(results.every(Boolean)).toBe(true);
        expect(
          results
            .map((result) => result?.outcome)
            .sort((left, right) => left!.localeCompare(right!)),
        ).toEqual(["already-redeemed", "claimed"]);
        const invitation = await pool.query(
          `SELECT redeemed_count FROM organization_invitations WHERE id = 'invite-race'`,
        );
        const ledger = await pool.query(
          `SELECT COUNT(*)::integer AS count
           FROM organization_invitation_redemptions
           WHERE invitation_id = 'invite-race' AND actor_id = 'same-actor'`,
        );
        expect(invitation.rows[0]).toEqual({ redeemed_count: 1 });
        expect(ledger.rows[0]).toEqual({ count: 1 });
      });
    },
  );
});

async function withSchema(run: (pool: Pool) => Promise<void>): Promise<void> {
  const admin = new Pool({ connectionString: databaseUrl });
  const client = await admin.connect();
  const schema = `invitation_redemption_${randomUUID().replaceAll("-", "")}`;
  schemas.push(schema);
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    await applyMigrations(client);
  } finally {
    client.release();
    await admin.end();
  }

  const pool = new Pool({ connectionString: databaseUrl, options: `-c search_path=${schema}` });
  try {
    await run(pool);
  } finally {
    await pool.end();
  }
}

async function applyMigrations(client: PoolClient): Promise<void> {
  const directory = resolve(import.meta.dirname, "../../../migrations");
  const files = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    await client.query(await readFile(resolve(directory, file), "utf8"));
  }
}
