import { afterAll, beforeAll, describe, expect, it, vi } from "vite-plus/test";
import { err } from "@futrob/shared-kernel";
import { PostgresProviderMatchRepository } from "@/adapters/game-data/persistence/postgres.repository.ts";
import {
  runWithRequestCorrelation,
  type CorrelationLogEntry,
} from "@/context/request-correlation.ts";
import {
  createIsolatedSchema,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";
import {
  AWAY,
  AWAY_CAPTAIN,
  COMPETITION,
  ENCOUNTER,
  HOME,
  HOME_CAPTAIN,
  OPERATOR,
  ORG,
  SECOND_ENCOUNTER,
  seedComposition,
  slot,
} from "./official-selection.composition.fixture.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const suite = describe.skipIf(!databaseUrl);
const TEST_TIMEOUT_MS = 180_000;
const phoneReasonExamples = [
  ["Marcador incorrecto; llamar +1-555-0100", "Marcador incorrecto; llamar [REDACTED]"],
  ["Call 555-555-0100x123", "Call [REDACTED]"],
  ["x555-555-0100", "x[REDACTED]"],
  ["Call +1-555-0100. 2026 is relevant", "Call [REDACTED]. 2026 is relevant"],
] as const;

suite("official selection composition on Postgres", () => {
  let isolated: IsolatedSchema;

  beforeAll(async () => {
    isolated = await createIsolatedSchema(databaseUrl ?? "", "selection_composition");
    await migrateIsolatedSchema(isolated.pool);
  }, TEST_TIMEOUT_MS);

  afterAll(async () => {
    await isolated?.drop();
  }, TEST_TIMEOUT_MS);

  async function fresh() {
    // Each test owns its own tenant rows: clear what the previous one left behind.
    const schema = `"${isolated.schema}"`;
    await isolated.pool.query(
      `TRUNCATE ${schema}.organizations, ${schema}.actors, ${schema}.provider_matches RESTART IDENTITY CASCADE`,
    );
    return seedComposition({
      pool: isolated.pool,
      matches: new PostgresProviderMatchRepository(isolated.pool),
    });
  }

  async function count(table: string, where = "TRUE") {
    const { rows } = await isolated.pool.query(
      `SELECT count(*)::int AS n FROM ${table} WHERE ${where}`,
    );
    return Number(rows[0].n);
  }

  it(
    "rolls selection, audit and result back when the projection fails, then retries cleanly",
    async () => {
      const { modules, project } = await fresh();
      const proposed = await modules.officialSelection.propose.execute({
        actorId: HOME_CAPTAIN,
        organizationId: ORG,
        encounterId: ENCOUNTER,
        actingTeamId: HOME,
        selections: slot("m-1"),
        expectedVersion: 0,
        commandKey: "propose",
      });
      if (!proposed.isOk()) throw new Error(`propose failed: ${proposed.error.code}`);
      const confirm = {
        actorId: AWAY_CAPTAIN,
        organizationId: ORG,
        encounterId: ENCOUNTER,
        actingTeamId: AWAY,
        proposalId: proposed.value.proposal!.id,
        expectedVersion: 1,
        commandKey: "confirm",
      };

      project.mockResolvedValueOnce(err(new Error("projection exploded")) as never);
      await expect(modules.officialSelection.confirm.execute(confirm)).rejects.toThrow(
        "projection exploded",
      );

      expect(await count("official_results")).toBe(0);
      expect(
        await count("official_selection_actions", "action_type IN ('confirmed','approved')"),
      ).toBe(0);
      expect(await count("official_selection_actions")).toBe(1);
      expect(
        await count(
          "official_match_selections",
          "status = 'awaiting_opponent_confirmation' AND version = 1",
        ),
      ).toBe(1);
      expect(await count("official_selection_reference_claims", "released_at IS NULL")).toBe(1);

      const retried = await modules.officialSelection.confirm.execute(confirm);
      expect(retried.isOk() && retried.value.approvedResult?.revision).toBe(1);
      expect(await count("official_results")).toBe(1);
      expect(await count("official_selection_actions", "action_type = 'approved'")).toBe(1);

      const replay = await modules.officialSelection.confirm.execute(confirm);
      expect(replay.isOk() && replay.value.replayed).toBe(true);
      expect(await count("official_results")).toBe(1);
      expect(project).toHaveBeenCalledTimes(2);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "serializes equivalent alternatives and rival confirmations without a lock inversion",
    async () => {
      const { modules, project } = await fresh();
      const proposed = await modules.officialSelection.propose.execute({
        actorId: HOME_CAPTAIN,
        organizationId: ORG,
        encounterId: ENCOUNTER,
        actingTeamId: HOME,
        selections: slot("m-1"),
        expectedVersion: 0,
        commandKey: "propose",
      });
      if (!proposed.isOk()) throw new Error("propose failed");
      const response = {
        actorId: AWAY_CAPTAIN,
        organizationId: ORG,
        encounterId: ENCOUNTER,
        actingTeamId: AWAY,
        proposalId: proposed.value.proposal!.id,
        expectedVersion: 1,
      };

      let competitionHeld!: () => void;
      const held = new Promise<void>((resolve) => {
        competitionHeld = resolve;
      });
      let alternativeWaiting!: () => void;
      const waiting = new Promise<void>((resolve) => {
        alternativeWaiting = resolve;
      });
      const lock = modules.statistics.ports.teamPerformanceLock;
      const runExclusive = lock.runExclusive.bind(lock);
      let attempts = 0;
      const gate = vi.spyOn(lock, "runExclusive").mockImplementation((competitionId, operation) => {
        const attempt = ++attempts;
        if (attempt === 2) alternativeWaiting();
        return runExclusive(competitionId, async () => {
          if (attempt === 1) {
            competitionHeld();
            // Hold the real competition lock until the alternative requests it.
            // An Encounter-first alternative would now deadlock with confirmation.
            await waiting;
          }
          return operation();
        });
      });
      try {
        const confirmation = modules.officialSelection.confirm.execute({
          ...response,
          commandKey: "confirm-race",
        });
        await held;
        const alternative = modules.officialSelection.proposeAlternative.execute({
          ...response,
          selections: slot("m-1"),
          reason: "The same match evidence",
          commandKey: "alternative-race",
        });
        const outcomes = await Promise.allSettled([confirmation, alternative]);
        expect(outcomes.map((outcome) => outcome.status)).toEqual(["fulfilled", "fulfilled"]);
        const [confirmed, answered] = outcomes;
        expect(confirmed.status === "fulfilled" && confirmed.value.isOk()).toBe(true);
        expect(
          answered.status === "fulfilled" && answered.value.isErr() && answered.value.error.code,
        ).toBe("results.selection_already_approved");
        expect(await count("official_results")).toBe(1);
        expect(await count("official_selection_actions", "action_type = 'approved'")).toBe(1);
        expect(project).toHaveBeenCalledTimes(1);
      } finally {
        gate.mockRestore();
      }
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "never gives one provider match to two encounters racing through the composition",
    async () => {
      const { modules } = await fresh();
      const propose = (encounterId: typeof ENCOUNTER, commandKey: string) =>
        modules.officialSelection.propose.execute({
          actorId: HOME_CAPTAIN,
          organizationId: ORG,
          encounterId,
          actingTeamId: HOME,
          selections: slot("m-1"),
          expectedVersion: 0,
          commandKey,
        });

      const [first, second] = await Promise.all([
        propose(ENCOUNTER, "race-1"),
        propose(SECOND_ENCOUNTER, "race-2"),
      ]);

      expect([first.isOk(), second.isOk()].filter(Boolean)).toHaveLength(1);
      const loser = first.isOk() ? second : first;
      expect(loser.isErr() && loser.error.code).toBe("results.reference_already_claimed");
      expect(await count("official_selection_reference_claims", "released_at IS NULL")).toBe(1);
      expect(await count("official_match_selections")).toBe(1);
      expect(
        await count(
          "official_selection_actions",
          "action_type = 'reference_reuse_rejected' AND selection_id IS NULL",
        ),
      ).toBe(1);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "keeps every history row after a dispute is resolved by an operator",
    async () => {
      const { modules, project } = await fresh();
      const { officialSelection: selection } = modules;
      const proposed = await selection.propose.execute({
        actorId: HOME_CAPTAIN,
        organizationId: ORG,
        encounterId: ENCOUNTER,
        actingTeamId: HOME,
        selections: slot("m-1"),
        expectedVersion: 0,
        commandKey: "propose",
      });
      if (!proposed.isOk()) throw new Error("propose failed");
      const alternativeCommand = {
        actorId: AWAY_CAPTAIN,
        organizationId: ORG,
        encounterId: ENCOUNTER,
        actingTeamId: AWAY,
        proposalId: proposed.value.proposal!.id,
        expectedVersion: 1,
        selections: slot("m-2"),
        reason: "It was the second match",
        commandKey: "alternative",
      };
      const alternative = await selection.proposeAlternative.execute(alternativeCommand);
      if (!alternative.isOk()) throw new Error("alternative failed");
      await selection.reviewDispute.execute({
        actorId: OPERATOR,
        organizationId: ORG,
        encounterId: ENCOUNTER,
        expectedVersion: 2,
        commandKey: "review",
      });
      expect(project).not.toHaveBeenCalled();
      expect(await count("official_results")).toBe(0);

      const resolved = await selection.resolveDispute.execute({
        actorId: OPERATOR,
        organizationId: ORG,
        encounterId: ENCOUNTER,
        expectedVersion: 3,
        decision: { type: "approve_proposal", proposalId: alternative.value.proposal!.id },
        reason: "Evidence checked",
        commandKey: "resolve",
      });
      expect(resolved.isOk() && resolved.value.approvedResult?.approvalBasis).toBe(
        "operator_resolution",
      );
      expect(project).toHaveBeenCalledTimes(1);

      // A replay reports the dispute as the alternative opened it, not as resolved.
      const replay = await selection.proposeAlternative.execute(alternativeCommand);
      expect(replay.isOk() && replay.value.replayed).toBe(true);
      expect(replay.isOk() && replay.value.selection.status).toBe("disputed");
      expect(replay.isOk() && replay.value.dispute?.status).toBe("open");
      expect(await count("official_selection_proposals")).toBe(2);
      expect(await count("official_selection_actions")).toBe(4);
      expect(await count("match_disputes", "status = 'resolved'")).toBe(1);
      expect(await count("official_selection_reference_claims", "released_at IS NULL")).toBe(1);
      expect(await count("official_selection_reference_claims")).toBe(2);
    },
    TEST_TIMEOUT_MS,
  );

  it.each(phoneReasonExamples)(
    "persists and serves a redacted reason while keeping the neighbor unchanged: %s",
    async (reason, expectedReason) => {
      const { modules } = await fresh();
      const proposed = await modules.officialSelection.propose.execute({
        actorId: HOME_CAPTAIN,
        organizationId: ORG,
        encounterId: ENCOUNTER,
        actingTeamId: HOME,
        selections: slot("m-1"),
        expectedVersion: 0,
        commandKey: "redaction-propose",
      });
      if (!proposed.isOk()) throw new Error("propose failed");

      const logs: CorrelationLogEntry[] = [];
      const alternative = await runWithRequestCorrelation(
        { requestId: "redaction-request" },
        { info: (entry) => logs.push(entry), error: (entry) => logs.push(entry) },
        () =>
          modules.officialSelection.proposeAlternative.execute({
            actorId: AWAY_CAPTAIN,
            organizationId: ORG,
            encounterId: ENCOUNTER,
            actingTeamId: AWAY,
            proposalId: proposed.value.proposal!.id,
            expectedVersion: 1,
            selections: slot("m-2"),
            reason,
            commandKey: "redaction-alternative",
          }),
      );
      if (!alternative.isOk()) throw new Error("alternative failed");
      expect(logs).toEqual([{ event: "db.transaction.committed", requestId: "redaction-request" }]);

      const persisted = await isolated.pool.query(
        `SELECT
           (SELECT reason FROM official_selection_proposals WHERE id = $1) AS proposal_reason,
           (SELECT reason FROM official_selection_actions WHERE id = $2) AS action_reason,
           (SELECT opened_reason FROM match_disputes WHERE id = $3) AS dispute_reason`,
        [
          alternative.value.proposal!.id,
          alternative.value.actions[0]!.id,
          alternative.value.dispute!.id,
        ],
      );
      expect(persisted.rows[0]).toEqual({
        proposal_reason: expectedReason,
        action_reason: expectedReason,
        dispute_reason: expectedReason,
      });

      const view = await modules.officialSelection.get.execute({
        actorId: OPERATOR,
        organizationId: ORG,
        encounterId: ENCOUNTER,
      });
      if (!view.isOk()) throw new Error("view failed");
      expect(view.value.proposals.at(-1)?.reason).toBe(expectedReason);
      expect(view.value.actions.at(-1)?.reason).toBe(expectedReason);
      expect(view.value.activeDispute?.openedReason).toBe(expectedReason);
      expect(view.value.actions.map((action) => action.requestFingerprint)).toEqual([null, null]);

      const reviewed = await modules.officialSelection.reviewDispute.execute({
        actorId: OPERATOR,
        organizationId: ORG,
        encounterId: ENCOUNTER,
        expectedVersion: 2,
        reason: "Avisar a arbitro@example.com sobre el marcador",
        commandKey: "redaction-review",
      });
      if (!reviewed.isOk()) throw new Error("review failed");
      expect(reviewed.value.actions[0]?.reason).toBe("Avisar a [REDACTED] sobre el marcador");
      const resolved = await modules.officialSelection.resolveDispute.execute({
        actorId: OPERATOR,
        organizationId: ORG,
        encounterId: ENCOUNTER,
        expectedVersion: 3,
        decision: { type: "return_to_selection" },
        reason: "Avisar al árbitro sobre el marcador",
        commandKey: "redaction-resolve",
      });
      if (!resolved.isOk()) throw new Error("resolve failed");
      expect(resolved.value.dispute?.resolutionReason).toBe("Avisar al árbitro sobre el marcador");
      const reviewAndResolution = await isolated.pool.query(
        `SELECT
           (SELECT reason FROM official_selection_actions WHERE id = $1) AS review_reason,
           (SELECT reason FROM official_selection_actions WHERE id = $2) AS resolution_action_reason,
           (SELECT resolution_reason FROM match_disputes WHERE id = $3) AS resolution_reason`,
        [reviewed.value.actions[0]!.id, resolved.value.actions[0]!.id, resolved.value.dispute!.id],
      );
      expect(reviewAndResolution.rows[0]).toEqual({
        review_reason: "Avisar a [REDACTED] sobre el marcador",
        resolution_action_reason: "Avisar al árbitro sobre el marcador",
        resolution_reason: "Avisar al árbitro sobre el marcador",
      });

      const neighbor = await fresh();
      const neighborProposal = await neighbor.modules.officialSelection.propose.execute({
        actorId: HOME_CAPTAIN,
        organizationId: ORG,
        encounterId: ENCOUNTER,
        actingTeamId: HOME,
        selections: slot("m-1"),
        expectedVersion: 0,
        commandKey: "neighbor-propose",
      });
      if (!neighborProposal.isOk()) throw new Error("neighbor propose failed");
      const rejected = await neighbor.modules.officialSelection.reject.execute({
        actorId: AWAY_CAPTAIN,
        organizationId: ORG,
        encounterId: ENCOUNTER,
        actingTeamId: AWAY,
        proposalId: neighborProposal.value.proposal!.id,
        expectedVersion: 1,
        reason: "Se invirtieron los slots",
        commandKey: "neighbor-reject",
      });
      expect(rejected.isOk() && rejected.value.actions[0]?.reason).toBe("Se invirtieron los slots");
      if (!rejected.isOk()) throw new Error("neighbor reject failed");
      const neighborStored = await isolated.pool.query(
        "SELECT reason FROM official_selection_actions WHERE id = $1",
        [rejected.value.actions[0]!.id],
      );
      expect(neighborStored.rows).toEqual([{ reason: "Se invirtieron los slots" }]);
    },
    TEST_TIMEOUT_MS,
  );

  it.each(phoneReasonExamples)(
    "protects legacy view and replay without rewriting the append-only rows: %s",
    async (phoneReason, expectedReason) => {
      const { modules } = await fresh();
      const proposed = await modules.officialSelection.propose.execute({
        actorId: HOME_CAPTAIN,
        organizationId: ORG,
        encounterId: ENCOUNTER,
        actingTeamId: HOME,
        selections: slot("m-1"),
        expectedVersion: 0,
        commandKey: "legacy-propose",
      });
      if (!proposed.isOk()) throw new Error("propose failed");
      const selection = proposed.value.selection;
      const proposalId = "legacy-proposal-sensitive";
      const disputeId = "legacy-dispute-sensitive";
      const actionId = "legacy-action-sensitive";
      const emailReason = "Avisar a arbitro@example.com sobre el marcador";
      const fingerprint = `reject|${AWAY}|${proposalId}|1|${phoneReason}`;
      const occurredAt = new Date("2026-09-15T01:02:03.000Z");

      await isolated.pool.query(
        `INSERT INTO official_selection_proposals (
           id, selection_id, organization_id, competition_id, encounter_id, round, sequence,
           proposing_team_id, proposed_by_actor_id, slots, supersedes_proposal_id, reason, created_at
         ) VALUES ($1, $2, $3, $4, $5, 1, 2, $6, $7, $8::jsonb, $9, $10, $11)`,
        [
          proposalId,
          selection.id,
          ORG,
          COMPETITION,
          ENCOUNTER,
          HOME,
          HOME_CAPTAIN,
          JSON.stringify(slot("m-1")),
          proposed.value.proposal!.id,
          emailReason,
          occurredAt.toISOString(),
        ],
      );
      await isolated.pool.query(
        `INSERT INTO match_disputes (
           id, selection_id, organization_id, competition_id, encounter_id, status,
           opened_by_actor_id, opened_by_team_id, opened_reason, opened_at
         ) VALUES ($1, $2, $3, $4, $5, 'open', $6, $7, $8, $9)`,
        [
          disputeId,
          selection.id,
          ORG,
          COMPETITION,
          ENCOUNTER,
          AWAY_CAPTAIN,
          AWAY,
          emailReason,
          occurredAt.toISOString(),
        ],
      );
      await isolated.pool.query(
        `INSERT INTO official_selection_actions (
           id, selection_id, proposal_id, organization_id, competition_id, encounter_id,
           action_type, from_status, to_status, version_before, version_after, actor_id, team_id,
           capacity, reason, command_key, request_fingerprint, details, occurred_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, 'rejected', 'awaiting_opponent_confirmation', 'disputed',
           1, 2, $7, $8, 'team', $9, 'legacy-reject', $10, $11::jsonb, $12
         )`,
        [
          actionId,
          selection.id,
          proposalId,
          ORG,
          COMPETITION,
          ENCOUNTER,
          AWAY_CAPTAIN,
          AWAY,
          phoneReason,
          fingerprint,
          JSON.stringify({ disputeId }),
          occurredAt.toISOString(),
        ],
      );

      const readOriginalRows = () =>
        isolated.pool.query(
          `SELECT
           (SELECT to_jsonb(p) FROM official_selection_proposals p WHERE id = $1) AS proposal,
           (SELECT to_jsonb(a) FROM official_selection_actions a WHERE id = $2) AS action,
           (SELECT to_jsonb(d) FROM match_disputes d WHERE id = $3) AS dispute`,
          [proposalId, actionId, disputeId],
        );
      const before = await readOriginalRows();

      const view = await modules.officialSelection.get.execute({
        actorId: OPERATOR,
        organizationId: ORG,
        encounterId: ENCOUNTER,
      });
      if (!view.isOk()) throw new Error("view failed");
      const viewedProposal = view.value.proposals.find((row) => row.id === proposalId);
      const viewedAction = view.value.actions.find((row) => row.id === actionId);
      const viewedDispute = view.value.disputes.find((row) => row.id === disputeId);
      expect(viewedProposal?.reason).toBe("Avisar a [REDACTED] sobre el marcador");
      expect(viewedProposal).toMatchObject({
        id: proposalId,
        proposedByActorId: HOME_CAPTAIN,
        sequence: 2,
        createdAt: occurredAt,
      });
      expect(viewedAction).toMatchObject({
        actorId: AWAY_CAPTAIN,
        versionBefore: 1,
        versionAfter: 2,
        reason: expectedReason,
        requestFingerprint: null,
        occurredAt,
      });
      expect(viewedDispute?.openedReason).toBe("Avisar a [REDACTED] sobre el marcador");
      expect(viewedDispute).toMatchObject({
        id: disputeId,
        openedByActorId: AWAY_CAPTAIN,
        openedAt: occurredAt,
      });

      const replay = await modules.officialSelection.reject.execute({
        actorId: AWAY_CAPTAIN,
        organizationId: ORG,
        encounterId: ENCOUNTER,
        actingTeamId: AWAY,
        proposalId,
        expectedVersion: 1,
        reason: phoneReason,
        commandKey: "legacy-reject",
      });
      if (!replay.isOk()) throw new Error(`replay failed: ${replay.error.code}`);
      expect(replay.value.replayed).toBe(true);
      expect(replay.value.proposal?.reason).toBe("Avisar a [REDACTED] sobre el marcador");
      expect(replay.value.actions[0]).toMatchObject({
        id: actionId,
        reason: expectedReason,
        requestFingerprint: null,
        occurredAt,
      });
      expect(replay.value.dispute?.openedReason).toBe("Avisar a [REDACTED] sobre el marcador");

      const changed = await modules.officialSelection.reject.execute({
        actorId: AWAY_CAPTAIN,
        organizationId: ORG,
        encounterId: ENCOUNTER,
        actingTeamId: AWAY,
        proposalId,
        expectedVersion: 1,
        reason: "Marcador incorrecto; llamar +1-555-0101",
        commandKey: "legacy-reject",
      });
      expect(changed.isErr() && changed.error.code).toBe("results.command_key_reused");
      expect(await count("official_selection_actions")).toBe(2);
      expect(await count("official_selection_proposals")).toBe(2);
      expect(await count("match_disputes")).toBe(1);
      expect((await readOriginalRows()).rows).toEqual(before.rows);

      const original = await isolated.pool.query(
        `SELECT
           (SELECT reason FROM official_selection_proposals WHERE id = $1) AS proposal_reason,
           (SELECT reason FROM official_selection_actions WHERE id = $2) AS action_reason,
           (SELECT request_fingerprint FROM official_selection_actions WHERE id = $2) AS fingerprint,
           (SELECT occurred_at FROM official_selection_actions WHERE id = $2) AS occurred_at,
           (SELECT opened_reason FROM match_disputes WHERE id = $3) AS dispute_reason`,
        [proposalId, actionId, disputeId],
      );
      expect(original.rows[0]).toEqual({
        proposal_reason: emailReason,
        action_reason: phoneReason,
        fingerprint,
        occurred_at: occurredAt,
        dispute_reason: emailReason,
      });
    },
    TEST_TIMEOUT_MS,
  );
});
