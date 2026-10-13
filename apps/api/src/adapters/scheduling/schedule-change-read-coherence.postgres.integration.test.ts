import { Pool, type PoolClient, type QueryResult } from "pg";
import { describe, expect, it } from "vite-plus/test";
import { PostgresScheduleChangeRequestRepository } from "./schedule-change-request.repository.ts";
import {
  barrier,
  D,
  encounter,
  expiryFlow,
  freshExpiryDatabase,
  org,
  S1,
  unwrap,
} from "@/testing/schedule-change-expiry.test-helper.ts";
import type { ScheduleChangeRequest } from "@futrob/scheduling";

const suite = describe.skipIf(!process.env.TEST_DATABASE_URL);

function pauseAfterHeader(pool: Pool) {
  const reached = barrier();
  const resume = barrier();
  let armed = true;
  function intercept(executor: Pool | PoolClient) {
    executor.query = new Proxy(executor.query, {
      apply(target, receiver, args) {
        const output = Reflect.apply(target, receiver, args);
        if (!(output instanceof Promise)) return output;
        return output.then(async (result: QueryResult) => {
          if (
            armed &&
            typeof args[0] === "string" &&
            args[0].includes("FROM schedule_change_requests AS request")
          ) {
            armed = false;
            reached.release();
            await resume.promise;
          }
          return result;
        });
      },
    });
  }
  intercept(pool);
  pool.on("connect", intercept);
  return { reached: reached.promise, resume: resume.release };
}

function observable(request: ScheduleChangeRequest) {
  return {
    status: request.status,
    version: request.version,
    proposals: request.proposals.map((proposal) => proposal.proposedStartAt.toISOString()),
    actions: request.actions.map((action) => ({ kind: action.kind, toVersion: action.toVersion })),
    application: request.application?.appliedEncounterStartAt.toISOString() ?? null,
  };
}

suite("durable aggregate read coherence", { timeout: 60_000 }, () => {
  it.each([
    "findById",
    "findByIdempotencyKey",
    "listByEncounter",
    "listActiveByEncounter",
  ] as const)(
    "%s returns one state when expiry commits between header and history reads",
    async (method) => {
      const database = await freshExpiryDatabase();
      const readerPool = new Pool({
        connectionString: process.env.TEST_DATABASE_URL,
        options: `-c search_path=${database.schema}`,
      });
      const gate = pauseAfterHeader(readerPool);
      try {
        const flow = expiryFlow(database.pool);
        const created = unwrap(await flow.create());
        const reader = new PostgresScheduleChangeRequestRepository(readerPool);
        const reading =
          method === "findById"
            ? reader.findById(org, created.id)
            : method === "findByIdempotencyKey"
              ? reader.findByIdempotencyKey(org, "initial")
              : method === "listByEncounter"
                ? reader.listByEncounter(org, encounter).then((rows) => rows[0] ?? null)
                : reader.listActiveByEncounter(org, encounter).then((rows) => rows[0] ?? null);
        await gate.reached;
        flow.at(D);
        expect(unwrap(await flow.expire(created))).toEqual({ status: "escalated" });
        gate.resume();
        const read = await reading;
        if (!read) throw new Error("Missing request during read");
        expect(observable(read)).toEqual({
          status: "open",
          version: 1,
          proposals: [S1],
          actions: [],
          application: null,
        });
        const after = await reader.findById(org, created.id);
        if (!after) throw new Error("Missing request after expiry");
        expect(observable(after)).toEqual({
          status: "escalated",
          version: 2,
          proposals: [S1],
          actions: [{ kind: "schedule_change_expired", toVersion: 2 }],
          application: null,
        });
      } finally {
        gate.resume();
        await readerPool.end();
        await database.drop();
      }
    },
  );
  it.each(["counter", "resolve"] as const)(
    "does not mix a %s history or application into the preceding request version",
    async (transition) => {
      const database = await freshExpiryDatabase();
      const readerPool = new Pool({
        connectionString: process.env.TEST_DATABASE_URL,
        options: `-c search_path=${database.schema}`,
      });
      const gate = pauseAfterHeader(readerPool);
      try {
        const flow = expiryFlow(database.pool);
        let before = unwrap(await flow.create());
        if (transition === "resolve") {
          flow.at(D);
          unwrap(await flow.expire(before));
          before = await flow.read(before);
        }
        const reader = new PostgresScheduleChangeRequestRepository(readerPool);
        const reading = reader.findById(org, before.id);
        await gate.reached;
        if (transition === "counter") unwrap(await flow.counter(before));
        else
          unwrap(
            await flow.resolve(before, {
              outcome: "schedule_set",
              reason: "Organizer sets a new date",
              proposedStartAt: new Date("2026-11-04T22:00:00.000Z"),
            }),
          );
        gate.resume();
        const during = await reading;
        if (!during) throw new Error("Missing request during transition");
        expect(observable(during)).toEqual({
          status: transition === "counter" ? "open" : "escalated",
          version: transition === "counter" ? 1 : 2,
          proposals: [S1],
          actions:
            transition === "counter" ? [] : [{ kind: "schedule_change_expired", toVersion: 2 }],
          application: null,
        });
        const after = await reader.findById(org, before.id);
        if (!after) throw new Error("Missing request after transition");
        expect(observable(after)).toEqual(
          transition === "counter"
            ? {
                status: "open",
                version: 2,
                proposals: [S1, "2026-11-03T21:00:00.000Z"],
                actions: [],
                application: null,
              }
            : {
                status: "resolved_by_organizer",
                version: 3,
                proposals: [S1],
                actions: [
                  { kind: "schedule_change_expired", toVersion: 2 },
                  { kind: "schedule_change_resolved", toVersion: 3 },
                ],
                application: "2026-11-04T22:00:00.000Z",
              },
        );
      } finally {
        gate.resume();
        await readerPool.end();
        await database.drop();
      }
    },
  );
});
