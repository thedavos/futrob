import { describe, expect, it, vi } from "vite-plus/test";
import * as Sentry from "@sentry/cloudflare";
import { APIError } from "better-auth/api";
import type { Client } from "pg";
import type { ActorProvisionerPort } from "@futrob/identity";
import { CREDENTIAL_IDENTITY_PROVIDER } from "@futrob/identity";
import { applySentryEventPolicy } from "@futrob/logger";
import { asActorId } from "@futrob/shared-kernel";
import { createActorProvisioningHooks, createAuth, createAuthErrorHandler } from "./better-auth.ts";
import { createAuthDb } from "./database.ts";

describe("createActorProvisioningHooks", () => {
  it("provisions the domain actor before Better Auth creates a session", async () => {
    const ensureActorForSubject = vi.fn(async () => asActorId("actor-1"));
    const provisioner: ActorProvisionerPort = { ensureActorForSubject };
    const hooks = createActorProvisioningHooks(provisioner);

    await hooks.session.create.before({ userId: "user-1" });

    expect(ensureActorForSubject).toHaveBeenCalledWith({
      provider: CREDENTIAL_IDENTITY_PROVIDER,
      subject: "user-1",
    });
  });

  it("allows a later sign-in to retry failed provisioning", async () => {
    const ensureActorForSubject = vi
      .fn<ActorProvisionerPort["ensureActorForSubject"]>()
      .mockRejectedValueOnce(new Error("database unavailable"))
      .mockResolvedValue(asActorId("actor-1"));
    const hooks = createActorProvisioningHooks({ ensureActorForSubject });

    await expect(hooks.session.create.before({ userId: "user-1" })).rejects.toThrow(
      "database unavailable",
    );
    await expect(hooks.session.create.before({ userId: "user-1" })).resolves.toBeUndefined();
    expect(ensureActorForSubject).toHaveBeenCalledTimes(2);
  });
});

it("synchronizes contacts after provisioning and after name or email updates", async () => {
  const events: string[] = [];
  const hooks = createActorProvisioningHooks(
    {
      ensureActorForSubject: async () => {
        events.push("provision");
        return asActorId("actor-1");
      },
    },
    {
      syncCredentialUser: async (userId) => {
        events.push(`contact:${userId}`);
      },
    },
  );
  await hooks.session.create.before({ userId: "user-1" });
  expect(events).toEqual(["provision", "contact:user-1"]);
  await hooks.user.update.after({ id: "user-1" });
  expect(events).toEqual(["provision", "contact:user-1", "contact:user-1"]);
});

it("does not issue a session when the contact projection fails", async () => {
  const hooks = createActorProvisioningHooks(
    { ensureActorForSubject: async () => asActorId("actor-1") },
    {
      syncCredentialUser: async () => {
        throw new Error("projection unavailable");
      },
    },
  );
  await expect(hooks.session.create.before({ userId: "user-1" })).rejects.toThrow(
    "projection unavailable",
  );
});

describe("createAuthErrorHandler", () => {
  it("reports endpoint defects that Better Auth turns into HTTP 500", () => {
    const reportDefect = vi.fn();
    const handler = createAuthErrorHandler(reportDefect);
    const defect = new Error("SYNTHETIC_DB_FAILURE");
    handler.onError(defect);
    handler.onError(new APIError("INTERNAL_SERVER_ERROR"));
    expect(reportDefect).toHaveBeenCalledTimes(2);
    expect(reportDefect).toHaveBeenCalledWith(defect);
  });

  it("ignores expected client errors such as wrong credentials", () => {
    const reportDefect = vi.fn();
    const handler = createAuthErrorHandler(reportDefect);
    handler.onError(
      new APIError("UNAUTHORIZED", {
        code: "INVALID_EMAIL_OR_PASSWORD",
        message: "Invalid email or password",
      }),
    );
    handler.onError(new APIError("TOO_MANY_REQUESTS"));
    expect(reportDefect).not.toHaveBeenCalled();
  });
});

describe("sign-in query defects", () => {
  const email = "synthetic-private@example.test";

  /** pg double: every `auth_users` query fails like a dropped connection. */
  function failingUserLookupClient() {
    return {
      query: async (query: string | { readonly text: string }) => {
        const text = typeof query === "string" ? query : query.text;
        if (text.includes("auth_users")) throw new Error("SYNTHETIC_CONNECTION_RESET");
        return { rows: [], fields: [], rowCount: 0 };
      },
    } as unknown as Client;
  }

  /** Real Sentry client with the production event policy and an in-memory transport. */
  function memorySentry() {
    const envelopes: string[] = [];
    const client = new Sentry.CloudflareClient({
      dsn: "https://public@sentry.invalid/1",
      integrations: [Sentry.linkedErrorsIntegration()],
      sendDefaultPii: false,
      beforeSend: (event, hint) => applySentryEventPolicy(event, hint),
      stackParser: (stack) =>
        stack
          .split("\n")
          .flatMap((line) => {
            const frame = /at (?:.*? \()?(.+?):(\d+):(\d+)\)?$/.exec(line.trim());
            return frame
              ? [{ filename: frame[1], lineno: Number(frame[2]), colno: Number(frame[3]) }]
              : [];
          })
          .reverse(),
      transport: (options) =>
        Sentry.createTransport(options, async (request) => {
          envelopes.push(String(request.body));
          return { statusCode: 200 };
        }),
    });
    client.init();
    return { client, envelopes };
  }

  it("captures the defect as HTTP 500 without the searched email", async () => {
    const sentry = memorySentry();
    let next = 0;
    const auth = createAuth({
      db: createAuthDb(failingUserLookupClient()),
      env: {
        BETTER_AUTH_SECRET: "synthetic-secret-with-at-least-32-characters",
        BETTER_AUTH_URL: "http://localhost:8788",
        BETTER_AUTH_TRUSTED_ORIGINS: ["http://localhost:3000"],
      },
      clock: { now: () => new Date("2026-01-01T00:00:00Z") },
      ids: { generate: () => `id-${(next += 1)}` },
      actorProvisioner: { ensureActorForSubject: async () => asActorId("actor-1") },
      reportDefect: (cause) => sentry.client.captureException(cause),
    });

    const response = await auth.handler(
      new Request("http://localhost:8788/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({ email, password: "synthetic-password" }),
      }),
    );
    await sentry.client.flush();

    expect(response.status).toBe(500);
    expect(sentry.envelopes).toHaveLength(1);
    const serialized = sentry.envelopes[0];
    expect(serialized).not.toContain(email);
    expect(serialized).toContain("auth_users");
    expect(serialized).toContain("params: [Filtered]");
    expect(serialized).toMatch(/"frames":\[\{[^\]]*better-auth\/dist\/api\/routes\/sign-in/);
  });
});
