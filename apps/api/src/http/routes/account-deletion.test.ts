import { asActorId } from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import {
  InMemoryAccountDeletionRepository,
  InMemoryCredentialVerifier,
} from "@/adapters/identity/account-deletion.repositories.ts";
import {
  buildAppWithModules,
  INTERNAL_JOB_SECRET,
  serviceHeaders,
  stubFetch,
} from "@/http/http-app.harness.ts";

const PATH = "/api/v1/identity/account/deletion";
const RUN_PATH = "/api/v1/internal/identity/account-deletion/run";

function appWithPassword(actorId: string, password: string) {
  const { app, modules } = buildAppWithModules(stubFetch);
  const credentials = modules.accountDeletion.credentials;
  if (!(credentials instanceof InMemoryCredentialVerifier)) throw new Error("expected memory");
  credentials.passwords.set(asActorId(actorId), password);
  return app;
}

function requestDeletion(app: ReturnType<typeof appWithPassword>, password: string) {
  return app.request(PATH, {
    method: "POST",
    headers: serviceHeaders("actor-a"),
    body: JSON.stringify({ password }),
  });
}

describe("apps/api http account deletion", () => {
  it("requires an authenticated actor", async () => {
    const app = appWithPassword("actor-a", "secret-pass");

    expect((await app.request(PATH)).status).toBe(401);
    expect((await app.request(PATH, { method: "DELETE" })).status).toBe(401);
  });

  it("refuses a wrong password with 403 so the client stays signed in", async () => {
    const app = appWithPassword("actor-a", "secret-pass");

    const res = await requestDeletion(app, "guess");

    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: "identity.reauthentication_failed" });
    const status = await app.request(PATH, { headers: serviceHeaders("actor-a") });
    expect(await status.json()).toEqual({ deletion: { status: "active" }, blockers: [] });
  });

  it("schedules once, keeps the date when repeated, and cancels back to active", async () => {
    const app = appWithPassword("actor-a", "secret-pass");

    const first = await requestDeletion(app, "secret-pass");
    expect(first.status).toBe(200);
    const scheduled = (await first.json()) as {
      deletion: { status: string; requestedAt: string; scheduledFor: string };
    };
    expect(scheduled).toMatchObject({ deletion: { status: "scheduled" }, blockers: [] });
    const requestedAt = Date.parse(scheduled.deletion.requestedAt);
    expect(Date.parse(scheduled.deletion.scheduledFor) - requestedAt).toBe(30 * 86_400_000);

    const again = await requestDeletion(app, "secret-pass");
    expect(await again.json()).toEqual(scheduled);
    const other = await app.request(PATH, { headers: serviceHeaders("actor-b") });
    expect(await other.json()).toEqual({ deletion: { status: "active" }, blockers: [] });

    const cancelled = await app.request(PATH, {
      method: "DELETE",
      headers: serviceHeaders("actor-a"),
    });
    expect(cancelled.status).toBe(200);
    expect(await cancelled.json()).toEqual({ deletion: { status: "active" }, blockers: [] });
  });

  it("answers 404 for a deleted account instead of reporting it active", async () => {
    const { app, modules } = buildAppWithModules(stubFetch);
    const accounts = modules.accountDeletion.accounts;
    if (!(accounts instanceof InMemoryAccountDeletionRepository))
      throw new Error("expected memory");
    accounts.states.set(asActorId("actor-a"), {
      kind: "deleted",
      deletedAt: new Date("2026-12-10T09:00:00.000Z"),
    });

    for (const method of ["GET", "DELETE"]) {
      const res = await app.request(PATH, { method, headers: serviceHeaders("actor-a") });
      expect(res.status).toBe(404);
      expect(await res.json()).toMatchObject({ code: "identity.account_deleted" });
    }
  });

  it("runs the job only with the internal secret and finds nothing due early", async () => {
    const app = appWithPassword("actor-a", "secret-pass");
    await requestDeletion(app, "secret-pass");

    expect((await app.request(RUN_PATH, { method: "POST" })).status).toBe(401);
    const run = await app.request(RUN_PATH, {
      method: "POST",
      headers: { Authorization: `Bearer ${INTERNAL_JOB_SECRET}` },
    });
    expect(run.status).toBe(200);
    expect(await run.json()).toEqual({ deleted: 0, postponed: 0 });
  });
});
