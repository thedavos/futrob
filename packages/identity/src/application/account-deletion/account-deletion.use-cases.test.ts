import {
  asActorId,
  asCompetitionId,
  asTeamId,
  type ActorId,
  type DomainEvent,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type { AccountDeletionRepository } from "../../domain/ports/account-deletion.port.ts";
import type {
  AccountDeletionBlocker,
  AccountDeletionState,
} from "../../domain/value-objects/account-deletion.ts";
import {
  CancelAccountDeletionUseCase,
  ExecuteAccountDeletionUseCase,
  GetAccountDeletionStatusUseCase,
  RequestAccountDeletionUseCase,
} from "./account-deletion.use-cases.ts";

const alex = asActorId("actor-alex");
const PASSWORD = "correct horse";
const REQUESTED = new Date("2026-11-10T09:00:00.000Z");
const DEADLINE = new Date("2026-12-10T09:00:00.000Z");

const captaincy: AccountDeletionBlocker = {
  kind: "active-captain",
  competitionId: asCompetitionId("comp-1"),
  competitionName: "Liga Norte",
  teamId: asTeamId("team-1"),
  teamName: "Halcones",
};

function world() {
  const states = new Map<ActorId, AccountDeletionState>();
  const deletedData = new Set<ActorId>();
  const signedIn = new Set<ActorId>([alex]);
  const blockers = new Map<ActorId, AccountDeletionBlocker[]>();
  const published: DomainEvent[] = [];
  let now = REQUESTED;
  let failNextPublish = false;

  const accounts: AccountDeletionRepository = {
    findState: async (actorId) => states.get(actorId) ?? { kind: "active" },
    schedule: async ({ actorId, requestedAt, scheduledFor }) => {
      states.set(actorId, { kind: "scheduled", requestedAt, scheduledFor });
    },
    cancel: async (actorId) => {
      if (states.get(actorId)?.kind === "scheduled") states.delete(actorId);
    },
    listDue: async ({ now: at }) =>
      [...states].flatMap(([actorId, state]) =>
        state.kind === "scheduled" && state.scheduledFor <= at ? [actorId] : [],
      ),
    anonymize: async ({ actorId, deletedAt }) => {
      const state = states.get(actorId);
      if (state?.kind !== "scheduled" || state.scheduledFor > deletedAt) return false;
      deletedData.add(actorId);
      states.set(actorId, { kind: "deleted", deletedAt });
      return true;
    },
  };

  // Mirrors a database transaction: a failure restores the state from before the callback.
  const transaction = {
    runInTransaction: async <T>(operation: () => Promise<T>): Promise<T> => {
      const snapshot = { states: new Map(states), deleted: new Set(deletedData) };
      const before = published.length;
      try {
        return await operation();
      } catch (error) {
        states.clear();
        for (const [key, value] of snapshot.states) states.set(key, value);
        deletedData.clear();
        for (const key of snapshot.deleted) deletedData.add(key);
        published.length = before;
        throw error;
      }
    },
  };

  const deps = {
    accounts,
    blockers: { listBlockers: async (actorId: ActorId) => blockers.get(actorId) ?? [] },
    credentials: {
      verifyPassword: async ({ password }: { password: string }) => password === PASSWORD,
    },
    sessions: {
      revokeAll: async (actorId: ActorId) => {
        signedIn.delete(actorId);
      },
    },
    events: {
      publish: async (event: DomainEvent) => {
        if (failNextPublish) {
          failNextPublish = false;
          throw new Error("teams cleanup failed");
        }
        published.push(event);
      },
      publishMany: async () => undefined,
    },
    transaction,
    clock: { now: () => now },
  };

  return {
    deps,
    states,
    deletedData,
    signedIn,
    blockers,
    published,
    setNow: (at: Date) => {
      now = at;
    },
    failNextPublish: () => {
      failNextPublish = true;
    },
    request: (password = PASSWORD) =>
      new RequestAccountDeletionUseCase(deps).execute({ actorId: alex, password }),
    cancel: () =>
      new CancelAccountDeletionUseCase(accounts, deps.blockers).execute({ actorId: alex }),
    status: () =>
      new GetAccountDeletionStatusUseCase(accounts, deps.blockers).execute({ actorId: alex }),
    runJob: () => new ExecuteAccountDeletionUseCase(deps).execute(),
  };
}

describe("account deletion", () => {
  it("schedules deletion 30 days out and signs the account out everywhere", async () => {
    const w = world();

    const result = await w.request();

    expect(result.isOk() && result.value).toEqual({
      state: { kind: "scheduled", requestedAt: REQUESTED, scheduledFor: DEADLINE },
      blockers: [],
    });
    expect(w.signedIn.has(alex)).toBe(false);
    expect((await w.status()).unwrap()).toEqual({
      state: { kind: "scheduled", requestedAt: REQUESTED, scheduledFor: DEADLINE },
      blockers: [],
    });
  });

  it("refuses a wrong password without scheduling anything", async () => {
    const w = world();

    const result = await w.request("guess");

    expect(!result.isOk() && result.error.code).toBe("identity.reauthentication_failed");
    expect(w.signedIn.has(alex)).toBe(true);
    expect((await w.status()).unwrap()).toEqual({ state: { kind: "active" }, blockers: [] });
  });

  it("explains an active captaincy instead of scheduling", async () => {
    const w = world();
    w.blockers.set(alex, [captaincy]);

    const result = await w.request();

    expect(!result.isOk() && result.error).toMatchObject({
      code: "identity.account_deletion_blocked",
      details: { blockers: [captaincy] },
    });
    expect((await w.status()).unwrap()).toEqual({
      state: { kind: "active" },
      blockers: [captaincy],
    });
  });

  it("keeps the original deadline when the request is repeated", async () => {
    const w = world();
    await w.request();
    w.setNow(new Date("2026-11-20T09:00:00.000Z"));

    const again = await w.request();

    expect(again.isOk() && again.value.state).toEqual({
      kind: "scheduled",
      requestedAt: REQUESTED,
      scheduledFor: DEADLINE,
    });
  });

  it("restores the account as it was when cancelled during the grace period", async () => {
    const w = world();
    await w.request();

    expect((await w.cancel()).unwrap()).toEqual({ state: { kind: "active" }, blockers: [] });
    expect((await w.cancel()).unwrap()).toEqual({ state: { kind: "active" }, blockers: [] });

    w.setNow(new Date("2027-01-01T00:00:00.000Z"));
    await expect(w.runJob()).resolves.toEqual({ deleted: 0, postponed: 0 });
    expect(w.deletedData.has(alex)).toBe(false);
  });

  it("deletes only once the deadline passes, and a second run changes nothing", async () => {
    const w = world();
    await w.request();

    w.setNow(new Date("2026-12-10T08:59:59.999Z"));
    await expect(w.runJob()).resolves.toEqual({ deleted: 0, postponed: 0 });
    expect(w.deletedData.has(alex)).toBe(false);

    w.setNow(DEADLINE);
    await expect(w.runJob()).resolves.toEqual({ deleted: 1, postponed: 0 });
    expect(w.deletedData.has(alex)).toBe(true);
    expect(w.published).toEqual([
      {
        eventName: "identity.actor-deleted",
        occurredAt: DEADLINE.toISOString(),
        payload: { actorId: alex },
      },
    ]);

    await expect(w.runJob()).resolves.toEqual({ deleted: 0, postponed: 0 });
    expect(w.published).toHaveLength(1);
  });

  it("says a deleted account is gone instead of reporting it active", async () => {
    const w = world();
    await w.request();
    w.setNow(DEADLINE);
    await w.runJob();

    for (const outcome of [await w.status(), await w.cancel()]) {
      expect(outcome.isErr() && outcome.error.code).toBe("identity.account_deleted");
    }
  });

  it("postpones a due deletion while a blocker that appeared in the grace period remains", async () => {
    const w = world();
    await w.request();
    w.blockers.set(alex, [captaincy]);
    w.setNow(DEADLINE);

    await expect(w.runJob()).resolves.toEqual({ deleted: 0, postponed: 1 });
    expect(w.deletedData.has(alex)).toBe(false);

    w.blockers.delete(alex);
    await expect(w.runJob()).resolves.toEqual({ deleted: 1, postponed: 0 });
  });

  it("leaves the account scheduled when a reaction fails, so the next run completes it", async () => {
    const w = world();
    await w.request();
    w.setNow(DEADLINE);
    w.failNextPublish();

    await expect(w.runJob()).rejects.toThrow("teams cleanup failed");
    expect(w.deletedData.has(alex)).toBe(false);
    expect(w.states.get(alex)?.kind).toBe("scheduled");

    await expect(w.runJob()).resolves.toEqual({ deleted: 1, postponed: 0 });
    expect(w.published).toHaveLength(1);
  });

  it("applies a configured grace period", async () => {
    const w = world();

    const result = await new RequestAccountDeletionUseCase({ ...w.deps, graceDays: 7 }).execute({
      actorId: alex,
      password: PASSWORD,
    });

    expect(result.isOk() && result.value.state).toEqual({
      kind: "scheduled",
      requestedAt: REQUESTED,
      scheduledFor: new Date("2026-11-17T09:00:00.000Z"),
    });
  });
});
