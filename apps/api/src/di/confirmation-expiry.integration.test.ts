import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { asActorId } from "@futrob/shared-kernel";
import { PostgresProviderMatchRepository } from "@/adapters/game-data/persistence/postgres.repository.ts";
import { createApp } from "@/app.ts";
import { createModules } from "./create-modules.ts";
import { stubFetch } from "@/http/http-app.harness.ts";
import {
  createIsolatedSchema,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";
import { seedActors } from "@/testing/seed-actors.ts";
import {
  AWAY,
  AWAY_CAPTAIN,
  ENCOUNTER,
  HOME,
  HOME_CAPTAIN,
  OPERATOR,
  ORG,
  providerMatch,
  seedComposition,
  slot,
} from "./official-selection.composition.fixture.ts";

const SYSTEM = asActorId("actor-confirmation-expiry");
const PLAYERS = [
  {
    externalPlayerId: "provider-player-1",
    displayName: "Scorer",
    externalClubId: "club-home",
    position: "ST",
    minutesPlayed: 90,
    goals: 1,
    assists: 0,
    shots: 2,
    passAttempts: 10,
    passesMade: 8,
    tackleAttempts: 1,
    tacklesMade: 1,
    saves: 0,
    yellowCards: 0,
    redCards: 0,
    isMvp: false,
    rating: 7,
  },
];
const SECRET = "confirmation-expiry-test-secret";
const databaseUrl = process.env.TEST_DATABASE_URL;
const suite = describe.skipIf(!databaseUrl);

suite("DEC-021 Postgres confirmation and recovery", () => {
  let isolated: IsolatedSchema;
  beforeAll(async () => {
    isolated = await createIsolatedSchema(databaseUrl!, "confirmation_expiry");
    await migrateIsolatedSchema(isolated.pool);
  }, 180_000);
  afterAll(async () => {
    await isolated?.drop();
  }, 180_000);

  async function fresh(systemActor: string | null = SYSTEM) {
    await isolated.pool.query(
      "TRUNCATE organizations, actors, provider_matches RESTART IDENTITY CASCADE",
    );
    const clock = {
      value: new Date("2026-10-03T20:00:00.000Z"),
      now() {
        return this.value;
      },
    };
    const matches = new PostgresProviderMatchRepository(isolated.pool);
    const { modules } = await seedComposition({
      pool: isolated.pool,
      matches,
      clock,
      resultsSystemActorId: systemActor ?? undefined,
    });
    await seedActors(isolated.pool, SYSTEM);
    await matches.upsertMany([{ ...providerMatch("m-1"), players: PLAYERS }]);
    const proposed = await modules.officialSelection.propose.execute({
      actorId: HOME_CAPTAIN,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      actingTeamId: HOME,
      selections: slot("m-1"),
      expectedVersion: 0,
      commandKey: "propose",
    });
    if (!proposed.isOk() || !proposed.value.proposal) throw new Error("Proposal failed");
    const response = {
      actorId: AWAY_CAPTAIN,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      actingTeamId: AWAY,
      proposalId: proposed.value.proposal.id,
      expectedVersion: 1,
      commandKey: "response",
    };
    const expiry = {
      actorId: SYSTEM,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      proposalId: proposed.value.proposal.id,
    };
    const app = createApp({
      modules,
      internalJobSecret: SECRET,
      checkDbHealth: async () => "ok",
      correlationLogger: { info() {}, error() {} },
    });
    return { modules, matches, clock, app, response, expiry, proposal: proposed.value.proposal };
  }
  async function officialEffects() {
    const result = await isolated.pool.query(`SELECT
      (SELECT count(*)::int FROM official_results) AS results,
      (SELECT count(*)::int FROM team_match_contributions) AS team_contributions,
      (SELECT count(*)::int FROM player_match_contributions) AS player_contributions`);
    return result.rows[0];
  }
  async function view(modules: ReturnType<typeof createModules>) {
    const result = await modules.officialSelection.get.execute({
      actorId: AWAY_CAPTAIN,
      actingTeamId: AWAY,
      organizationId: ORG,
      encounterId: ENCOUNTER,
    });
    if (!result.isOk()) throw new Error(`Read failed: ${result.error.code}`);
    return result.value;
  }
  async function immutableRows() {
    return (await isolated.pool.query("SELECT * FROM official_selection_proposals ORDER BY id"))
      .rows;
  }

  it.each(["confirm", "equivalent"] as const)(
    "%s before/on/after deadline uses the durable UTC window",
    async (command) => {
      for (const time of [
        "2026-10-04T19:59:59.999Z",
        "2026-10-04T20:00:00.000Z",
        "2026-10-04T20:00:00.001Z",
      ]) {
        const { modules, response, proposal, clock } = await fresh();
        expect((await view(modules)).proposals).toMatchObject([
          { confirmationDeadline: new Date("2026-10-04T20:00:00.000Z") },
        ]);
        const before = await immutableRows();
        clock.value = new Date(time);
        const result =
          command === "confirm"
            ? await modules.officialSelection.confirm.execute(response)
            : await modules.officialSelection.proposeAlternative.execute({
                ...response,
                selections: slot("m-1"),
                reason: "Same slots",
              });
        const timely = time === "2026-10-04T19:59:59.999Z";
        expect(result.isOk() ? result.value.selection.status : result.error.code).toBe(
          timely ? "approved" : "results.confirmation_window_closed",
        );
        expect(await immutableRows()).toEqual(before);
        expect(await officialEffects()).toEqual(
          timely
            ? { results: 1, team_contributions: 2, player_contributions: 1 }
            : { results: 0, team_contributions: 0, player_contributions: 0 },
        );
        if (timely) {
          expect(
            (
              await isolated.pool.query(
                "SELECT team_id, goals_for, goals_against FROM team_match_contributions ORDER BY side DESC",
              )
            ).rows,
          ).toEqual([
            { team_id: "team-home", goals_for: 2, goals_against: 1 },
            { team_id: "team-away", goals_for: 1, goals_against: 2 },
          ]);
          expect(
            (
              await isolated.pool.query(
                "SELECT external_player_id, goals, correlation_status FROM player_match_contributions",
              )
            ).rows,
          ).toEqual([
            { external_player_id: "provider-player-1", goals: 1, correlation_status: "unmatched" },
          ]);
          expect((await view(modules)).selection).toMatchObject({ status: "approved", version: 2 });
        } else {
          expect((await view(modules)).allowedActions).toEqual([]);
          expect((await view(modules)).selection).toMatchObject({
            status: "awaiting_opponent_confirmation",
            version: 1,
            currentProposalId: proposal.id,
          });
        }
      }
    },
  );

  it.each(["reject", "incompatible", "openDispute"] as const)(
    "%s has the same durable boundary and rejects after the runner",
    async (command) => {
      for (const time of [
        "2026-10-04T19:59:59.999Z",
        "2026-10-04T20:00:00.000Z",
        "2026-10-04T20:00:00.001Z",
      ]) {
        const { modules, response, clock } = await fresh();
        const original = await immutableRows();
        clock.value = new Date(time);
        const execute = () =>
          command === "reject"
            ? modules.officialSelection.reject.execute({ ...response, reason: "Wrong score" })
            : command === "incompatible"
              ? modules.officialSelection.proposeAlternative.execute({
                  ...response,
                  selections: slot("m-2"),
                  reason: "Different match",
                })
              : modules.officialSelection.openDispute.execute({
                  ...response,
                  reason: "Review the score",
                });
        const result = await execute();
        const timely = time === "2026-10-04T19:59:59.999Z";
        expect(result.isOk() ? result.value.selection.status : result.error.code).toBe(
          timely ? "disputed" : "results.confirmation_window_closed",
        );
        expect((await immutableRows()).filter((row) => row.id === response.proposalId)).toEqual(
          original,
        );
        expect(await officialEffects()).toEqual({
          results: 0,
          team_contributions: 0,
          player_contributions: 0,
        });
        if (!timely) {
          await modules.runConfirmationExpiry.execute();
          const expired = await execute();
          expect(expired.isErr() ? expired.error.code : "disputed").toBe(
            "results.confirmation_window_closed",
          );
          expect((await view(modules)).actions.map((a) => a.type)).toEqual([
            "proposed",
            "confirmation_expired",
          ]);
        }
      }
    },
  );

  it.each(["on-time-confirmation", "expiry"] as const)(
    "%s with incomplete provider data requires explicit operator acknowledgment",
    async (path) => {
      const { modules, matches, clock, response, proposal } = await fresh();
      const partial = { ...providerMatch("m-1"), players: PLAYERS };
      await matches.upsertMany([
        { ...partial, metadata: { ...partial.metadata, completeness: "partial" } },
      ]);
      clock.value = new Date("2026-10-04T19:59:59.999Z");
      if (path === "on-time-confirmation") {
        const flagged = await modules.officialSelection.confirm.execute(response);
        expect(flagged.isOk() ? flagged.value.selection.status : flagged.error.code).toBe(
          "organizer_review",
        );
        expect((await view(modules)).actions.map((a) => a.type)).toEqual([
          "proposed",
          "confirmed",
          "integrity_review_required",
        ]);
      } else {
        clock.value = new Date("2026-10-04T20:00:00.000Z");
        const expired = await modules.runConfirmationExpiry.execute();
        expect(expired.isOk() ? expired.value : expired.error.code).toEqual({
          expired: 1,
          skipped: 0,
        });
      }
      expect(await officialEffects()).toEqual({
        results: 0,
        team_contributions: 0,
        player_contributions: 0,
      });
      const command = {
        actorId: OPERATOR,
        organizationId: ORG,
        encounterId: ENCOUNTER,
        expectedVersion: 2,
        commandKey: "operator-with-flag",
        reason: "Verified partial provider data",
        decision: { type: "approve_proposal" as const, proposalId: proposal.id },
      };
      const unacknowledged = await modules.officialSelection.resolveDispute.execute(command);
      expect(unacknowledged.isErr() ? unacknowledged.error.code : "approved").toBe(
        "results.integrity_flags_not_acknowledged",
      );
      expect(await officialEffects()).toEqual({
        results: 0,
        team_contributions: 0,
        player_contributions: 0,
      });
      const acknowledged = await modules.officialSelection.resolveDispute.execute({
        ...command,
        decision: { ...command.decision, acknowledgeIntegrityFlags: true },
      });
      expect(
        acknowledged.isOk() ? acknowledged.value.approvedResult : acknowledged.error.code,
      ).toMatchObject({ status: "approved", revision: 1, approvalBasis: "operator_resolution" });
      expect((await view(modules)).actions.at(-1)?.details?.acknowledgedFlags).toEqual([
        {
          code: "provider_data_incomplete",
          providerMatchRef: { providerKey: "ea-clubs", externalId: "m-1" },
        },
      ]);
      expect(await officialEffects()).toEqual({
        results: 1,
        team_contributions: 2,
        player_contributions: 1,
      });
    },
  );

  it("authenticates the runner and rejects caller-provided actor/clock overrides", async () => {
    const { app, clock, modules } = await fresh();
    clock.value = new Date("2026-10-05T03:00:00.000Z");
    const path = "/api/v1/internal/results/confirmation-expiry/run";
    expect((await app.request(path, { method: "POST" })).status).toBe(401);
    expect((await view(modules)).selection).toMatchObject({
      status: "awaiting_opponent_confirmation",
      version: 1,
    });
    const result = await app.request(path, {
      method: "POST",
      headers: { Authorization: `Bearer ${SECRET}` },
      body: JSON.stringify({ actorId: "unprovisioned", now: "2026-01-01T00:00:00Z" }),
    });
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ expired: 1, skipped: 0 });
    expect((await view(modules)).actions.at(-1)).toMatchObject({
      type: "confirmation_expired",
      actorId: SYSTEM,
      capacity: "system",
      occurredAt: new Date("2026-10-05T03:00:00.000Z"),
      details: {
        confirmationDeadline: "2026-10-04T20:00:00.000Z",
        processedAt: "2026-10-05T03:00:00.000Z",
      },
    });
    expect(await officialEffects()).toEqual({
      results: 0,
      team_contributions: 0,
      player_contributions: 0,
    });
  });

  it.each([null, "actor-not-provisioned"])(
    "recovers missing system actor %s after identity provisioning/configuration",
    async (configured) => {
      const h = await fresh(configured);
      h.clock.value = new Date("2026-10-04T20:00:00.000Z");
      const unavailable = await h.modules.runConfirmationExpiry.execute();
      expect(unavailable.isErr() ? unavailable.error.code : "expired").toBe(
        "results.confirmation_expiry_actor_unavailable",
      );
      expect((await view(h.modules)).actions.map((a) => a.type)).toEqual(["proposed"]);
      expect(await officialEffects()).toEqual({
        results: 0,
        team_contributions: 0,
        player_contributions: 0,
      });
      const actor = configured ?? SYSTEM;
      await seedActors(isolated.pool, actor);
      const restarted = createModules({
        pool: isolated.pool,
        providerMatches: h.matches,
        clock: h.clock,
        resultsSystemActorId: actor,
        fetcher: stubFetch,
        eaClubsBaseUrl: "https://unused.test",
      });
      const recovered = await restarted.runConfirmationExpiry.execute();
      expect(recovered.isOk() ? recovered.value : recovered.error.code).toEqual({
        expired: 1,
        skipped: 0,
      });
      expect((await view(restarted)).actions.at(-1)).toMatchObject({
        actorId: actor,
        capacity: "system",
        type: "confirmation_expired",
      });
    },
  );

  it("rolls back status and audit after a write failure; new composition retries only once", async () => {
    const { modules, matches, clock, proposal } = await fresh();
    const before = await immutableRows();
    clock.value = new Date("2026-10-05T03:00:00.000Z");
    await isolated.pool.query(`CREATE FUNCTION fail_expiry_action() RETURNS trigger AS $$ BEGIN
      IF NEW.action_type = 'confirmation_expired' THEN RAISE EXCEPTION 'test injected failure'; END IF;
      RETURN NEW; END; $$ LANGUAGE plpgsql;
      CREATE TRIGGER fail_expiry BEFORE INSERT ON official_selection_actions FOR EACH ROW EXECUTE FUNCTION fail_expiry_action()`);
    try {
      await expect(modules.runConfirmationExpiry.execute()).rejects.toThrow(
        "test injected failure",
      );
    } finally {
      await isolated.pool.query(
        "DROP TRIGGER fail_expiry ON official_selection_actions; DROP FUNCTION fail_expiry_action()",
      );
    }
    expect((await view(modules)).selection).toMatchObject({
      status: "awaiting_opponent_confirmation",
      version: 1,
    });
    expect((await view(modules)).actions.map((a) => a.type)).toEqual(["proposed"]);
    expect(await immutableRows()).toEqual(before);
    expect(
      (
        await isolated.pool.query(
          "SELECT released_at FROM official_selection_reference_claims WHERE selection_id = $1",
          [proposal.selectionId],
        )
      ).rows,
    ).toEqual([{ released_at: null }]);
    const restarted = createModules({
      pool: isolated.pool,
      providerMatches: matches,
      clock,
      resultsSystemActorId: SYSTEM,
      fetcher: stubFetch,
      eaClubsBaseUrl: "https://unused.test",
    });
    const recovered = await restarted.runConfirmationExpiry.execute();
    const replay = await restarted.runConfirmationExpiry.execute();
    expect(recovered.isOk() ? recovered.value : recovered.error.code).toEqual({
      expired: 1,
      skipped: 0,
    });
    expect(replay.isOk() ? replay.value : replay.error.code).toEqual({ expired: 0, skipped: 0 });
    expect((await view(restarted)).actions.map((a) => a.type)).toEqual([
      "proposed",
      "confirmation_expired",
    ]);
    expect(await officialEffects()).toEqual({
      results: 0,
      team_contributions: 0,
      player_contributions: 0,
    });
  });

  it("retains the NOT NULL/FK contract and rolls back an unprovisioned expiry actor", async () => {
    const { modules, expiry, clock } = await fresh();
    clock.value = new Date("2026-10-04T20:00:00.000Z");
    await expect(
      modules.officialSelection.expire.execute({ ...expiry, actorId: asActorId("nonexistent") }),
    ).rejects.toMatchObject({ code: "23503" });
    expect((await view(modules)).selection).toMatchObject({
      status: "awaiting_opponent_confirmation",
      version: 1,
    });
    expect((await view(modules)).actions.map((a) => a.type)).toEqual(["proposed"]);
    await expect(
      isolated.pool.query(
        `INSERT INTO official_selection_actions
      (id, selection_id, proposal_id, organization_id, competition_id, encounter_id, action_type,
       version_before, version_after, actor_id, capacity, occurred_at)
      SELECT 'null-system-action', id, current_proposal_id, organization_id, competition_id, encounter_id,
             'confirmation_expired', version, version + 1, NULL, 'system', '2026-10-04T20:00:00.000Z'
      FROM official_match_selections WHERE encounter_id = $1`,
        [ENCOUNTER],
      ),
    ).rejects.toMatchObject({ code: "23502" });
    const result = await modules.officialSelection.expire.execute(expiry);
    expect(result.isOk() ? result.value : result.error.code).toEqual({ status: "expired" });
    expect((await view(modules)).actions.at(-1)).toMatchObject({
      actorId: SYSTEM,
      capacity: "system",
    });
  });

  it.each(["2026-10-04T19:59:59.999Z", "2026-10-04T20:00:00.000Z", "2026-10-04T20:00:00.001Z"])(
    "confirmation/expiry race at %s has a single outcome",
    async (time) => {
      const { modules, clock, expiry, response } = await fresh();
      clock.value = new Date(time);
      const [confirmed, expired] = await Promise.all([
        modules.officialSelection.confirm.execute(response),
        modules.officialSelection.expire.execute(expiry),
      ]);
      const timely = time === "2026-10-04T19:59:59.999Z";
      expect(confirmed.isOk() ? confirmed.value.selection.status : confirmed.error.code).toBe(
        timely ? "approved" : "results.confirmation_window_closed",
      );
      expect(expired.isOk() ? expired.value.status : expired.error.code).toBe(
        timely ? "skipped" : "expired",
      );
      expect((await view(modules)).actions.map((a) => a.type)).toEqual(
        timely ? ["proposed", "confirmed", "approved"] : ["proposed", "confirmation_expired"],
      );
      expect(await officialEffects()).toEqual(
        timely
          ? { results: 1, team_contributions: 2, player_contributions: 1 }
          : { results: 0, team_contributions: 0, player_contributions: 0 },
      );
    },
  );

  it.each(["confirm", "equivalent"] as const)(
    "%s reads ClockPort after waiting for the shared Encounter lock",
    async (command) => {
      const { modules, clock, response, expiry } = await fresh();
      const blocker = await isolated.pool.connect();
      await blocker.query("BEGIN");
      await blocker.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
        `scheduling:encounter:${ENCOUNTER}`,
      ]);
      clock.value = new Date("2026-10-04T19:59:59.999Z");
      const responsePromise =
        command === "confirm"
          ? modules.officialSelection.confirm.execute(response)
          : modules.officialSelection.proposeAlternative.execute({
              ...response,
              selections: slot("m-1"),
              reason: "Same slots",
            });
      let expiredPromise: ReturnType<typeof modules.officialSelection.expire.execute> | undefined;
      try {
        let waiting = false;
        for (let attempt = 0; attempt < 200; attempt += 1) {
          const observed = await isolated.pool.query(
            `SELECT EXISTS (
          SELECT 1 FROM pg_locks WHERE locktype = 'advisory' AND NOT granted
          AND objid = (hashtextextended($1, 0) & 4294967295)::oid
        ) AS waiting`,
            [`scheduling:encounter:${ENCOUNTER}`],
          );
          if (observed.rows[0].waiting === true) {
            waiting = true;
            break;
          }
        }
        if (!waiting) throw new Error("Response did not reach the Encounter lock");
        clock.value = new Date("2026-10-04T20:00:00.000Z");
        expiredPromise = modules.officialSelection.expire.execute(expiry);
      } finally {
        await blocker.query("COMMIT");
        blocker.release();
      }
      const responseResult = await responsePromise;
      expect(responseResult.isErr() ? responseResult.error.code : "approved").toBe(
        "results.confirmation_window_closed",
      );
      const expired = await expiredPromise;
      expect(expired?.isOk() ? expired.value.status : "failed").toBe("expired");
      expect((await view(modules)).actions.map((a) => a.type)).toEqual([
        "proposed",
        "confirmation_expired",
      ]);
      expect(await officialEffects()).toEqual({
        results: 0,
        team_contributions: 0,
        player_contributions: 0,
      });
    },
  );

  it("concurrent recovery batches converge to one durable expiry", async () => {
    const { modules, clock } = await fresh();
    clock.value = new Date("2026-10-05T03:00:00.000Z");
    const outcomes = await Promise.all([
      modules.runConfirmationExpiry.execute(),
      modules.runConfirmationExpiry.execute(),
    ]);
    expect(outcomes.map((r) => (r.isOk() ? r.value.expired : -100)).reduce((a, b) => a + b)).toBe(
      1,
    );
    const result = await view(modules);
    expect(result.selection).toMatchObject({ status: "organizer_review", version: 2 });
    expect(result.actions.map((a) => a.type)).toEqual(["proposed", "confirmation_expired"]);
    expect(await officialEffects()).toEqual({
      results: 0,
      team_contributions: 0,
      player_contributions: 0,
    });
  });

  it("the operator can approve an expired proposal with operator_resolution", async () => {
    const { modules, clock, proposal } = await fresh();
    clock.value = new Date("2026-10-05T03:00:00.000Z");
    await modules.runConfirmationExpiry.execute();
    const resolved = await modules.officialSelection.resolveDispute.execute({
      actorId: OPERATOR,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      expectedVersion: 2,
      commandKey: "operator-approve",
      reason: "Verified score",
      decision: { type: "approve_proposal", proposalId: proposal.id },
    });
    expect(resolved.isOk() ? resolved.value.approvedResult : resolved.error.code).toMatchObject({
      status: "approved",
      revision: 1,
      approvalBasis: "operator_resolution",
      approvedBy: OPERATOR,
    });
    const replay = await modules.runConfirmationExpiry.execute();
    expect(replay.isOk() ? replay.value : replay.error.code).toEqual({ expired: 0, skipped: 0 });
    expect((await view(modules)).actions.map((a) => a.type)).toEqual([
      "proposed",
      "confirmation_expired",
      "dispute_resolved_approved",
    ]);
  });
});
