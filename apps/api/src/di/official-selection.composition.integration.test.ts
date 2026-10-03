import { afterAll, beforeAll, describe, expect, it, vi } from "vite-plus/test";
import { err } from "@futrob/shared-kernel";
import { PostgresProviderMatchRepository } from "@/adapters/game-data/persistence/postgres.repository.ts";
import {
  createIsolatedSchema,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";
import {
  AWAY,
  AWAY_CAPTAIN,
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
});
