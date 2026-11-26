import { RejectCompetitionEntryUseCase, type CompetitionEntry } from "@futrob/competitions";
import {
  asActorId,
  asCompetitionId,
  asOrganizationId,
  asTeamId,
  ok,
  type AuthorizationPort,
  type TransactionPort,
} from "@futrob/shared-kernel";
import type { RosterMutationPort } from "@futrob/teams";
import { describe, expect, it } from "vite-plus/test";
import { InMemoryCompetitionEntryRepository } from "@/adapters/competitions/competition-entry.repositories.ts";
import { InMemoryRosterMutationPort } from "@/adapters/teams/roster-mutation.port.ts";
import {
  CompetitionEntryActivity,
  createCompetitionEntryCommands,
} from "./competition-entry-activity.ts";

const entry: CompetitionEntry = {
  id: "entry-1",
  organizationId: asOrganizationId("org-1"),
  competitionId: asCompetitionId("competition-1"),
  teamId: asTeamId("team-1"),
  status: "pending",
  createdAt: new Date("2026-11-25T00:00:00.000Z"),
  creationKey: null,
};

const rejectInput = {
  actorId: asActorId("organizer"),
  organizationId: entry.organizationId,
  competitionId: entry.competitionId,
  entryId: entry.id,
};

function signal() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

/** Answers each `decide` with the next value, repeating the last one. */
function authorizationAnswering(answers: readonly boolean[]): AuthorizationPort {
  let calls = 0;
  return {
    decide: async (request) => {
      const allowed = answers[Math.min(calls++, answers.length - 1)] ?? false;
      return { ...request, allowed, reason: allowed ? "allowed" : "denied" };
    },
    getEffectiveAccess: async (input) => ({ ...input, roles: [], permissions: [] }),
  };
}

/** Entry commands over in-memory stores, recording when rejection asks for the roster lock. */
function setup(options: { readonly allowed: readonly boolean[] }) {
  const order: string[] = [];
  let inTransaction = false;
  const transaction: TransactionPort = {
    runInTransaction: async (operation) => {
      inTransaction = true;
      try {
        return await operation();
      } finally {
        inTransaction = false;
      }
    },
  };
  const roster = new InMemoryRosterMutationPort();
  const lockRequested = signal();
  const rosterMutations: RosterMutationPort = {
    runExclusive: (scope, operation) => {
      order.push(inTransaction ? "lock:in-transaction" : "lock:outside-transaction");
      const run = roster.runExclusive(scope, operation);
      lockRequested.resolve();
      return run;
    },
  };
  const entries = new InMemoryCompetitionEntryRepository();
  entries.rows.set(entry.id, entry);
  const authorization = authorizationAnswering(options.allowed);
  const reject = new RejectCompetitionEntryUseCase({ entries, authorization });
  const decide = { execute: async () => ok(entry) };
  const commands = createCompetitionEntryCommands({
    transaction,
    activity: new CompetitionEntryActivity({
      writer: {
        record: async () => undefined,
        close: async () => undefined,
        email: async () => undefined,
      },
      readers: {
        competitions: { findById: async () => null },
        teams: { findById: async () => null },
      },
    }),
    authorization,
    entries,
    rosterMutations,
    register: decide,
    approve: decide,
    reject: {
      execute: (input) => {
        order.push("reject");
        return reject.execute(input);
      },
    },
  });

  // A roster write that already read the entry as `pending` holds the exclusion.
  const holdRosterWrite = async () => {
    const entered = signal();
    const release = signal();
    const write = roster.runExclusive(entry, async () => {
      entered.resolve();
      await release.promise;
      order.push("write");
    });
    await entered.promise;
    return {
      finish: async () => {
        release.resolve();
        await write;
      },
    };
  };

  return { commands, entries, order, lockRequested, holdRosterWrite };
}

describe("competition entry commands", () => {
  it("rejects an entry only after an in-flight roster write commits, inside its transaction", async () => {
    const { commands, entries, order, lockRequested, holdRosterWrite } = setup({ allowed: [true] });
    const write = await holdRosterWrite();

    const rejecting = commands.rejectTeamEntry.execute(rejectInput);
    await lockRequested.promise;
    expect(order).toEqual(["lock:in-transaction"]);
    expect((await entries.findById(entry.organizationId, entry.id))?.status).toBe("pending");

    await write.finish();
    expect((await rejecting).isOk()).toBe(true);
    expect(order).toEqual(["lock:in-transaction", "write", "reject"]);
    expect((await entries.findById(entry.organizationId, entry.id))?.status).toBe("rejected");
  });

  it("answers an actor without participants.manage without queueing behind roster writes", async () => {
    const { commands, entries, order, lockRequested, holdRosterWrite } = setup({
      allowed: [false],
    });
    const write = await holdRosterWrite();

    const rejecting = commands.rejectTeamEntry.execute(rejectInput);
    const first = await Promise.race([
      rejecting.then(() => "answered"),
      lockRequested.promise.then(() => "queued"),
    ]);

    expect(first).toBe("answered");
    const result = await rejecting;
    expect(result.isErr() && result.error.code).toBe("authorization.forbidden");
    expect(order).toEqual([]);
    expect((await entries.findById(entry.organizationId, entry.id))?.status).toBe("pending");
    await write.finish();
  });

  it("answers a denied pre-check without rejecting, even if access is granted right after", async () => {
    const { commands, entries, order, holdRosterWrite } = setup({ allowed: [false, true] });
    const write = await holdRosterWrite();

    const result = await commands.rejectTeamEntry.execute(rejectInput);

    expect(result.isErr() && result.error.code).toBe("authorization.forbidden");
    expect(order).toEqual([]);
    expect((await entries.findById(entry.organizationId, entry.id))?.status).toBe("pending");
    await write.finish();
  });

  it("answers an entry of another competition without rejecting it", async () => {
    const { commands, entries, order } = setup({ allowed: [true] });

    const result = await commands.rejectTeamEntry.execute({
      ...rejectInput,
      competitionId: asCompetitionId("competition-2"),
    });

    expect(result.isErr() && result.error.code).toBe("competitions.entry_not_found");
    expect(order).toEqual([]);
    expect((await entries.findById(entry.organizationId, entry.id))?.status).toBe("pending");
  });
});
