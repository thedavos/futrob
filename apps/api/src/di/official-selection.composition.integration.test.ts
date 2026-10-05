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
  providerMatch,
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

  async function propose(modules: Awaited<ReturnType<typeof fresh>>["modules"]) {
    const outcome = await modules.officialSelection.propose.execute({
      actorId: HOME_CAPTAIN,
      organizationId: ORG,
      encounterId: ENCOUNTER,
      actingTeamId: HOME,
      selections: slot("m-1"),
      expectedVersion: 0,
      commandKey: "fingerprint-propose",
    });
    if (!outcome.isOk()) throw new Error(`propose failed: ${outcome.error.code}`);
    return outcome.value;
  }

  it(
    "persists a known SHA-256 receipt and distinguishes raw phones before redaction",
    async () => {
      const { modules } = await fresh();
      await propose(modules);
      const command = {
        actorId: AWAY_CAPTAIN,
        organizationId: ORG,
        encounterId: ENCOUNTER,
        actingTeamId: AWAY,
        expectedVersion: 1,
        reason: "  Marcador incorrecto; llamar +1-555-0100  ",
        commandKey: "fingerprint-open",
      };
      const logs: CorrelationLogEntry[] = [];
      const opened = await runWithRequestCorrelation(
        { requestId: "fingerprint-request" },
        { info: (entry) => logs.push(entry), error: (entry) => logs.push(entry) },
        () => modules.officialSelection.openDispute.execute(command),
      );
      if (!opened.isOk()) throw new Error("open failed");
      expect(opened.value.selection).toMatchObject({ status: "disputed", version: 2 });
      expect(opened.value.dispute?.openedReason).toBe("Marcador incorrecto; llamar [REDACTED]");
      expect(opened.value.actions[0]?.reason).toBe("Marcador incorrecto; llamar [REDACTED]");
      expect(logs).toEqual([
        { event: "db.transaction.committed", requestId: "fingerprint-request" },
      ]);
      const read = () =>
        isolated.pool.query(
          "SELECT action_type, reason, request_fingerprint FROM official_selection_actions ORDER BY version_before",
        );
      const before = await read();
      // Independent OpenSSL SHA-256 vectors for the documented UTF-8 JSON tuples.
      expect(before.rows).toEqual([
        {
          action_type: "proposed",
          reason: null,
          request_fingerprint:
            "sha256:d59eee5f1c24c0332378b789b7f525d1eab5618089d6613ce8aa72248df9665d",
        },
        {
          action_type: "dispute_opened",
          reason: "Marcador incorrecto; llamar [REDACTED]",
          request_fingerprint:
            "sha256:e63aacf128f3c156fc8351a4c4fad3c9973fc784f39d68895c7bde5319406c06",
        },
      ]);

      const replay = await modules.officialSelection.openDispute.execute({
        ...command,
        reason: "Marcador incorrecto; llamar +1-555-0100",
      });
      expect(replay.isOk() && replay.value).toEqual({ ...opened.value, replayed: true });
      const changed = await modules.officialSelection.openDispute.execute({
        ...command,
        reason: "Marcador incorrecto; llamar +1-555-0101",
      });
      expect(changed.isErr() && changed.error.code).toBe("results.command_key_reused");
      expect((await read()).rows).toEqual(before.rows);
      expect(await count("official_selection_actions")).toBe(2);
      expect(await count("match_disputes")).toBe(1);
      expect(await count("official_selection_proposals")).toBe(1);

      const roster = await modules.teams.repositories.rosters.findById(`roster-${AWAY_CAPTAIN}`);
      if (!roster) throw new Error("missing captain");
      await modules.teams.repositories.rosters.update({ ...roster, role: "player" });
      const denied = await modules.officialSelection.openDispute.execute(command);
      expect(denied.isErr() && denied.error.code).toBe("results.official_selection_forbidden");
      await modules.teams.repositories.rosters.update(roster);
      const authorized = await modules.officialSelection.openDispute.execute(command);
      expect(authorized.isOk() && authorized.value).toEqual({ ...opened.value, replayed: true });
      expect((await read()).rows).toEqual(before.rows);
      expect(await count("match_disputes")).toBe(1);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "does not collide when a slot ID and reason contain legacy separators",
    async () => {
      const { modules } = await fresh();
      await new PostgresProviderMatchRepository(isolated.pool).upsertMany([
        providerMatch("m-2|tail"),
      ]);
      await modules.results.associateEncounterCandidates.execute({
        organizationId: ORG,
        encounterId: ENCOUNTER,
      });
      const proposed = await propose(modules);
      const command = {
        actorId: AWAY_CAPTAIN,
        organizationId: ORG,
        encounterId: ENCOUNTER,
        actingTeamId: AWAY,
        proposalId: proposed.proposal!.id,
        expectedVersion: 1,
        selections: slot("m-2|tail"),
        reason: "end",
        commandKey: "separator-alternative",
      };
      const original = await modules.officialSelection.proposeAlternative.execute(command);
      if (!original.isOk()) throw new Error("alternative failed");
      expect(original.value.proposal?.slots).toEqual([
        { officialSlot: 1, providerMatchRef: { providerKey: "ea-clubs", externalId: "m-2|tail" } },
      ]);
      expect(original.value.proposal?.reason).toBe("end");
      const same = await modules.officialSelection.proposeAlternative.execute(command);
      expect(same.isOk() && same.value).toEqual({ ...original.value, replayed: true });
      const colliding = { ...command, selections: slot("m-2"), reason: "tail|end" };
      const changed = await modules.officialSelection.proposeAlternative.execute(colliding);
      expect(changed.isErr() && changed.error.code).toBe("results.command_key_reused");

      // Seed a historical receipt independently. Do not update an append-only row.
      const legacyFingerprint = `alternative|${AWAY}|${proposed.proposal!.id}|1|1=ea-clubs:m-2|tail|end`;
      await isolated.pool.query(
        `INSERT INTO official_selection_actions (
         id, selection_id, proposal_id, organization_id, competition_id, encounter_id,
         action_type, from_status, to_status, version_before, version_after, actor_id, team_id,
         capacity, reason, command_key, request_fingerprint, details, occurred_at
       ) SELECT 'legacy-separator', selection_id, proposal_id, organization_id, competition_id, encounter_id,
         action_type, from_status, to_status, version_before, version_after, actor_id, team_id,
         capacity, reason, 'legacy-separator', $2, details, occurred_at
         FROM official_selection_actions WHERE id = $1`,
        [original.value.actions[0]!.id, legacyFingerprint],
      );
      const readLegacy = () =>
        isolated.pool.query(
          "SELECT to_jsonb(a) AS row FROM official_selection_actions a WHERE id = 'legacy-separator'",
        );
      const before = await readLegacy();
      const legacy = await modules.officialSelection.proposeAlternative.execute({
        ...command,
        commandKey: "legacy-separator",
      });
      expect(legacy.isOk() && legacy.value).toMatchObject({
        replayed: true,
        selection: { status: "disputed", version: 2 },
        proposal: { reason: "end", slots: slot("m-2|tail") },
        actions: [{ id: "legacy-separator", requestFingerprint: null }],
      });
      const legacyCollision = await modules.officialSelection.proposeAlternative.execute({
        ...colliding,
        commandKey: "legacy-separator",
      });
      expect(legacyCollision.isErr() && legacyCollision.error.code).toBe(
        "results.command_key_reused",
      );
      expect((await readLegacy()).rows).toEqual(before.rows);
      expect(await count("official_selection_actions")).toBe(3);
      expect(await count("official_selection_proposals")).toBe(2);
      expect(await count("match_disputes")).toBe(1);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "distinguishes optional null from a literal dash in opaque and legacy review receipts",
    async () => {
      const { modules } = await fresh();
      await propose(modules);
      const opened = await modules.officialSelection.openDispute.execute({
        actorId: HOME_CAPTAIN,
        organizationId: ORG,
        encounterId: ENCOUNTER,
        actingTeamId: HOME,
        expectedVersion: 1,
        reason: "Se invirtieron los slots",
        commandKey: "dash-open",
      });
      expect(opened.isOk() && opened.value.dispute?.openedReason).toBe("Se invirtieron los slots");
      const command = {
        actorId: OPERATOR,
        organizationId: ORG,
        encounterId: ENCOUNTER,
        expectedVersion: 2,
        commandKey: "dash-review",
      };
      const reviewed = await modules.officialSelection.reviewDispute.execute(command);
      if (!reviewed.isOk()) throw new Error("review failed");
      expect(reviewed.value.selection).toMatchObject({ status: "organizer_review", version: 3 });
      expect(reviewed.value.actions[0]?.reason).toBeNull();
      const changed = await modules.officialSelection.reviewDispute.execute({
        ...command,
        reason: "-",
      });
      expect(changed.isErr() && changed.error.code).toBe("results.command_key_reused");
      const replay = await modules.officialSelection.reviewDispute.execute({
        ...command,
        reason: "  ",
      });
      expect(replay.isOk() && replay.value).toEqual({ ...reviewed.value, replayed: true });
      await isolated.pool.query(
        `INSERT INTO official_selection_actions (
         id, selection_id, proposal_id, organization_id, competition_id, encounter_id,
         action_type, from_status, to_status, version_before, version_after, actor_id,
         capacity, reason, command_key, request_fingerprint, details, occurred_at
       ) SELECT 'legacy-dash', selection_id, proposal_id, organization_id, competition_id, encounter_id,
         action_type, from_status, to_status, version_before, version_after, actor_id,
         capacity, reason, 'legacy-dash', 'review_dispute|2|-', details, occurred_at
         FROM official_selection_actions WHERE id = $1`,
        [reviewed.value.actions[0]!.id],
      );
      const read = () =>
        isolated.pool.query(
          "SELECT to_jsonb(a) AS row FROM official_selection_actions a WHERE id = 'legacy-dash'",
        );
      const before = await read();
      const legacyCommand = { ...command, commandKey: "legacy-dash" };
      const legacy = await modules.officialSelection.reviewDispute.execute(legacyCommand);
      expect(legacy.isOk() && legacy.value).toMatchObject({
        replayed: true,
        selection: { status: "organizer_review", version: 3 },
        actions: [{ id: "legacy-dash", reason: null, requestFingerprint: null }],
      });
      const legacyChanged = await modules.officialSelection.reviewDispute.execute({
        ...legacyCommand,
        reason: "-",
      });
      expect(legacyChanged.isErr() && legacyChanged.error.code).toBe("results.command_key_reused");
      expect((await read()).rows).toEqual(before.rows);
      expect(await count("official_selection_actions")).toBe(4);
      expect(await count("match_disputes")).toBe(1);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "canonicalizes slot order without conflating a swap or an expected version",
    async () => {
      const { modules } = await fresh();
      const encounter = await modules.scheduling.encounters.findById(ENCOUNTER);
      if (!encounter) throw new Error("missing encounter");
      await modules.scheduling.encounters.upsert({ ...encounter, officialMatchCount: 2 });
      const command = {
        actorId: HOME_CAPTAIN,
        organizationId: ORG,
        encounterId: ENCOUNTER,
        actingTeamId: HOME,
        selections: [{ ...slot("m-2")[0]!, officialSlot: 2 as const }, slot("m-1")[0]!],
        expectedVersion: 0,
        commandKey: "ordered-slots",
      };
      const original = await modules.officialSelection.propose.execute(command);
      if (!original.isOk()) throw new Error("propose failed");
      expect(original.value.selection).toMatchObject({
        status: "awaiting_opponent_confirmation",
        version: 1,
      });
      expect(original.value.proposal?.slots).toEqual([
        { officialSlot: 1, providerMatchRef: { providerKey: "ea-clubs", externalId: "m-1" } },
        { officialSlot: 2, providerMatchRef: { providerKey: "ea-clubs", externalId: "m-2" } },
      ]);
      const reordered = await modules.officialSelection.propose.execute({
        ...command,
        selections: [...command.selections].reverse(),
      });
      expect(reordered.isOk() && reordered.value).toEqual({ ...original.value, replayed: true });
      const swapped = await modules.officialSelection.propose.execute({
        ...command,
        selections: [slot("m-2")[0]!, { ...slot("m-1")[0]!, officialSlot: 2 }],
      });
      expect(swapped.isErr() && swapped.error.code).toBe("results.command_key_reused");
      const newVersion = await modules.officialSelection.propose.execute({
        ...command,
        expectedVersion: 1,
      });
      expect(newVersion.isErr() && newVersion.error.code).toBe("results.command_key_reused");
      expect(await count("official_selection_actions")).toBe(1);
      expect(await count("official_selection_proposals")).toBe(1);
      expect(await count("official_selection_reference_claims", "released_at IS NULL")).toBe(2);
    },
    TEST_TIMEOUT_MS,
  );

  it.each(["sha256:not-a-digest", "sha512:unknown-format"])(
    "fails closed for a malformed or unknown receipt: %s",
    async (receipt) => {
      const { modules } = await fresh();
      const original = await propose(modules);
      await isolated.pool.query(
        `INSERT INTO official_selection_actions (
           id, selection_id, proposal_id, organization_id, competition_id, encounter_id,
           action_type, from_status, to_status, version_before, version_after, actor_id, team_id,
           capacity, reason, command_key, request_fingerprint, occurred_at
         ) SELECT 'unknown-receipt', selection_id, proposal_id, organization_id, competition_id, encounter_id,
           action_type, from_status, to_status, version_before, version_after, actor_id, team_id,
           capacity, reason, 'unknown-receipt', $2, occurred_at
           FROM official_selection_actions WHERE id = $1`,
        [original.actions[0]!.id, receipt],
      );
      const failed = await modules.officialSelection.propose.execute({
        actorId: HOME_CAPTAIN,
        organizationId: ORG,
        encounterId: ENCOUNTER,
        actingTeamId: HOME,
        selections: slot("m-1"),
        expectedVersion: 0,
        commandKey: "unknown-receipt",
      });
      expect(failed.isErr() && failed.error.code).toBe("results.command_key_reused");
      const valid = await propose(modules);
      expect(valid).toEqual({ ...original, replayed: true });
      expect(await count("official_selection_actions")).toBe(2);
      expect(await count("official_selection_proposals")).toBe(1);
      const stored = await isolated.pool.query(
        "SELECT request_fingerprint FROM official_selection_actions WHERE id = 'unknown-receipt'",
      );
      expect(stored.rows).toEqual([{ request_fingerprint: receipt }]);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "replays a multi-action legacy approval without another result or projection",
    async () => {
      const { modules, project } = await fresh();
      const proposed = await propose(modules);
      const command = {
        actorId: AWAY_CAPTAIN,
        organizationId: ORG,
        encounterId: ENCOUNTER,
        actingTeamId: AWAY,
        proposalId: proposed.proposal!.id,
        expectedVersion: 1,
        commandKey: "opaque-confirm",
      };
      const original = await modules.officialSelection.confirm.execute(command);
      if (!original.isOk()) throw new Error("confirm failed");
      expect(original.value.approvedResult).toMatchObject({
        revision: 1,
        status: "approved",
        approvalBasis: "team_agreement",
        slots: [{ officialSlot: 1, homeGoals: 2, awayGoals: 1 }],
      });
      const opaque = await isolated.pool.query(
        "SELECT request_fingerprint FROM official_selection_actions WHERE command_key = 'opaque-confirm' ORDER BY seq",
      );
      expect(opaque.rows).toHaveLength(2);
      expect(opaque.rows[0].request_fingerprint).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(opaque.rows[1].request_fingerprint).toBe(opaque.rows[0].request_fingerprint);
      const legacyFingerprint = `confirm|${AWAY}|${command.proposalId}|1`;
      await isolated.pool.query(
        `INSERT INTO official_selection_actions (
         id, selection_id, proposal_id, organization_id, competition_id, encounter_id,
         action_type, from_status, to_status, version_before, version_after, actor_id, team_id,
         capacity, reason, command_key, request_fingerprint, official_result_id, details, occurred_at
       ) SELECT 'legacy-' || action_type, selection_id, proposal_id, organization_id, competition_id, encounter_id,
         action_type, from_status, to_status, version_before, version_after, actor_id, team_id,
         capacity, reason, 'legacy-confirm', $1, official_result_id, details, occurred_at
         FROM official_selection_actions WHERE command_key = 'opaque-confirm' ORDER BY seq`,
        [legacyFingerprint],
      );
      const read = () =>
        isolated.pool.query(
          "SELECT to_jsonb(a) AS row FROM official_selection_actions a WHERE command_key = 'legacy-confirm' ORDER BY seq",
        );
      const before = await read();
      const replay = await modules.officialSelection.confirm.execute({
        ...command,
        commandKey: "legacy-confirm",
      });
      expect(replay.isOk() && replay.value).toMatchObject({
        replayed: true,
        selection: { status: "approved", version: 2 },
        proposal: { id: command.proposalId },
        approvedResult: {
          id: original.value.approvedResult!.id,
          revision: 1,
          approvalBasis: "team_agreement",
        },
        actions: [
          { id: "legacy-confirmed", type: "confirmed", requestFingerprint: null },
          { id: "legacy-approved", type: "approved", requestFingerprint: null },
        ],
      });
      const changed = await modules.officialSelection.confirm.execute({
        ...command,
        proposalId: "different-proposal",
        commandKey: "legacy-confirm",
      });
      expect(changed.isErr() && changed.error.code).toBe("results.command_key_reused");
      expect((await read()).rows).toEqual(before.rows);
      expect(await count("official_results")).toBe(1);
      expect(await count("official_selection_proposals")).toBe(1);
      expect(await count("official_selection_actions")).toBe(5);
      expect(project).toHaveBeenCalledTimes(1);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "fails closed for a legacy equivalent alternative whose absent reason collided with a dash",
    async () => {
      const { modules, project } = await fresh();
      const proposed = await propose(modules);
      const command = {
        actorId: AWAY_CAPTAIN,
        organizationId: ORG,
        encounterId: ENCOUNTER,
        actingTeamId: AWAY,
        proposalId: proposed.proposal!.id,
        expectedVersion: 1,
        selections: slot("m-1"),
        reason: "",
        commandKey: "opaque-equivalent",
      };
      const original = await modules.officialSelection.proposeAlternative.execute(command);
      if (!original.isOk()) throw new Error("equivalent alternative failed");
      expect(original.value.approvedResult).toMatchObject({ revision: 1, status: "approved" });
      for (const [key, reason] of [
        ["legacy-ambiguous-alternative", "-"],
        ["legacy-ordinary-alternative", "Same evidence"],
      ]) {
        await isolated.pool.query(
          `INSERT INTO official_selection_actions (
           id, selection_id, proposal_id, organization_id, competition_id, encounter_id,
           action_type, from_status, to_status, version_before, version_after, actor_id, team_id,
           capacity, reason, command_key, request_fingerprint, official_result_id, details, occurred_at
         ) SELECT $1 || '-' || action_type, selection_id, proposal_id, organization_id, competition_id, encounter_id,
           action_type, from_status, to_status, version_before, version_after, actor_id, team_id,
           capacity, reason, $1, $2, official_result_id, details, occurred_at
           FROM official_selection_actions WHERE command_key = 'opaque-equivalent' ORDER BY seq`,
          [key, `alternative|${AWAY}|${command.proposalId}|1|1=ea-clubs:m-1|${reason}`],
        );
      }
      const read = () =>
        isolated.pool.query(
          "SELECT to_jsonb(a) AS row FROM official_selection_actions a ORDER BY seq",
        );
      const before = await read();
      for (const reason of ["", "-"]) {
        const ambiguous = await modules.officialSelection.proposeAlternative.execute({
          ...command,
          reason,
          commandKey: "legacy-ambiguous-alternative",
        });
        expect(ambiguous.isErr() && ambiguous.error.code).toBe("results.command_key_reused");
      }
      const ordinary = await modules.officialSelection.proposeAlternative.execute({
        ...command,
        reason: "Same evidence",
        commandKey: "legacy-ordinary-alternative",
      });
      expect(ordinary.isOk() && ordinary.value).toMatchObject({
        replayed: true,
        selection: { status: "approved", version: 2 },
        approvedResult: { id: original.value.approvedResult!.id, revision: 1 },
      });
      const opaque = await modules.officialSelection.proposeAlternative.execute(command);
      expect(opaque.isOk() && opaque.value).toEqual({ ...original.value, replayed: true });
      const newDash = await modules.officialSelection.proposeAlternative.execute({
        ...command,
        reason: "-",
      });
      expect(newDash.isErr() && newDash.error.code).toBe("results.command_key_reused");
      expect((await read()).rows).toEqual(before.rows);
      expect(await count("official_selection_actions")).toBe(7);
      expect(await count("official_selection_proposals")).toBe(1);
      expect(await count("official_results")).toBe(1);
      expect(project).toHaveBeenCalledTimes(1);
    },
    TEST_TIMEOUT_MS,
  );

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

      const resolutionCommand = {
        actorId: OPERATOR,
        organizationId: ORG,
        encounterId: ENCOUNTER,
        expectedVersion: 3,
        decision: { type: "approve_proposal" as const, proposalId: alternative.value.proposal!.id },
        reason: "Evidence checked",
        commandKey: "resolve",
      };
      const resolved = await selection.resolveDispute.execute(resolutionCommand);
      expect(resolved.isOk() && resolved.value.approvedResult?.approvalBasis).toBe(
        "operator_resolution",
      );
      expect(project).toHaveBeenCalledTimes(1);
      const resolutionReplay = await selection.resolveDispute.execute({
        ...resolutionCommand,
        decision: { ...resolutionCommand.decision, acknowledgeIntegrityFlags: false },
      });
      expect(resolutionReplay.isOk() && resolutionReplay.value).toEqual({
        ...(resolved.isOk() ? resolved.value : {}),
        replayed: true,
      });
      const acknowledged = await selection.resolveDispute.execute({
        ...resolutionCommand,
        decision: { ...resolutionCommand.decision, acknowledgeIntegrityFlags: true },
      });
      expect(acknowledged.isErr() && acknowledged.error.code).toBe("results.command_key_reused");

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
      const receipts = await isolated.pool.query(
        "SELECT request_fingerprint FROM official_selection_actions ORDER BY version_before",
      );
      expect(receipts.rows).toHaveLength(4);
      for (const receipt of receipts.rows) {
        expect(receipt.request_fingerprint).toMatch(/^sha256:[a-f0-9]{64}$/);
      }
      const newHistory = await isolated.pool.query(
        `SELECT
           (SELECT jsonb_agg(to_jsonb(p)) FROM official_selection_proposals p) AS proposals,
           (SELECT jsonb_agg(to_jsonb(a)) FROM official_selection_actions a) AS actions,
           (SELECT jsonb_agg(to_jsonb(d)) FROM match_disputes d) AS disputes`,
      );
      expect(JSON.stringify(newHistory.rows)).not.toContain(reason);
      expect(JSON.stringify(newHistory.rows)).not.toContain("arbitro@example.com");

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
        "SELECT reason, request_fingerprint FROM official_selection_actions WHERE id = $1",
        [rejected.value.actions[0]!.id],
      );
      expect(neighborStored.rows[0].reason).toBe("Se invirtieron los slots");
      expect(neighborStored.rows[0].request_fingerprint).toMatch(/^sha256:[a-f0-9]{64}$/);
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
        `INSERT INTO official_selection_confirmation_windows (proposal_id, confirmation_deadline)
         VALUES ($1, '2026-09-16T01:02:03.000Z')`,
        [proposalId],
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

      const roster = await modules.teams.repositories.rosters.findById(`roster-${AWAY_CAPTAIN}`);
      if (!roster) throw new Error("missing captain");
      await modules.teams.repositories.rosters.update({ ...roster, role: "player" });
      const denied = await modules.officialSelection.reject.execute({
        actorId: AWAY_CAPTAIN,
        organizationId: ORG,
        encounterId: ENCOUNTER,
        actingTeamId: AWAY,
        proposalId,
        expectedVersion: 1,
        reason: phoneReason,
        commandKey: "legacy-reject",
      });
      expect(denied.isErr() && denied.error.code).toBe("results.official_selection_forbidden");
      await modules.teams.repositories.rosters.update(roster);

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
