import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { getTableName } from "drizzle-orm";
import { Client } from "pg";
import { afterEach, describe, expect, it } from "vite-plus/test";
import { SystemClock } from "../../clock.ts";
import { CryptoIdGenerator } from "../../id-generator.ts";
import { buildAuthEnv } from "../../auth-env.ts";
import { isAuthSchemaReady } from "../../auth-readiness.ts";
import { ensureActorForSubject, credentialSubject } from "./actor-provisioner.ts";
import { upsertActorContactProfile } from "./actor-contact-profile.ts";
import { createAuth } from "./better-auth.ts";
import { createAuthDb } from "./database.ts";
import { authSchema, identitySubjects, actors, actorContactProfiles } from "./drizzle-schema.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const suite = describe.skipIf(!databaseUrl);
const schemas: string[] = [];

suite("auth on product Postgres (migration 0043)", () => {
  afterEach(async () => {
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      for (const schema of schemas.splice(0)) {
        await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      }
    } finally {
      await client.end();
    }
  });

  it("keeps every Drizzle table selectable against the migration", async () => {
    await withSchema(async ({ connect }) => {
      const client = await connect();
      const db = createAuthDb(client);
      for (const table of Object.values(authSchema)) {
        await expect(db.select().from(table).limit(1)).resolves.toEqual([]);
      }
      expect(Object.values(authSchema).map((table) => getTableName(table))).toEqual([
        "auth_users",
        "auth_sessions",
        "auth_accounts",
        "auth_verifications",
        "auth_rate_limits",
        "actors",
        "identity_subjects",
        "actor_contact_profiles",
      ]);
      await expect(isAuthSchemaReady(client)).resolves.toBe(true);
      await client.end();
    });
  }, 30_000);

  it("provisions exactly one actor per subject under concurrent sign-ins", async () => {
    await withSchema(async ({ connect }) => {
      const clock = new SystemClock();
      const ids = new CryptoIdGenerator();
      const subject = credentialSubject("user-race");

      const clients = await Promise.all(Array.from({ length: 8 }, () => connect()));
      const results = await Promise.all(
        clients.map((client) => ensureActorForSubject(createAuthDb(client), clock, ids, subject)),
      );

      expect(new Set(results).size).toBe(1);
      const db = createAuthDb(clients[0]!);
      expect(await db.select().from(actors)).toHaveLength(1);
      expect(await db.select().from(identitySubjects)).toHaveLength(1);
      await Promise.all(clients.map((client) => client.end()));
    });
  }, 30_000);

  it("signs up, then get-session returns the provisioned actorId", async () => {
    await withSchema(async ({ connect }) => {
      const client = await connect();
      const auth = createAuth({
        db: createAuthDb(client),
        env: buildAuthEnv({
          APP_BASE_URL: "http://localhost:3000",
          BETTER_AUTH_SECRET: "test-secret-at-least-32-characters!!",
          BETTER_AUTH_TRUSTED_ORIGINS: "http://localhost:3000",
        }),
        clock: new SystemClock(),
        ids: new CryptoIdGenerator(),
      });
      const email = `pg-${randomUUID()}@futrob.test`;

      const signUp = await auth.handler(
        new Request("http://localhost:3000/api/auth/sign-up/email", {
          method: "POST",
          headers: { "content-type": "application/json", origin: "http://localhost:3000" },
          body: JSON.stringify({ email, password: "password-at-least-8", name: "Captain" }),
        }),
      );
      expect(signUp.status).toBe(200);
      const cookie = signUp.headers
        .getSetCookie()
        .map((value) => value.split(";")[0])
        .join("; ");

      const session = await auth.handler(
        new Request("http://localhost:3000/api/auth/get-session", {
          headers: { cookie },
        }),
      );
      const body = (await session.json()) as { user: { email: string }; actorId: string | null };
      expect(body.user.email).toBe(email);
      expect(body.actorId).toEqual(expect.any(String));

      const db = createAuthDb(client);
      const [original] = await db.select().from(actorContactProfiles);
      expect(original).toMatchObject({ actorId: body.actorId, displayName: "Captain", email });
      const update = await auth.handler(
        new Request("http://localhost:3000/api/auth/update-user", {
          method: "POST",
          headers: { cookie, "content-type": "application/json", origin: "http://localhost:3000" },
          body: JSON.stringify({ name: "Updated Captain" }),
        }),
      );
      expect(update.status).toBe(200);
      expect(await db.select().from(actorContactProfiles)).toMatchObject([
        { actorId: body.actorId, displayName: "Updated Captain", email },
      ]);
      // A sign-in sync that read the user before the update resumes after it.
      await upsertActorContactProfile(db, original!);
      expect(await db.select().from(actorContactProfiles)).toMatchObject([
        { actorId: body.actorId, displayName: "Updated Captain", email },
      ]);
      await db.delete(actorContactProfiles);
      const signIn = await auth.handler(
        new Request("http://localhost:3000/api/auth/sign-in/email", {
          method: "POST",
          headers: { "content-type": "application/json", origin: "http://localhost:3000" },
          body: JSON.stringify({ email, password: "password-at-least-8" }),
        }),
      );
      expect(signIn.status).toBe(200);
      expect(await db.select().from(actorContactProfiles)).toMatchObject([
        { actorId: body.actorId, displayName: "Updated Captain", email },
      ]);
      const anonymous = await auth.handler(
        new Request("http://localhost:3000/api/auth/get-session"),
      );
      expect(await anonymous.json()).toBeNull();
      await client.end();
    });
  }, 30_000);
});

async function withSchema(
  run: (input: { connect: () => Promise<Client> }) => Promise<void>,
): Promise<void> {
  const schema = `auth_pg_${randomUUID().replaceAll("-", "")}`;
  schemas.push(schema);

  const connect = async () => {
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    await client.query(`SET search_path TO "${schema}"`);
    return client;
  };

  const setup = new Client({ connectionString: databaseUrl });
  await setup.connect();
  try {
    await setup.query(`CREATE SCHEMA "${schema}"`);
    await setup.query(`SET search_path TO "${schema}"`);
    await setup.query(
      await readFile(
        resolve(import.meta.dirname, "../../../../api/migrations/0043_auth_and_actors.sql"),
        "utf8",
      ),
    );
    await setup.query(
      await readFile(
        resolve(import.meta.dirname, "../../../../api/migrations/0056_actor_contact_profiles.sql"),
        "utf8",
      ),
    );
  } finally {
    await setup.end();
  }
  await run({ connect });
}
