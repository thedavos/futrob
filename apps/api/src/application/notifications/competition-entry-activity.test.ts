import type { CompetitionEntry } from "@futrob/competitions";
import {
  asActorId,
  asCompetitionId,
  asOrganizationId,
  asTeamId,
  ok,
  type TransactionPort,
} from "@futrob/shared-kernel";
import type { RosterMutationPort } from "@futrob/teams";
import { describe, expect, it } from "vite-plus/test";
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

function signal() {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("competition entry commands", () => {
  it("rejects an entry only after an in-flight roster write commits, inside its transaction", async () => {
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
    const rejectQueued = signal();
    const rosterMutations: RosterMutationPort = {
      runExclusive: (scope, operation) => {
        order.push(inTransaction ? "lock:in-transaction" : "lock:outside-transaction");
        const run = roster.runExclusive(scope, operation);
        rejectQueued.resolve();
        return run;
      },
    };
    const rejectStarted = signal();
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
      entries: { findById: async () => entry },
      rosterMutations,
      register: decide,
      approve: decide,
      reject: {
        execute: async () => {
          order.push("reject");
          rejectStarted.resolve();
          return ok({ ...entry, status: "rejected" as const });
        },
      },
    });

    // A roster write that already read the entry as `pending` holds the exclusion.
    const writeEntered = signal();
    const releaseWrite = signal();
    const write = roster.runExclusive(entry, async () => {
      writeEntered.resolve();
      await releaseWrite.promise;
      order.push("write");
    });
    await writeEntered.promise;

    const rejecting = commands.rejectTeamEntry.execute({
      actorId: asActorId("organizer"),
      organizationId: entry.organizationId,
      competitionId: entry.competitionId,
      entryId: entry.id,
    });
    await Promise.race([rejectQueued.promise, rejectStarted.promise]);
    expect(order).toEqual(["lock:in-transaction"]);

    releaseWrite.resolve();
    await write;
    expect((await rejecting).isOk()).toBe(true);
    expect(order).toEqual(["lock:in-transaction", "write", "reject"]);
  });
});
