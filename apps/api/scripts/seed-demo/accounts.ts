import { randomBytes, randomUUID, scrypt } from "node:crypto";
import { CREDENTIAL_IDENTITY_PROVIDER } from "@futrob/identity";
import type { Pool } from "pg";

/** Every demo email ends with this domain; reset relies on it. */
export const DEMO_EMAIL_DOMAIN = "demo.futrob.test";
export const DEMO_PASSWORD = "Test123";

export interface DemoAccount {
  readonly key: string;
  readonly email: string;
  readonly name: string;
  readonly actorId: string;
}

export function demoEmail(localPart: string): string {
  return `${localPart}@${DEMO_EMAIL_DOMAIN}`;
}

/**
 * Same format as Better Auth's Node `hashPassword` (`@better-auth/utils/password`):
 * scrypt N=16384, r=16, p=1, 64-byte key, `salt:key` in hex. Inserting the hash directly
 * lets the demo use a 7-character password that sign-up (min 8) would reject; sign-in
 * does not check the length.
 */
export function hashPasswordLikeBetterAuth(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    scrypt(
      password.normalize("NFKC"),
      salt,
      64,
      { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 },
      (error, key) => (error ? reject(error) : resolve(`${salt}:${key.toString("hex")}`)),
    );
  });
}

/**
 * Creates the Better Auth user, its credential account and the provisioned actor the
 * auth worker would create on first sign-in (ADR-0021).
 */
export async function createDemoAccount(
  pool: Pool,
  input: { readonly key: string; readonly localPart: string; readonly name: string },
  passwordHash: string,
  createdAt: Date,
): Promise<DemoAccount> {
  const email = demoEmail(input.localPart);
  const userId = randomUUID().replaceAll("-", "");
  const actorId = randomUUID();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO auth_users (id, name, email, email_verified, image, created_at, updated_at)
       VALUES ($1, $2, $3, true, NULL, $4, $4)`,
      [userId, input.name, email, createdAt],
    );
    await client.query(
      `INSERT INTO auth_accounts (id, account_id, provider_id, user_id, password, created_at, updated_at)
       VALUES ($1, $2, 'credential', $2, $3, $4, $4)`,
      [randomUUID().replaceAll("-", ""), userId, passwordHash, createdAt],
    );
    await client.query("INSERT INTO actors (id, created_at) VALUES ($1, $2)", [actorId, createdAt]);
    await client.query(
      `INSERT INTO identity_subjects (provider, subject, actor_id, created_at)
       VALUES ($1, $2, $3, $4)`,
      [CREDENTIAL_IDENTITY_PROVIDER, userId, actorId, createdAt],
    );
    await client.query(
      `INSERT INTO actor_contact_profiles (actor_id, display_name, email, updated_at)
       VALUES ($1, $2, $3, $4)`,
      [actorId, input.name, email, createdAt],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return { key: input.key, email, name: input.name, actorId };
}

/** Actor without credentials that signs system commands (expiries) during the seed. */
export async function createSystemActor(pool: Pool, createdAt: Date): Promise<string> {
  const actorId = `demo-system-${randomUUID()}`;
  await pool.query("INSERT INTO actors (id, created_at) VALUES ($1, $2)", [actorId, createdAt]);
  return actorId;
}
