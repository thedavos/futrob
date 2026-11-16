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
import { createEmailVerificationToken } from "better-auth/api";
import { createAuth, PASSWORD_RESET_APP_CALLBACK } from "./better-auth.ts";
import { createAuthDb } from "./database.ts";
import {
  authSchema,
  authVerifications,
  identitySubjects,
  actors,
  actorContactProfiles,
} from "./drizzle-schema.ts";

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
        reportDefect: (cause) => {
          throw cause;
        },
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

  it("changes the email only once the new address confirms, and revoking a session ends it", async () => {
    await withSchema(async ({ connect }) => {
      const client = await connect();
      const links: Array<{ to: string; url: string }> = [];
      const auth = createAuth({
        db: createAuthDb(client),
        env: buildAuthEnv({
          APP_BASE_URL: "http://localhost:3000",
          BETTER_AUTH_SECRET: "test-secret-at-least-32-characters!!",
          BETTER_AUTH_TRUSTED_ORIGINS: "http://localhost:3000",
        }),
        clock: new SystemClock(),
        ids: new CryptoIdGenerator(),
        mail: {
          sendEmailChangeVerification: async ({ to, url }) => {
            links.push({ to, url });
          },
          sendEmailVerification: async () => {},
          sendPasswordReset: async () => {},
        },
      });
      const email = `old-${randomUUID()}@futrob.test`;
      const newEmail = `new-${randomUUID()}@futrob.test`;
      const json = { "content-type": "application/json", origin: "http://localhost:3000" };
      const cookieOf = (response: Response) =>
        response.headers
          .getSetCookie()
          .map((value) => value.split(";")[0])
          .join("; ");
      const sessionOf = async (cookie: string) =>
        (await (
          await auth.handler(
            new Request("http://localhost:3000/api/auth/get-session", { headers: { cookie } }),
          )
        ).json()) as { user: { email: string }; session: { token: string } } | null;

      const web = cookieOf(
        await auth.handler(
          new Request("http://localhost:3000/api/auth/sign-up/email", {
            method: "POST",
            headers: json,
            body: JSON.stringify({ email, password: "password-at-least-8", name: "Captain" }),
          }),
        ),
      );
      const phone = cookieOf(
        await auth.handler(
          new Request("http://localhost:3000/api/auth/sign-in/email", {
            method: "POST",
            headers: json,
            body: JSON.stringify({ email, password: "password-at-least-8" }),
          }),
        ),
      );

      const listed = await auth.handler(
        new Request("http://localhost:3000/api/auth/list-sessions", { headers: { cookie: web } }),
      );
      expect(await listed.json()).toHaveLength(2);
      const phoneToken = (await sessionOf(phone))?.session.token;
      const revoked = await auth.handler(
        new Request("http://localhost:3000/api/auth/revoke-session", {
          method: "POST",
          headers: { ...json, cookie: web },
          body: JSON.stringify({ token: phoneToken }),
        }),
      );
      expect(revoked.status).toBe(200);
      await expect(sessionOf(phone)).resolves.toBeNull();

      const change = await auth.handler(
        new Request("http://localhost:3000/api/auth/change-email", {
          method: "POST",
          headers: { ...json, cookie: web },
          body: JSON.stringify({ newEmail, callbackURL: "/" }),
        }),
      );
      expect(change.status).toBe(200);
      expect(links.map(({ to }) => to)).toEqual([newEmail]);
      expect((await sessionOf(web))?.user.email).toBe(email);

      const confirm = await auth.handler(new Request(links[0]!.url));
      expect(confirm.status).toBe(302);
      expect((await sessionOf(web))?.user.email).toBe(newEmail);
      const db = createAuthDb(client);
      expect(await db.select().from(actorContactProfiles)).toMatchObject([{ email: newEmail }]);
      await client.end();
    });
  });

  it("resets a password with a single-use link without revealing which accounts exist", async () => {
    await withSchema(async ({ connect }) => {
      const client = await connect();
      const links: Array<{ to: string; url: string }> = [];
      const background: Promise<unknown>[] = [];
      const auth = createAuth({
        db: createAuthDb(client),
        env: buildAuthEnv({
          APP_BASE_URL: "http://localhost:3000",
          BETTER_AUTH_SECRET: "test-secret-at-least-32-characters!!",
          BETTER_AUTH_TRUSTED_ORIGINS: "http://localhost:3000",
        }),
        clock: new SystemClock(),
        ids: new CryptoIdGenerator(),
        mail: {
          sendEmailChangeVerification: async () => {},
          sendEmailVerification: async () => {},
          sendPasswordReset: async ({ to, url }) => {
            links.push({ to, url });
          },
        },
        runInBackground: (task) => {
          background.push(task);
        },
        reportDefect: (cause) => {
          throw cause;
        },
      });
      const email = `reset-${randomUUID()}@futrob.test`;
      const json = { "content-type": "application/json", origin: "http://localhost:3000" };
      let ip = 0;
      const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
        auth.handler(
          new Request(`http://localhost:3000/api/auth${path}`, {
            method: "POST",
            headers: { ...json, "cf-connecting-ip": `203.0.113.${(ip += 1)}`, ...headers },
            body: JSON.stringify(body),
          }),
        );
      const cookieOf = (response: Response) =>
        response.headers
          .getSetCookie()
          .map((value) => value.split(";")[0])
          .join("; ");
      const sessionOf = async (cookie: string) =>
        (await auth
          .handler(
            new Request("http://localhost:3000/api/auth/get-session", { headers: { cookie } }),
          )
          .then((response) => response.json())) as { user: { email: string } } | null;
      const requestReset = async (address: string, redirectTo = "/reset-password") => {
        const response = await post("/request-password-reset", { email: address, redirectTo });
        await Promise.all(background.splice(0));
        return { status: response.status, body: await response.json() };
      };
      const tokenOf = async (url: string) => {
        const landing = await auth.handler(new Request(url));
        return new URL(landing.headers.get("location")!);
      };

      const web = cookieOf(
        await post("/sign-up/email", { email, password: "old-password-1", name: "Captain" }),
      );
      const phone = cookieOf(await post("/sign-in/email", { email, password: "old-password-1" }));

      // Same answer for an account that exists and one that does not; only the first gets mail.
      const known = await requestReset(email);
      const unknown = await requestReset(`nobody-${randomUUID()}@futrob.test`);
      expect(unknown).toEqual(known);
      expect(known.status).toBe(200);
      expect(links.map(({ to }) => to)).toEqual([email]);

      // The link lands on the web page with the token, or in the app through its scheme.
      const landing = await tokenOf(links[0]!.url);
      expect(`${landing.origin}${landing.pathname}`).toBe("http://localhost:3000/reset-password");
      const token = landing.searchParams.get("token")!;
      expect(token).not.toBe("");
      await requestReset(email, PASSWORD_RESET_APP_CALLBACK);
      const appLanding = await tokenOf(links[1]!.url);
      expect(appLanding.href.startsWith(`${PASSWORD_RESET_APP_CALLBACK}?token=`)).toBe(true);

      const reset = await post("/reset-password", { token, newPassword: "new-password-2" });
      expect(reset.status).toBe(200);

      // The old password stops working and every other session is closed.
      expect((await post("/sign-in/email", { email, password: "old-password-1" })).status).toBe(
        401,
      );
      await expect(sessionOf(web)).resolves.toBeNull();
      await expect(sessionOf(phone)).resolves.toBeNull();
      const fresh = cookieOf(await post("/sign-in/email", { email, password: "new-password-2" }));
      expect((await sessionOf(fresh))?.user.email).toBe(email);

      // A used link, and any older link of the same account, no longer works.
      const reused = await post("/reset-password", { token, newPassword: "again-password-3" });
      expect(reused.status).toBe(400);
      expect(await reused.json()).toMatchObject({ code: "INVALID_TOKEN" });
      expect((await tokenOf(links[0]!.url)).searchParams.get("error")).toBe("INVALID_TOKEN");
      expect((await tokenOf(links[1]!.url)).searchParams.get("error")).toBe("INVALID_TOKEN");

      // An expired link answers the same way.
      await requestReset(email);
      const expiring = (await tokenOf(links[2]!.url)).searchParams.get("token")!;
      const db = createAuthDb(client);
      await db.update(authVerifications).set({ expiresAt: new Date(Date.UTC(2000, 0, 1)) });
      expect((await tokenOf(links[2]!.url)).searchParams.get("error")).toBe("INVALID_TOKEN");
      const expired = await post("/reset-password", { token: expiring, newPassword: "late-pw-4" });
      expect(await expired.json()).toMatchObject({ code: "INVALID_TOKEN" });
      await client.end();
    });
  });

  it("limits reset requests per IP and reset emails per account", async () => {
    await withSchema(async ({ connect }) => {
      const client = await connect();
      const db = createAuthDb(client);
      const sent: string[] = [];
      const auth = createAuth({
        db,
        env: buildAuthEnv({
          APP_BASE_URL: "http://localhost:3000",
          BETTER_AUTH_SECRET: "test-secret-at-least-32-characters!!",
          BETTER_AUTH_TRUSTED_ORIGINS: "http://localhost:3000",
        }),
        clock: new SystemClock(),
        ids: new CryptoIdGenerator(),
        mail: {
          sendEmailChangeVerification: async () => {},
          sendEmailVerification: async () => {},
          sendPasswordReset: async ({ to }) => {
            sent.push(to);
          },
        },
        reportDefect: (cause) => {
          throw cause;
        },
      });
      const email = `limit-${randomUUID()}@futrob.test`;
      const request = (path: string, body: unknown, ip: string) =>
        auth.handler(
          new Request(`http://localhost:3000/api/auth${path}`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              origin: "http://localhost:3000",
              "cf-connecting-ip": ip,
            },
            body: JSON.stringify(body),
          }),
        );
      await request("/sign-up/email", { email, password: "password-1", name: "C" }, "198.51.100.1");

      const fromOneIp = [];
      for (let attempt = 0; attempt < 4; attempt += 1) {
        fromOneIp.push(
          (await request("/request-password-reset", { email }, "198.51.100.2")).status,
        );
      }
      expect(fromOneIp).toEqual([200, 200, 200, 429]);

      // From other addresses the answer stays 200, but the account gets no more than three links.
      for (const ip of ["198.51.100.3", "198.51.100.4"]) {
        expect((await request("/request-password-reset", { email }, ip)).status).toBe(200);
      }
      expect(sent).toEqual([email, email, email]);
      // Suppressed requests leave no token behind, so they do not prolong the cap.
      expect(await db.select().from(authVerifications)).toHaveLength(3);
      await client.end();
    });
  });

  it("does not count reset links the mail provider failed to send", async () => {
    await withSchema(async ({ connect }) => {
      const client = await connect();
      const db = createAuthDb(client);
      let providerUp = false;
      const sent: string[] = [];
      const defects: Error[] = [];
      const auth = createAuth({
        db,
        env: buildAuthEnv({
          APP_BASE_URL: "http://localhost:3000",
          BETTER_AUTH_SECRET: "test-secret-at-least-32-characters!!",
          BETTER_AUTH_TRUSTED_ORIGINS: "http://localhost:3000",
        }),
        clock: new SystemClock(),
        ids: new CryptoIdGenerator(),
        mail: {
          sendEmailChangeVerification: async () => {},
          sendPasswordReset: async ({ url }) => {
            if (!providerUp) throw new Error("provider down");
            sent.push(url);
          },
        },
        reportDefect: (cause) => {
          defects.push(cause);
        },
      });
      const email = `outage-${randomUUID()}@futrob.test`;
      const request = (path: string, body: unknown, ip: string) =>
        auth.handler(
          new Request(`http://localhost:3000/api/auth${path}`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              origin: "http://localhost:3000",
              "cf-connecting-ip": ip,
            },
            body: JSON.stringify(body),
          }),
        );
      await request("/sign-up/email", { email, password: "password-1", name: "C" }, "198.51.100.1");

      for (const ip of ["198.51.100.2", "198.51.100.3", "198.51.100.4"]) {
        expect((await request("/request-password-reset", { email }, ip)).status).toBe(200);
      }
      expect(defects.map(({ message }) => message)).toEqual(Array(3).fill("provider down"));
      expect(await db.select().from(authVerifications)).toEqual([]);

      // Once the provider recovers, the next request sends a link that works.
      providerUp = true;
      expect((await request("/request-password-reset", { email }, "198.51.100.5")).status).toBe(
        200,
      );
      expect(sent).toHaveLength(1);
      const token = new URL(sent[0]!).pathname.split("/").at(-1);
      const reset = await request(
        "/reset-password",
        { token, newPassword: "new-password-2" },
        "198.51.100.5",
      );
      expect(reset.status).toBe(200);
      await client.end();
    });
  });

  it("verifies a new account once, without holding back sign-in, and offers another link", async () => {
    await withSchema(async ({ connect }) => {
      const client = await connect();
      const links: string[] = [];
      const background: Promise<unknown>[] = [];
      const secret = "test-secret-at-least-32-characters!!";
      const auth = createAuth({
        db: createAuthDb(client),
        env: buildAuthEnv({
          APP_BASE_URL: "http://localhost:3000",
          BETTER_AUTH_SECRET: secret,
          BETTER_AUTH_TRUSTED_ORIGINS: "http://localhost:3000",
        }),
        clock: new SystemClock(),
        ids: new CryptoIdGenerator(),
        mail: {
          sendEmailChangeVerification: async () => {},
          sendEmailVerification: async ({ url }) => {
            links.push(url);
          },
          sendPasswordReset: async () => {},
        },
        runInBackground: (task) => {
          background.push(task);
        },
        reportDefect: (cause) => {
          throw cause;
        },
      });
      const email = `verify-${randomUUID()}@futrob.test`;
      const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
        auth.handler(
          new Request(`http://localhost:3000/api/auth${path}`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              origin: "http://localhost:3000",
              "cf-connecting-ip": "192.0.2.10",
              ...headers,
            },
            body: JSON.stringify(body),
          }),
        );
      const sessionOf = async (cookie: string) =>
        (await auth
          .handler(
            new Request("http://localhost:3000/api/auth/get-session", { headers: { cookie } }),
          )
          .then((response) => response.json())) as { user: { emailVerified: boolean } } | null;
      const open = async (url: string) => {
        const response = await auth.handler(new Request(url));
        expect(response.status).toBe(302);
        const landing = new URL(response.headers.get("location")!, "http://localhost:3000");
        return `${landing.pathname}${landing.search}`;
      };
      const db = createAuthDb(client);

      // Sign-up still opens a session at once (onboarding follows) and sends one link.
      const signUp = await post("/sign-up/email", {
        email,
        password: "password-at-least-8",
        name: "Captain",
        callbackURL: "/player",
      });
      expect(signUp.status).toBe(200);
      await Promise.all(background.splice(0));
      const cookie = signUp.headers
        .getSetCookie()
        .map((value) => value.split(";")[0])
        .join("; ");
      expect((await sessionOf(cookie))?.user.emailVerified).toBe(false);
      expect(links).toHaveLength(1);
      // Whatever the client asked, the link lands on the web page.
      expect(new URL(links[0]!).searchParams.get("callbackURL")).toBe("/verify-email");
      expect(await db.select().from(actorContactProfiles)).toMatchObject([
        { email, emailVerified: false },
      ]);
      expect(
        (await post("/sign-in/email", { email, password: "password-at-least-8" })).status,
      ).toBe(200);

      // The signed-in account can ask for another link.
      const resend = await post("/send-verification-email", { email }, { cookie });
      expect(resend.status).toBe(200);
      expect(links).toHaveLength(2);

      // The first link verifies; it and every other link are used from then on.
      expect(await open(links[0]!)).toBe("/verify-email");
      expect((await sessionOf(cookie))?.user.emailVerified).toBe(true);
      expect(await db.select().from(actorContactProfiles)).toMatchObject([
        { email, emailVerified: true },
      ]);
      expect(await open(links[0]!)).toBe("/verify-email?error=TOKEN_USED");
      expect(await open(links[1]!)).toBe("/verify-email?error=TOKEN_USED");
      const again = await post("/send-verification-email", { email }, { cookie });
      expect(await again.json()).toMatchObject({ code: "EMAIL_ALREADY_VERIFIED" });
      expect(links).toHaveLength(2);

      // An expired link for an unverified account lands with its own error.
      const other = `late-${randomUUID()}@futrob.test`;
      await post("/sign-up/email", { email: other, password: "password-at-least-8", name: "L" });
      await Promise.all(background.splice(0));
      const expired = await createEmailVerificationToken(secret, other, undefined, -60);
      expect(
        await open(
          `http://localhost:3000/api/auth/verify-email?token=${expired}&callbackURL=%2Fverify-email`,
        ),
      ).toBe("/verify-email?error=TOKEN_EXPIRED");

      // A token this worker did not sign says nothing about the account it names.
      const forged = (address: string) =>
        `http://localhost:3000/api/auth/verify-email?token=e30.${btoa(
          JSON.stringify({ email: address }),
        ).replaceAll("=", "")}.invalid&callbackURL=%2Fverify-email`;
      for (const address of [email, other, `nobody-${randomUUID()}@futrob.test`]) {
        expect(await open(forged(address))).toBe("/verify-email?error=INVALID_TOKEN");
      }
      await client.end();
    });
  });

  it("keeps sign-up open when mail fails, and tells only a signed-in resend", async () => {
    await withSchema(async ({ connect }) => {
      const client = await connect();
      const defects: Error[] = [];
      const auth = createAuth({
        db: createAuthDb(client),
        env: buildAuthEnv({
          APP_BASE_URL: "http://localhost:3000",
          BETTER_AUTH_SECRET: "test-secret-at-least-32-characters!!",
          BETTER_AUTH_TRUSTED_ORIGINS: "http://localhost:3000",
        }),
        clock: new SystemClock(),
        ids: new CryptoIdGenerator(),
        mail: {
          sendEmailChangeVerification: async () => {},
          sendEmailVerification: async () => {
            throw new Error("mail provider down");
          },
          sendPasswordReset: async () => {},
        },
        reportDefect: (cause) => {
          defects.push(cause);
        },
      });
      const email = `down-${randomUUID()}@futrob.test`;
      const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
        auth.handler(
          new Request(`http://localhost:3000/api/auth${path}`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              origin: "http://localhost:3000",
              "cf-connecting-ip": "192.0.2.30",
              ...headers,
            },
            body: JSON.stringify(body),
          }),
        );

      const signUp = await post("/sign-up/email", {
        email,
        password: "password-at-least-8",
        name: "Captain",
      });
      expect(signUp.status).toBe(200);
      const cookie = signUp.headers
        .getSetCookie()
        .map((value) => value.split(";")[0])
        .join("; ");
      expect(cookie).not.toBe("");

      // Anonymous: the same answer as for an account that does not exist.
      expect((await post("/send-verification-email", { email })).status).toBe(200);
      // Signed in: the failure shows, so the account can try again.
      expect((await post("/send-verification-email", { email }, { cookie })).status).toBe(500);
      expect(defects.map((defect) => defect.message)).toEqual([
        "mail provider down",
        "mail provider down",
        "mail provider down",
      ]);
      await client.end();
    });
  });

  it("limits verification resends per IP", async () => {
    await withSchema(async ({ connect }) => {
      const client = await connect();
      const sent: string[] = [];
      const auth = createAuth({
        db: createAuthDb(client),
        env: buildAuthEnv({
          APP_BASE_URL: "http://localhost:3000",
          BETTER_AUTH_SECRET: "test-secret-at-least-32-characters!!",
          BETTER_AUTH_TRUSTED_ORIGINS: "http://localhost:3000",
        }),
        clock: new SystemClock(),
        ids: new CryptoIdGenerator(),
        mail: {
          sendEmailChangeVerification: async () => {},
          sendEmailVerification: async ({ to }) => {
            sent.push(to);
          },
          sendPasswordReset: async () => {},
        },
        reportDefect: (cause) => {
          throw cause;
        },
      });
      const email = `resend-${randomUUID()}@futrob.test`;
      const request = (path: string, body: unknown, headers: Record<string, string>) =>
        auth.handler(
          new Request(`http://localhost:3000/api/auth${path}`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              origin: "http://localhost:3000",
              ...headers,
            },
            body: JSON.stringify(body),
          }),
        );
      const signUp = await request(
        "/sign-up/email",
        { email, password: "password-1", name: "C" },
        { "cf-connecting-ip": "198.51.100.20" },
      );
      const cookie = signUp.headers
        .getSetCookie()
        .map((value) => value.split(";")[0])
        .join("; ");

      const statuses = [];
      for (let attempt = 0; attempt < 4; attempt += 1) {
        statuses.push(
          (
            await request(
              "/send-verification-email",
              { email },
              { cookie, "cf-connecting-ip": "198.51.100.21" },
            )
          ).status,
        );
      }
      expect(statuses).toEqual([200, 200, 200, 429]);
      expect(sent).toHaveLength(4);
      await client.end();
    });
  });

  it("answers that email change is unavailable when no mail adapter is configured", async () => {
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
      const json = { "content-type": "application/json", origin: "http://localhost:3000" };
      const signUp = await auth.handler(
        new Request("http://localhost:3000/api/auth/sign-up/email", {
          method: "POST",
          headers: json,
          body: JSON.stringify({
            email: `pg-${randomUUID()}@futrob.test`,
            password: "password-at-least-8",
            name: "Captain",
          }),
        }),
      );
      const cookie = signUp.headers
        .getSetCookie()
        .map((value) => value.split(";")[0])
        .join("; ");

      const change = await auth.handler(
        new Request("http://localhost:3000/api/auth/change-email", {
          method: "POST",
          headers: { ...json, cookie },
          body: JSON.stringify({ newEmail: `next-${randomUUID()}@futrob.test` }),
        }),
      );

      expect(change.status).toBe(400);
      expect(await change.json()).toMatchObject({ code: "CHANGE_EMAIL_DISABLED" });
      await client.end();
    });
  });
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
    await setup.query(
      await readFile(
        resolve(
          import.meta.dirname,
          "../../../../api/migrations/0069_actor_contact_email_verified.sql",
        ),
        "utf8",
      ),
    );
  } finally {
    await setup.end();
  }
  await run({ connect });
}
