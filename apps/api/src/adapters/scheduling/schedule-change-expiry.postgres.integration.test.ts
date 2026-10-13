import type { IsolatedSchema } from "@/testing/isolated-schema.ts";
import { migrateIsolatedSchema } from "@/testing/isolated-schema.ts";
import { asActorId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import { afterEach, describe, expect, it } from "vite-plus/test";
import {
  freshExpiryDatabase,
  expiryFlow,
  durableSchedule,
  durableCounts,
  unwrap,
  code,
  barrier,
  P,
  K,
  D,
  S1,
  SLOT2,
  org,
  encounter,
  competition,
  captainA,
  captainB,
  teamA,
  teamB,
} from "@/testing/schedule-change-expiry.test-helper.ts";

const schemas: IsolatedSchema[] = [];
const suite = describe.skipIf(!process.env.TEST_DATABASE_URL);
async function database(options: Parameters<typeof freshExpiryDatabase>[0] = {}) {
  const schema = await freshExpiryDatabase(options);
  schemas.push(schema);
  return schema.pool;
}
const untouched = {
  encounter: K,
  fixture: K,
  slots: [
    { slot: 1, at: K, status: "scheduled" },
    { slot: 2, at: SLOT2, status: "scheduled" },
  ],
};
const matrix = [
  ["V32-01", "13:59:59.999", true, true],
  ["V32-02", "14:00:00.000", true, false],
  ["V32-03", "17:59:59.999", true, false],
  ["V32-04", "18:00:00.000", true, false],
  ["V32-05", "19:59:59.999", true, false],
  ["V32-06", "20:00:00.000", false, false],
  ["V32-07", "20:00:00.001", false, false],
] as const;

suite("DEC-032/033 durable outcomes on isolated Postgres", { timeout: 60_000 }, () => {
  afterEach(async () => {
    for (const schema of schemas.splice(0)) await schema.drop();
  });
  for (const hours of [12, 6]) {
    for (const [id, time, twelve, six] of matrix) {
      it(`${id} accepts at ${time} with stage ${hours}h only before its deadline`, async () => {
        const pool = await database({ hours });
        const flow = expiryFlow(pool);
        const created = unwrap(await flow.create());
        expect(created.proposals[0]!.responseDeadline.toISOString()).toBe(
          hours === 12 ? D : "2026-11-01T14:00:00.000Z",
        );
        flow.at(`2026-11-01T${time}Z`);
        const result = await flow.accept(created);
        if (hours === 12 ? twelve : six) {
          expect(code(result)).toBe("ok");
          expect((await flow.read(created)).status).toBe("accepted");
          expect(await durableSchedule(pool)).toEqual({
            encounter: S1,
            fixture: S1,
            slots: [
              { slot: 1, at: S1, status: "scheduled" },
              { slot: 2, at: "2026-11-02T21:00:00.000Z", status: "scheduled" },
            ],
          });
          expect(await flow.quota()).toBe(1);
        } else {
          expect(code(result)).toBe("scheduling.schedule_change_response_window_closed");
          expect(await flow.read(created)).toMatchObject({
            status: "open",
            version: 1,
            decisions: [],
            actions: [],
            application: null,
          });
          expect(await durableSchedule(pool)).toEqual(untouched);
          expect(await flow.quota()).toBe(0);
        }
      });
    }
    it(`V32-08 refuses rejection at exact deadline (${hours}h) without a runner`, async () => {
      const pool = await database({ hours });
      const flow = expiryFlow(pool);
      const created = unwrap(await flow.create());
      flow.at(D);
      expect(code(await flow.reject(created))).toBe(
        "scheduling.schedule_change_response_window_closed",
      );
      expect(await flow.read(created)).toMatchObject({
        status: "open",
        version: 1,
        decisions: [],
        actions: [],
      });
    });
    for (const [id, time, status] of [
      ["V32-09", "2026-11-01T19:59:59.999Z", hours === 12 ? "skipped" : "escalated"],
      ["V32-10/16", D, "escalated"],
    ] as const) {
      it(`${id} runner ${hours}h evaluates ${time} and never applies by silence`, async () => {
        const pool = await database({ hours });
        const flow = expiryFlow(pool);
        const created = unwrap(await flow.create());
        flow.at(time);
        expect(unwrap(await flow.expire(created))).toEqual({ status });
        expect(await durableSchedule(pool)).toEqual(untouched);
        expect(await flow.quota()).toBe(0);
        const stored = await flow.read(created);
        expect(stored.status).toBe(status === "skipped" ? "open" : "escalated");
        if (status === "escalated")
          expect(stored.actions).toMatchObject([
            {
              kind: "schedule_change_expired",
              authority: "system",
              fromVersion: 1,
              toVersion: 2,
              responseDeadline: new Date(hours === 12 ? D : "2026-11-01T14:00:00.000Z"),
              processedAt: new Date(time),
            },
          ]);
        else expect(stored.actions).toEqual([]);
        expect(await flow.handoffs()).toEqual([]);
      });
    }
    for (const [id, time, allowed] of [
      ["V32-11", "2026-11-01T12:00:00.000Z", true],
      ["V32-12", "2026-11-01T14:00:00.000Z", hours === 12],
      ["V32-13", D, false],
    ] as const) {
      it(`${id} counter ${hours}h replaces deadline only when on time`, async () => {
        const pool = await database({ hours });
        const flow = expiryFlow(pool);
        const created = unwrap(await flow.create());
        flow.at(time);
        const result = await flow.counter(created);
        const stored = await flow.read(created);
        if (allowed) {
          expect(code(result)).toBe("ok");
          expect(stored.proposals).toHaveLength(2);
          expect(stored.version).toBe(2);
          const expected =
            time === "2026-11-01T12:00:00.000Z"
              ? hours === 12
                ? "2026-11-02T00:00:00.000Z"
                : "2026-11-01T18:00:00.000Z"
              : "2026-11-02T02:00:00.000Z";
          expect(stored.proposals[1]).toMatchObject({
            createdAt: new Date(time),
            responseDeadline: new Date(expected),
            proposedStartAt: new Date("2026-11-03T21:00:00.000Z"),
          });
          expect(code(await flow.accept({ ...stored, proposals: [created.proposals[0]!] }))).toBe(
            "scheduling.schedule_change_proposal_stale",
          );
        } else {
          expect(code(result)).toBe("scheduling.schedule_change_response_window_closed");
          expect(stored.proposals).toHaveLength(1);
          expect(stored.version).toBe(1);
        }
        expect(await durableSchedule(pool)).toEqual(untouched);
      });
    }
  }
  it("V32-15 reads frozen stage hours, current counter deadline supersedes old due time", async () => {
    const pool = await database();
    const flow = expiryFlow(pool);
    const initial = unwrap(await flow.create());
    flow.at("2026-11-01T12:00:00.000Z");
    const current = unwrap(await flow.counter(initial)).request;
    expect(current.proposals.at(-1)!.responseDeadline.toISOString()).toBe(
      "2026-11-02T00:00:00.000Z",
    );
    flow.at(D);
    expect(await flow.due()).toEqual([]);
    expect(unwrap(await flow.expire(current))).toEqual({ status: "skipped" });
    flow.at("2026-11-02T00:00:00.000Z");
    expect(await flow.due()).toEqual([
      { organizationId: org, encounterId: encounter, requestId: initial.id },
    ]);
    expect(unwrap(await flow.expire(current))).toEqual({ status: "escalated" });
  });
  it("V32-17/21 accept wins an actual PG lock race; late replay returns historical acceptance", async () => {
    const pool = await database();
    const entered = barrier();
    const release = barrier();
    const contender = barrier();
    const accepting = expiryFlow(pool, {
      beforeCommit: async () => {
        entered.release();
        await release.promise;
      },
    });
    const created = unwrap(await accepting.create());
    accepting.at("2026-11-01T19:59:59.999Z");
    const accepted = accepting.accept(created);
    await entered.promise;
    const expiring = expiryFlow(pool, { beforeLock: () => contender.release() });
    expiring.at(D);
    const expired = expiring.expire(created);
    await contender.promise;
    release.release();
    expect(unwrap(await accepted).request.status).toBe("accepted");
    expect(unwrap(await expired)).toEqual({ status: "skipped" });
    const restarted = expiryFlow(pool);
    restarted.at("2026-11-03T08:00:00.000Z");
    const replay = unwrap(await restarted.accept(created));
    expect(replay).toMatchObject({
      replayed: true,
      request: { status: "accepted", version: 2, actions: [] },
    });
    expect(await restarted.quota()).toBe(1);
    expect(await durableCounts(pool)).toMatchObject({
      schedule_change_actions: 0,
      schedule_change_applications: 1,
      schedule_change_command_receipts: 1,
    });
  });
  it("V32-18/35 delayed runner escalates once after a late accept was refused", async () => {
    const pool = await database();
    const flow = expiryFlow(pool);
    const created = unwrap(await flow.create());
    flow.at("2026-11-01T20:00:00.001Z");
    expect(code(await flow.accept(created))).toBe(
      "scheduling.schedule_change_response_window_closed",
    );
    flow.at("2026-11-02T03:00:00.000Z");
    expect(unwrap(await flow.expire(created))).toEqual({ status: "escalated" });
    expect(unwrap(await flow.expire(created))).toEqual({ status: "skipped" });
    expect(await durableCounts(pool)).toMatchObject({
      schedule_change_actions: 1,
      schedule_change_applications: 0,
      schedule_change_command_receipts: 1,
    });
    expect(await durableSchedule(pool)).toEqual(untouched);
  });
  it("V32-19 expire wins an actual PG lock race and rejects accept after the durable transition", async () => {
    const pool = await database();
    const seed = expiryFlow(pool);
    const created = unwrap(await seed.create());
    const entered = barrier();
    const release = barrier();
    const contender = barrier();
    const expiring = expiryFlow(pool, {
      beforeCommit: async () => {
        entered.release();
        await release.promise;
      },
    });
    expiring.at(D);
    const expired = expiring.expire(created);
    await entered.promise;
    const accepting = expiryFlow(pool, { beforeLock: () => contender.release() });
    accepting.at("2026-11-01T20:00:00.100Z");
    const accepted = accepting.accept(created);
    await contender.promise;
    release.release();
    expect(unwrap(await expired)).toEqual({ status: "escalated" });
    expect(code(await accepted)).toBe("scheduling.schedule_change_request_closed");
    expect(await durableSchedule(pool)).toEqual(untouched);
    expect(await durableCounts(pool)).toMatchObject({
      schedule_change_actions: 1,
      schedule_change_applications: 0,
    });
  });
  it("reads time only after acquiring the PG Encounter lock when an accept crosses the exact deadline", async () => {
    const pool = await database();
    const holder = expiryFlow(pool);
    const created = unwrap(await holder.create());
    const held = barrier();
    const release = barrier();
    const queued = barrier();
    const locked = holder.deps.transaction.runInTransaction(() =>
      holder.deps.mutationLock.runExclusive(encounter, async () => {
        held.release();
        await release.promise;
      }),
    );
    await held.promise;
    const responder = expiryFlow(pool, { beforeLock: () => queued.release() });
    responder.at("2026-11-01T19:59:59.999Z");
    const response = responder.accept(created);
    await queued.promise;
    responder.at(D);
    release.release();
    await locked;
    expect(code(await response)).toBe("scheduling.schedule_change_response_window_closed");
    expect(await durableSchedule(pool)).toEqual(untouched);
    expect(await durableCounts(pool)).toMatchObject({
      schedule_change_decisions: 0,
      schedule_change_applications: 0,
    });
  });
  it("V32-20 preserves partial consent without resetting deadline or applying schedule", async () => {
    const pool = await database({ organizerRequired: true });
    const flow = expiryFlow(pool);
    const initial = unwrap(await flow.create());
    flow.at("2026-11-01T19:59:59.999Z");
    const partial = unwrap(await flow.accept(initial)).request;
    expect(partial).toMatchObject({ status: "open", version: 2 });
    expect(partial.decisions).toMatchObject([
      { kind: "consent", responder: { authority: "rival_team", teamId: teamB } },
    ]);
    expect(partial.proposals[0]!.responseDeadline.toISOString()).toBe(D);
    flow.at(D);
    unwrap(await flow.expire(partial));
    const stored = await flow.read(initial);
    expect(stored).toMatchObject({ status: "escalated", version: 3, application: null });
    expect(stored.decisions).toHaveLength(1);
    expect(await durableSchedule(pool)).toEqual(untouched);
  });
  it("counter resets consent and late historical partial-consent replay preserves original version", async () => {
    const pool = await database({ organizerRequired: true });
    const flow = expiryFlow(pool);
    const initial = unwrap(await flow.create());
    flow.at("2026-11-01T10:00:00.000Z");
    const partial = unwrap(await flow.accept(initial, "organizer-consent", true)).request;
    flow.at("2026-11-01T12:00:00.000Z");
    const current = unwrap(await flow.counter(partial)).request;
    flow.at("2026-11-02T00:00:00.000Z");
    unwrap(await flow.expire(current));
    const replay = unwrap(await flow.accept(initial, "organizer-consent", true));
    expect(replay).toMatchObject({
      replayed: true,
      request: { status: "open", version: 2, actions: [] },
    });
    expect(replay.request.proposals).toHaveLength(1);
    expect(await flow.read(initial)).toMatchObject({ status: "escalated", version: 4 });
    expect(await durableSchedule(pool)).toEqual(untouched);
  });
  for (const hours of [12, 6])
    it(`V32-22/23 kickoff never caps the ${hours}h proposal deadline`, async () => {
      const pool = await database({ hours });
      const flow = expiryFlow(pool);
      flow.at("2026-11-01T19:00:00.000Z");
      const created = unwrap(await flow.create());
      expect(created.proposals[0]!.responseDeadline.toISOString()).toBe(
        hours === 12 ? "2026-11-02T07:00:00.000Z" : "2026-11-02T01:00:00.000Z",
      );
      expect(await flow.due()).toEqual([]);
    });
  it("V32-24/25 past proposed start cannot apply, but its original deadline still triggers escalation", async () => {
    const pool = await database();
    const flow = expiryFlow(pool);
    const created = unwrap(await flow.create({ day: 1, hour: 12 }));
    flow.at("2026-11-01T19:00:00.000Z");
    expect(code(await flow.accept(created))).toBe("scheduling.invalid_schedule_change_date");
    expect(await flow.read(created)).toMatchObject({
      status: "open",
      version: 1,
      decisions: [],
      application: null,
    });
    flow.at(D);
    unwrap(await flow.expire(created));
    expect(await flow.read(created)).toMatchObject({ status: "escalated", version: 2 });
    expect(await durableSchedule(pool)).toEqual(untouched);
  });
  for (const hours of [undefined, 6])
    it(`V32-26 legacy ${hours ?? "default12"}h is anchored retroactively; terminal requests stay terminal`, async () => {
      const pool = await database({ legacy: true, hours });
      for (const [id, status] of [
        ["legacy-open", "open"],
        ["legacy-rejected", "rejected"],
        ["legacy-cancelled", "cancelled"],
      ] as const) {
        await pool.query(
          `INSERT INTO schedule_change_requests (id,organization_id,competition_id,encounter_id,requesting_team_id,initiated_by_actor_id,scope_type,official_slot,status,idempotency_key,created_at,updated_at,version) VALUES ($1,$2,$3,$4,$5,$6,'entire_encounter',NULL,$7,$1,'2026-10-20T08:00:00Z','2026-10-20T08:00:00Z',1)`,
          [id, org, competition, encounter, teamA, captainA, status],
        );
        await pool.query(
          `INSERT INTO schedule_change_proposals (id,request_id,organization_id,proposed_start_at,proposed_by_actor_id,proposed_by_team_id,reason,created_at,proposal_order) VALUES ($1,$2,$3,$4,$5,$6,'Legacy proposal','2026-10-20T08:00:00Z',1)`,
          [`${id}-p`, id, org, S1, captainA, teamA],
        );
      }
      const migrated = await migrateIsolatedSchema(pool);
      expect(migrated.applied).toContain("0055_schedule_change_expiry_resolution.sql");
      expect((await migrateIsolatedSchema(pool)).applied).toEqual([]);
      const flow = expiryFlow(pool);
      const legacy = (await flow.requests.findById(org, "legacy-open"))!;
      expect(legacy.proposals[0]!.responseDeadline.toISOString()).toBe(
        hours === 6 ? "2026-10-20T14:00:00.000Z" : "2026-10-20T20:00:00.000Z",
      );
      expect(code(await flow.accept(legacy))).toBe(
        "scheduling.schedule_change_response_window_closed",
      );
      expect(await flow.due()).toEqual([
        { organizationId: org, encounterId: encounter, requestId: "legacy-open" },
      ]);
      unwrap(await flow.expire(legacy));
      expect((await flow.requests.findById(org, "legacy-rejected"))?.status).toBe("rejected");
      expect((await flow.requests.findById(org, "legacy-cancelled"))?.status).toBe("cancelled");
      expect(await durableSchedule(pool)).toEqual(untouched);
    });
  it("V32-27 schedule_set applies scope atomically, quota belongs to opening Team and durable handoff survives new adapters", async () => {
    const pool = await database();
    const flow = expiryFlow(pool);
    const initial = unwrap(await flow.create());
    flow.at(D);
    unwrap(await flow.expire(initial));
    const escalated = await flow.read(initial);
    flow.at("2026-11-02T09:00:00.000Z");
    const result = unwrap(
      await flow.resolve(escalated, {
        outcome: "schedule_set",
        reason: "  Agreed by organizer  ",
        proposedStartAt: new Date("2026-11-03T19:00:00.000Z"),
      }),
    );
    expect(result.request).toMatchObject({ status: "resolved_by_organizer", version: 3 });
    expect(result.request.actions.at(-1)?.resolution).toEqual({
      outcome: "schedule_set",
      reason: "Agreed by organizer",
      proposedStartAt: new Date("2026-11-03T19:00:00.000Z"),
    });
    expect(await durableSchedule(pool)).toEqual({
      encounter: "2026-11-03T19:00:00.000Z",
      fixture: "2026-11-03T19:00:00.000Z",
      slots: [
        { slot: 1, at: "2026-11-03T19:00:00.000Z", status: "scheduled" },
        { slot: 2, at: "2026-11-03T20:00:00.000Z", status: "scheduled" },
      ],
    });
    expect(await flow.quota(teamA)).toBe(1);
    expect(await flow.quota(teamB)).toBe(0);
    const restarted = expiryFlow(pool);
    expect(await restarted.handoffs()).toEqual([
      {
        applicationId: result.request.application!.id,
        requestId: initial.id,
        organizationId: org,
        encounterId: encounter,
        appliedAt: new Date("2026-11-02T09:00:00.000Z"),
      },
    ]);
    expect(await durableCounts(pool)).toMatchObject({
      official_results: 0,
      competition_standing_snapshots: 0,
      schedule_change_actions: 2,
      schedule_change_applications: 1,
    });
  });
  it("V32-28 rejects a past organizer date without new audit, receipt or application", async () => {
    const pool = await database();
    const flow = expiryFlow(pool);
    const initial = unwrap(await flow.create());
    flow.at(D);
    unwrap(await flow.expire(initial));
    const escalated = await flow.read(initial);
    flow.at("2026-11-02T09:00:00.000Z");
    const before = await durableCounts(pool);
    expect(
      code(
        await flow.resolve(escalated, {
          outcome: "schedule_set",
          reason: "Past",
          proposedStartAt: new Date("2026-11-02T08:00:00.000Z"),
        }),
      ),
    ).toBe("scheduling.invalid_schedule_change_date");
    expect(await durableCounts(pool)).toEqual(before);
    expect(await durableSchedule(pool)).toEqual(untouched);
  });
  it("V32-29/30/34 escalated remains active, blocks incompatible create, and rejects Team negotiation", async () => {
    const pool = await database();
    const flow = expiryFlow(pool);
    const initial = unwrap(await flow.create());
    flow.at(D);
    unwrap(await flow.expire(initial));
    const escalated = await flow.read(initial);
    expect(code(await flow.accept(escalated))).toBe("scheduling.schedule_change_request_closed");
    expect(code(await flow.counter(escalated))).toBe("scheduling.schedule_change_request_closed");
    expect(code(await flow.reject(escalated))).toBe("scheduling.schedule_change_request_closed");
    expect(
      (await flow.requests.listActiveByEncounter(org, encounter)).map((request) => request.id),
    ).toEqual([initial.id]);
    expect(
      code(await flow.create({ key: "incompatible", actorId: captainB, requestingTeamId: teamB })),
    ).toBe("scheduling.active_schedule_change_request_exists");
    expect(await durableSchedule(pool)).toEqual(untouched);
  });
  it("V32-31 keeps schedule, quota and projections intact, then allows a new request", async () => {
    const pool = await database();
    const flow = expiryFlow(pool);
    const initial = unwrap(await flow.create());
    flow.at(D);
    unwrap(await flow.expire(initial));
    const escalated = await flow.read(initial);
    const resolved = unwrap(
      await flow.resolve(escalated, {
        outcome: "schedule_kept",
        reason: "No agreement; keep current slot",
      }),
    );
    expect(resolved.request.status).toBe("resolved_by_organizer");
    expect(resolved.request.application).toBeNull();
    expect(await flow.quota()).toBe(0);
    expect(await durableSchedule(pool)).toEqual(untouched);
    expect(await flow.handoffs()).toEqual([]);
    expect(await durableCounts(pool)).toMatchObject({
      official_results: 0,
      competition_standing_snapshots: 0,
      schedule_change_applications: 0,
    });
    expect(unwrap(await flow.create({ key: "next" })).status).toBe("open");
  });
  it("V32-32 walkover records explicit winning Team and reason with zero official result/statistics effects", async () => {
    const pool = await database();
    const flow = expiryFlow(pool);
    const initial = unwrap(await flow.create());
    flow.at(D);
    unwrap(await flow.expire(initial));
    const escalated = await flow.read(initial);
    const result = unwrap(
      await flow.resolve(escalated, {
        outcome: "walkover_intended",
        winningTeamId: teamA,
        reason: "rival no respondió",
      }),
    );
    expect(result.request).toMatchObject({ status: "resolved_by_organizer", application: null });
    expect(result.request.actions.at(-1)?.resolution).toEqual({
      outcome: "walkover_intended",
      winningTeamId: teamA,
      reason: "rival no respondió",
    });
    expect(await durableSchedule(pool)).toEqual(untouched);
    expect(await flow.quota()).toBe(0);
    expect(await flow.handoffs()).toEqual([]);
    expect(
      flow.events.filter((event) => event.eventName === "results.official-result-approved"),
    ).toEqual([]);
    expect(await durableCounts(pool)).toMatchObject({
      official_results: 0,
      competition_standing_snapshots: 0,
      schedule_change_applications: 0,
    });
  });
  it("V32-33 refuses walkover without a named Team instead of choosing a loser by silence", async () => {
    const pool = await database();
    const flow = expiryFlow(pool);
    const initial = unwrap(await flow.create());
    flow.at(D);
    unwrap(await flow.expire(initial));
    const escalated = await flow.read(initial);
    flow.at("2026-11-02T09:00:00.000Z");
    const before = await durableCounts(pool);
    expect(
      code(
        await flow.resolve(escalated, {
          outcome: "walkover_intended",
          winningTeamId: asTeamId(""),
          reason: "rival no respondió",
        }),
      ),
    ).toBe("scheduling.invalid_schedule_change_resolution");
    expect(await durableCounts(pool)).toEqual(before);
    expect(await flow.read(initial)).toMatchObject({ status: "escalated", version: 2 });
    expect(await durableSchedule(pool)).toEqual(untouched);
  });
  it("Late consent never substitutes for the organizer resolution, before or after the runner", async () => {
    const pool = await database();
    const flow = expiryFlow(pool);
    const initial = unwrap(await flow.create());
    flow.at(D);
    expect(code(await flow.accept(initial))).toBe(
      "scheduling.schedule_change_response_window_closed",
    );
    unwrap(await flow.expire(initial));
    expect(code(await flow.accept(await flow.read(initial)))).toBe(
      "scheduling.schedule_change_request_closed",
    );
    expect(await durableSchedule(pool)).toEqual(untouched);
  });
  it("V32-36 organizer date bypasses minimum notice but completed slot remains protected", async () => {
    const pool = await database();
    const flow = expiryFlow(pool);
    const initial = unwrap(await flow.create());
    flow.at(D);
    unwrap(await flow.expire(initial));
    const escalated = await flow.read(initial);
    flow.at("2026-11-02T09:00:00.000Z");
    await pool.query(
      `UPDATE competition_rules SET regular_stage = jsonb_set(regular_stage, '{minimumRescheduleNoticeHours}', '12')`,
    );
    await pool.query(`UPDATE official_matches SET status='completed' WHERE slot=2`);
    expect(
      code(
        await flow.resolve(escalated, {
          outcome: "schedule_set",
          reason: "Organizer",
          proposedStartAt: new Date("2026-11-02T12:00:00.000Z"),
        }),
      ),
    ).toBe("scheduling.encounter_not_editable_for_schedule_change");
    await pool.query(`UPDATE official_matches SET status='scheduled' WHERE slot=2`);
    expect(
      unwrap(
        await flow.resolve(escalated, {
          outcome: "schedule_set",
          reason: "Emergency within three hours",
          proposedStartAt: new Date("2026-11-02T12:00:00.000Z"),
        }),
      ).request.status,
    ).toBe("resolved_by_organizer");
    expect((await durableSchedule(pool)).encounter).toBe("2026-11-02T12:00:00.000Z");
  });
  it("Organizer resolution replay after adapter restart returns historical outcome and one audit/application", async () => {
    const pool = await database();
    const flow = expiryFlow(pool);
    const initial = unwrap(await flow.create());
    flow.at(D);
    unwrap(await flow.expire(initial));
    const escalated = await flow.read(initial);
    const resolution = {
      outcome: "schedule_set",
      reason: "Organizer replay",
      proposedStartAt: new Date(S1),
    } as const;
    unwrap(await flow.resolve(escalated, resolution));
    const before = await durableCounts(pool);
    const restarted = expiryFlow(pool);
    restarted.at("2026-11-03T08:00:00.000Z");
    const replay = unwrap(await restarted.resolve(escalated, resolution));
    expect(replay).toMatchObject({
      replayed: true,
      request: { status: "resolved_by_organizer", version: 3 },
    });
    expect(await durableCounts(pool)).toEqual(before);
    expect(await restarted.quota()).toBe(1);
    expect(code(await restarted.resolve(escalated, { ...resolution, reason: "different" }))).toBe(
      "scheduling.schedule_change_idempotency_conflict",
    );
    restarted.revoke();
    expect(code(await restarted.resolve(escalated, resolution))).toBe(
      "scheduling.schedule_change_encounter_not_found",
    );
  });
  it("rolls back schedule_set audit, receipt, application, quota, slots and snapshot when later fixture write fails", async () => {
    const pool = await database();
    const initialFlow = expiryFlow(pool);
    const initial = unwrap(await initialFlow.create());
    initialFlow.at(D);
    unwrap(await initialFlow.expire(initial));
    const escalated = await initialFlow.read(initial);
    const before = await durableCounts(pool);
    const failing = expiryFlow(pool, { fixtureFails: true });
    failing.at(D);
    const resolution = {
      outcome: "schedule_set",
      reason: "Organizer rollback",
      proposedStartAt: new Date(S1),
    } as const;
    expect(code(await failing.resolve(escalated, resolution))).toBe(
      "scheduling.fixture_update_conflict",
    );
    expect(await durableCounts(pool)).toEqual(before);
    expect(await durableSchedule(pool)).toEqual(untouched);
    expect(await failing.quota()).toBe(0);
    expect(await failing.handoffs()).toEqual([]);
    const healthy = expiryFlow(pool);
    healthy.at(D);
    expect(unwrap(await healthy.resolve(escalated, resolution)).request.status).toBe(
      "resolved_by_organizer",
    );
    expect(await healthy.quota()).toBe(1);
  });
  it("rolls back escalation audit and receipt on a transaction failure, and a fresh runner recovers", async () => {
    const pool = await database();
    const seed = expiryFlow(pool);
    const created = unwrap(await seed.create());
    const failing = expiryFlow(pool, {
      afterCommit: async () => {
        throw new Error("expiry storage failure");
      },
    });
    failing.at(D);
    await expect(failing.expire(created)).rejects.toThrow("expiry storage failure");
    expect(await seed.read(created)).toMatchObject({ status: "open", version: 1, actions: [] });
    expect(await durableCounts(pool)).toMatchObject({
      schedule_change_actions: 0,
      schedule_change_command_receipts: 0,
      schedule_change_applications: 0,
    });
    const fresh = expiryFlow(pool);
    fresh.at(D);
    expect(await fresh.due()).toEqual([
      { organizationId: org, encounterId: encounter, requestId: created.id },
    ]);
    unwrap(await fresh.expire(created));
    expect(await fresh.due()).toEqual([]);
    expect(await fresh.read(created)).toMatchObject({ status: "escalated", version: 2 });
  });
  it("rolls back the applied organizer schedule when the publisher fails after durable writes", async () => {
    const pool = await database();
    const seed = expiryFlow(pool);
    const initial = unwrap(await seed.create());
    seed.at(D);
    unwrap(await seed.expire(initial));
    const escalated = await seed.read(initial);
    const before = await durableCounts(pool);
    const failing = expiryFlow(pool, { publishFails: true });
    failing.at(D);
    await expect(
      failing.resolve(escalated, {
        outcome: "schedule_set",
        reason: "Rollback after slots",
        proposedStartAt: new Date(S1),
      }),
    ).rejects.toThrow("expiry test publisher failure");
    expect(await durableCounts(pool)).toEqual(before);
    expect(await durableSchedule(pool)).toEqual(untouched);
    expect(await failing.quota()).toBe(0);
    expect(await failing.handoffs()).toEqual([]);
    expect(await failing.read(initial)).toMatchObject({ status: "escalated", version: 2 });
  });
  it("moves only scoped slot2 and keeps encounter/fixture start unchanged while consuming opening Team quota", async () => {
    const pool = await database();
    const flow = expiryFlow(pool);
    const created = unwrap(
      await flow.create({ scope: { type: "official_match", officialSlot: 2 }, hour: 21 }),
    );
    flow.at(D);
    unwrap(await flow.expire(created));
    const escalated = await flow.read(created);
    unwrap(
      await flow.resolve(escalated, {
        outcome: "schedule_set",
        reason: "Second leg only",
        proposedStartAt: new Date("2026-11-03T21:00:00.000Z"),
      }),
    );
    expect(await durableSchedule(pool)).toEqual({
      encounter: K,
      fixture: K,
      slots: [
        { slot: 1, at: K, status: "scheduled" },
        { slot: 2, at: "2026-11-03T21:00:00.000Z", status: "scheduled" },
      ],
    });
    expect(await flow.quota()).toBe(1);
  });
  it("validates reason, winning Team, denied capability and tenant before any organizer writes", async () => {
    const pool = await database();
    const flow = expiryFlow(pool);
    const initial = unwrap(await flow.create());
    flow.at(D);
    unwrap(await flow.expire(initial));
    const escalated = await flow.read(initial);
    const before = await durableCounts(pool);
    expect(code(await flow.resolve(escalated, { outcome: "schedule_kept", reason: "  " }))).toBe(
      "scheduling.invalid_schedule_change_resolution",
    );
    expect(
      code(
        await flow.resolve(escalated, {
          outcome: "walkover_intended",
          reason: "Wrong Team",
          winningTeamId: asTeamId("foreign-team"),
        }),
      ),
    ).toBe("scheduling.invalid_schedule_change_resolution");
    expect(
      code(
        await flow.resolve(
          escalated,
          { outcome: "schedule_kept", reason: "Captain" },
          "captain-resolve",
          asActorId("expiry-captain-b"),
        ),
      ),
    ).toBe("authorization.forbidden");
    expect(
      code(
        await flow.resolve(
          escalated,
          { outcome: "schedule_kept", reason: "Tenant" },
          "foreign",
          undefined,
          asOrganizationId("foreign-org"),
        ),
      ),
    ).toBe("scheduling.schedule_change_encounter_not_found");
    expect(await durableCounts(pool)).toEqual(before);
    expect(await durableSchedule(pool)).toEqual(untouched);
  });
});
