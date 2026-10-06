import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import {
  apiErrorSchema,
  officialSelectionCommandResponseSchema,
  officialSelectionViewSchema,
} from "@futrob/api-contracts";
import { parseOrganizationSlug } from "@futrob/organizations";
import { asActorId, asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import { PostgresProviderMatchRepository } from "@/adapters/game-data/persistence/postgres.repository.ts";
import { createApp } from "@/app.ts";
import type { CorrelationLogEntry } from "@/context/request-correlation.ts";
import {
  AWAY,
  AWAY_CAPTAIN,
  ENCOUNTER,
  HOME,
  HOME_CAPTAIN,
  NOW,
  OPERATOR,
  ORG,
  providerMatch,
  seedComposition,
} from "@/di/official-selection.composition.fixture.ts";
import { INTERNAL_JOB_SECRET, serviceHeaders } from "@/http/http-app.harness.ts";
import { seedActors } from "@/testing/seed-actors.ts";
import {
  createIsolatedSchema,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const suite = describe.skipIf(!databaseUrl);
const TEST_TIMEOUT_MS = 180_000;

const FOREIGN_ORG = asOrganizationId("org-foreign");
const FOREIGN_COMPETITION = asCompetitionId("comp-foreign");
const FOREIGN_TEAM = asTeamId("team-foreign");
const FOREIGN_CAPTAIN = asActorId("actor-foreign-captain");

const BASE = `/api/v1/organizations/${ORG}/encounters/${ENCOUNTER}/official-selection`;
const m = (externalId: string) => [
  { officialSlot: 1, providerMatchRef: { providerKey: "ea-clubs", externalId } },
];

/** Every response is read through the published wire contract. */
const commandOf = async (response: Response) =>
  officialSelectionCommandResponseSchema.parse(await response.json());
const viewOf = async (response: Response) =>
  officialSelectionViewSchema.parse(await response.json());
const errorOf = async (response: Response) => apiErrorSchema.parse(await response.json());

suite("Team official-selection routes over HTTP on Postgres", () => {
  let isolated: IsolatedSchema;

  beforeAll(async () => {
    isolated = await createIsolatedSchema(databaseUrl ?? "", "selection_http");
    await migrateIsolatedSchema(isolated.pool);
  }, TEST_TIMEOUT_MS);

  afterAll(async () => {
    await isolated?.drop();
  }, TEST_TIMEOUT_MS);

  async function fresh() {
    const schema = `"${isolated.schema}"`;
    await isolated.pool.query(
      `TRUNCATE ${schema}.organizations, ${schema}.actors, ${schema}.provider_matches RESTART IDENTITY CASCADE`,
    );
    const matches = new PostgresProviderMatchRepository(isolated.pool);
    const { modules } = await seedComposition({ pool: isolated.pool, matches });
    const logs: CorrelationLogEntry[] = [];
    const app = createApp({
      modules,
      checkDbHealth: () => Promise.resolve("ok"),
      internalJobSecret: INTERNAL_JOB_SECRET,
      correlationLogger: { info: (entry) => logs.push(entry), error: (entry) => logs.push(entry) },
    });
    return { app, modules, matches, logs };
  }

  type Fresh = Awaited<ReturnType<typeof fresh>>;

  function send(
    { app }: Fresh,
    actorId: string,
    method: "GET" | "POST",
    path: string,
    body?: unknown,
  ) {
    return app.request(path, {
      method,
      headers: serviceHeaders(actorId),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  const proposeBody = {
    actingTeamId: HOME,
    selections: m("m-1"),
    expectedVersion: 0,
    commandKey: "home-propose",
  };

  async function proposeAsHome(ctx: Fresh) {
    const response = await send(ctx, HOME_CAPTAIN, "POST", `${BASE}/proposals`, proposeBody);
    expect(response.status).toBe(200);
    const outcome = await commandOf(response);
    return { ...outcome, proposal: outcome.proposal! };
  }

  async function rows(sql: string, params: unknown[] = []) {
    return (await isolated.pool.query(sql, params)).rows;
  }

  async function count(table: string) {
    const [row] = await rows(`SELECT count(*)::int AS n FROM ${table}`);
    return Number(row.n);
  }

  /** Durable state a rejected command must leave untouched. */
  async function snapshot() {
    return {
      selections: await rows(
        "SELECT status, version, current_proposal_id FROM official_match_selections ORDER BY id",
      ),
      proposals: await count("official_selection_proposals"),
      actions: await count("official_selection_actions"),
      disputes: await count("match_disputes"),
      results: await count("official_results"),
      teamContributions: await count("team_match_contributions"),
    };
  }

  async function seedForeignTenant(ctx: Fresh) {
    await seedActors(isolated.pool, FOREIGN_CAPTAIN);
    const { modules } = ctx;
    await modules.organizations.repositories.organizations.create({
      id: FOREIGN_ORG,
      name: "Foreign",
      normalizedName: "foreign",
      slug: parseOrganizationSlug("org-foreign")!,
      timeZone: "America/Lima",
      logo: { kind: "monogram" },
      createdAt: NOW,
      createdByActorId: OPERATOR,
    });
    await modules.competitions.repository.saveDraft({
      competition: {
        id: FOREIGN_COMPETITION,
        organizationId: FOREIGN_ORG,
        name: "Foreign Cup",
        status: "draft",
        modality: "fc-clubs",
        gameEdition: "fc26",
        platform: "playstation",
        region: "south-america",
        timeZone: "America/Lima",
        format: "league",
        teams: { min: 2, max: null },
        schedule: { startsOn: null, endsOn: null },
        cover: { kind: "preset", preset: "cup" },
        createdByActorId: OPERATOR,
        createdAt: NOW,
        updatedAt: NOW,
      },
      rules: {
        competitionId: FOREIGN_COMPETITION,
        version: 1,
        regularStage: null,
        knockoutStage: null,
        awayGoalsEnabled: false,
        maxRosterSize: 11,
        createdAt: NOW,
      },
    });
    await modules.teams.repositories.teams.save({
      id: FOREIGN_TEAM,
      organizationId: FOREIGN_ORG,
      name: "Foreign",
      createdAt: NOW,
      createdByActorId: OPERATOR,
      creationKey: null,
    });
    const profile = await modules.teams.repositories.profiles.saveIfAbsent({
      id: "profile-foreign-captain",
      actorId: FOREIGN_CAPTAIN,
      createdAt: NOW,
    });
    await modules.teams.repositories.rosters.add({
      id: "roster-foreign-captain",
      organizationId: FOREIGN_ORG,
      competitionId: FOREIGN_COMPETITION,
      teamId: FOREIGN_TEAM,
      playerProfileId: profile.id,
      gameAccountId: null,
      role: "captain",
      createdAt: NOW,
    });
  }

  it(
    "A proposes m-1 without officializing and B's confirmation approves revision 1",
    async () => {
      const ctx = await fresh();

      const proposed = await send(ctx, HOME_CAPTAIN, "POST", `${BASE}/proposals`, proposeBody);
      expect(proposed.status).toBe(200);
      const proposal = await commandOf(proposed);
      expect(proposal).toMatchObject({
        selection: { status: "awaiting_opponent_confirmation", version: 1 },
        proposal: {
          proposingTeamId: "team-home",
          proposedByActorId: "actor-home-captain",
          slots: [
            { officialSlot: 1, providerMatchRef: { providerKey: "ea-clubs", externalId: "m-1" } },
          ],
        },
        actions: [{ type: "proposed", versionBefore: 0, versionAfter: 1, teamId: "team-home" }],
        approvedResult: null,
        replayed: false,
      });
      expect(await snapshot()).toEqual({
        selections: [
          {
            status: "awaiting_opponent_confirmation",
            version: 1,
            current_proposal_id: proposal.proposal!.id,
          },
        ],
        proposals: 1,
        actions: 1,
        disputes: 0,
        results: 0,
        teamContributions: 0,
      });

      const view = await send(ctx, AWAY_CAPTAIN, "GET", `${BASE}?actingTeamId=${AWAY}`);
      expect(view.status).toBe(200);
      expect(await viewOf(view)).toMatchObject({
        encounterId: "enc-selection",
        selection: { status: "awaiting_opponent_confirmation", version: 1 },
        proposals: [{ id: proposal.proposal!.id }],
        approvedResultId: null,
        allowedActions: ["confirm", "reject", "propose_alternative", "open_dispute"],
      });
      const proposerView = await send(ctx, HOME_CAPTAIN, "GET", `${BASE}?actingTeamId=${HOME}`);
      expect((await viewOf(proposerView)).allowedActions).toEqual(["open_dispute"]);

      const confirmed = await send(
        ctx,
        AWAY_CAPTAIN,
        "POST",
        `${BASE}/proposals/${proposal.proposal!.id}/confirm`,
        { actingTeamId: AWAY, expectedVersion: 1, commandKey: "away-confirm" },
      );
      expect(confirmed.status).toBe(200);
      const approval = await commandOf(confirmed);
      expect(approval).toMatchObject({
        selection: { status: "approved" },
        actions: [
          { type: "confirmed", teamId: "team-away" },
          { type: "approved", officialResultId: approval.approvedResult!.id },
        ],
        approvedResult: {
          revision: 1,
          status: "approved",
          approvalBasis: "team_agreement",
          proposalId: proposal.proposal!.id,
        },
        replayed: false,
      });

      expect(
        await rows(
          "SELECT id, revision, status, proposal_id FROM official_results WHERE encounter_id = $1",
          [ENCOUNTER],
        ),
      ).toEqual([
        {
          id: approval.approvedResult!.id,
          revision: 1,
          status: "approved",
          proposal_id: proposal.proposal!.id,
        },
      ]);
      expect(
        await rows(
          "SELECT status, version FROM official_match_selections WHERE encounter_id = $1",
          [ENCOUNTER],
        ),
      ).toEqual([{ status: "approved", version: approval.selection.version }]);
      expect(await count("team_match_contributions")).toBe(2);

      const after = await send(ctx, AWAY_CAPTAIN, "GET", `${BASE}?actingTeamId=${AWAY}`);
      expect(await viewOf(after)).toMatchObject({
        approvedResultId: approval.approvedResult!.id,
        allowedActions: [],
      });
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "a replay keeps the original outcome and a reused key with other slots conflicts",
    async () => {
      const ctx = await fresh();
      const first = await proposeAsHome(ctx);

      const replay = await send(ctx, HOME_CAPTAIN, "POST", `${BASE}/proposals`, proposeBody);
      expect(replay.status).toBe(200);
      expect(await commandOf(replay)).toEqual({ ...first, replayed: true });

      const reused = await send(ctx, HOME_CAPTAIN, "POST", `${BASE}/proposals`, {
        ...proposeBody,
        selections: m("m-2"),
      });
      expect(reused.status).toBe(409);
      expect(await errorOf(reused)).toMatchObject({ code: "results.command_key_reused" });
      expect(await rows("SELECT slots FROM official_selection_proposals")).toEqual([
        {
          slots: [
            { officialSlot: 1, providerMatchRef: { providerKey: "ea-clubs", externalId: "m-1" } },
          ],
        },
      ]);

      const confirm = () =>
        send(ctx, AWAY_CAPTAIN, "POST", `${BASE}/proposals/${first.proposal.id}/confirm`, {
          actingTeamId: AWAY,
          expectedVersion: 1,
          commandKey: "away-confirm",
        });
      const approved = await commandOf(await confirm());
      const confirmReplay = await confirm();
      expect(confirmReplay.status).toBe(200);
      expect(await commandOf(confirmReplay)).toEqual({ ...approved, replayed: true });
      expect(await count("official_results")).toBe(1);
      expect(await count("team_match_contributions")).toBe(2);
      expect(await count("official_selection_actions")).toBe(3);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "a motivated rejection disputes the proposal without an official result",
    async () => {
      const ctx = await fresh();
      const { proposal } = await proposeAsHome(ctx);

      const rejected = await send(
        ctx,
        AWAY_CAPTAIN,
        "POST",
        `${BASE}/proposals/${proposal.id}/reject`,
        {
          actingTeamId: AWAY,
          expectedVersion: 1,
          reason: "Ese partido fue un amistoso",
          commandKey: "away-reject",
        },
      );
      expect(rejected.status).toBe(200);
      expect(await commandOf(rejected)).toMatchObject({
        selection: { status: "disputed", version: 2 },
        actions: [{ type: "rejected", reason: "Ese partido fue un amistoso" }],
        dispute: { status: "open", openedByTeamId: "team-away" },
        approvedResult: null,
      });
      expect(await snapshot()).toMatchObject({
        selections: [{ status: "disputed", version: 2 }],
        disputes: 1,
        results: 0,
        teamContributions: 0,
      });

      const lateConfirm = await send(
        ctx,
        AWAY_CAPTAIN,
        "POST",
        `${BASE}/proposals/${proposal.id}/confirm`,
        { actingTeamId: AWAY, expectedVersion: 2, commandKey: "late-confirm" },
      );
      expect(lateConfirm.status).toBe(409);
      expect(await count("official_results")).toBe(0);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "a different alternative disputes without a result and an equivalent one approves",
    async () => {
      const alternativeBody = (proposalId: string, externalId: string) => ({
        actingTeamId: AWAY,
        expectedVersion: 1,
        selections: m(externalId),
        reason: "Ese fue el partido oficial",
        commandKey: "away-alternative",
      });

      const disagreeing = await fresh();
      const first = await proposeAsHome(disagreeing);
      const different = await send(
        disagreeing,
        AWAY_CAPTAIN,
        "POST",
        `${BASE}/proposals/${first.proposal.id}/alternative`,
        alternativeBody(first.proposal.id, "m-2"),
      );
      expect(different.status).toBe(200);
      expect(await commandOf(different)).toMatchObject({
        selection: { status: "disputed", version: 2 },
        proposal: {
          proposingTeamId: "team-away",
          supersedesProposalId: first.proposal.id,
          slots: [{ providerMatchRef: { externalId: "m-2" } }],
        },
        approvedResult: null,
      });
      expect(await snapshot()).toMatchObject({ results: 0, teamContributions: 0 });

      const agreeing = await fresh();
      const second = await proposeAsHome(agreeing);
      const equivalent = await send(
        agreeing,
        AWAY_CAPTAIN,
        "POST",
        `${BASE}/proposals/${second.proposal.id}/alternative`,
        alternativeBody(second.proposal.id, "m-1"),
      );
      expect(equivalent.status).toBe(200);
      const approval = await commandOf(equivalent);
      expect(approval).toMatchObject({
        selection: { status: "approved" },
        approvedResult: { revision: 1, status: "approved", approvalBasis: "team_agreement" },
        replayed: false,
      });
      expect(await rows("SELECT id, revision, proposal_id FROM official_results")).toEqual([
        {
          id: approval.approvedResult!.id,
          revision: 1,
          proposal_id: approval.approvedResult!.proposalId,
        },
      ]);
      expect(await count("team_match_contributions")).toBe(2);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "a forged actor, a self-confirmation and a foreign tenant fail without effects while B confirms",
    async () => {
      const ctx = await fresh();
      await seedForeignTenant(ctx);
      const { proposal } = await proposeAsHome(ctx);
      const confirmPath = `${BASE}/proposals/${proposal.id}/confirm`;
      const before = await snapshot();

      const forged = await send(ctx, HOME_CAPTAIN, "POST", confirmPath, {
        actingTeamId: AWAY,
        actorId: AWAY_CAPTAIN,
        role: "captain",
        expectedVersion: 1,
        commandKey: "forged",
      });
      expect(forged.status).toBe(403);
      expect(await errorOf(forged)).toMatchObject({ code: "results.official_selection_forbidden" });

      const self = await send(ctx, HOME_CAPTAIN, "POST", confirmPath, {
        actingTeamId: HOME,
        expectedVersion: 1,
        commandKey: "self",
      });
      expect(self.status).toBe(403);
      expect(await errorOf(self)).toMatchObject({ code: "results.self_confirmation_forbidden" });

      const foreignPath = `/api/v1/organizations/${FOREIGN_ORG}/encounters/${ENCOUNTER}/official-selection`;
      const crossTenant = await send(
        ctx,
        FOREIGN_CAPTAIN,
        "POST",
        `${foreignPath}/proposals/${proposal.id}/confirm`,
        {
          actingTeamId: FOREIGN_TEAM,
          expectedVersion: 1,
          commandKey: "foreign",
        },
      );
      expect(crossTenant.status).toBe(404);
      expect(await errorOf(crossTenant)).toMatchObject({ code: "results.selection_not_found" });
      const foreignActor = await send(ctx, FOREIGN_CAPTAIN, "POST", confirmPath, {
        actingTeamId: AWAY,
        expectedVersion: 1,
        commandKey: "foreign-actor",
      });
      expect(foreignActor.status).toBe(403);
      const foreignRead = await send(
        ctx,
        FOREIGN_CAPTAIN,
        "GET",
        `${foreignPath}?actingTeamId=${FOREIGN_TEAM}`,
      );
      expect(foreignRead.status).toBe(404);

      expect(await snapshot()).toEqual(before);

      const valid = await send(ctx, AWAY_CAPTAIN, "POST", confirmPath, {
        actingTeamId: AWAY,
        expectedVersion: 1,
        commandKey: "away-confirm",
      });
      expect(valid.status).toBe(200);
      expect(await commandOf(valid)).toMatchObject({ selection: { status: "approved" } });
      expect(await count("official_results")).toBe(1);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "an unassociated reference is a 409 with no selection, while an associated one is proposed",
    async () => {
      const ctx = await fresh();
      await ctx.matches.upsertMany([providerMatch("m-unassociated")]);

      const unassociated = await send(ctx, HOME_CAPTAIN, "POST", `${BASE}/proposals`, {
        ...proposeBody,
        selections: m("m-unassociated"),
        commandKey: "unassociated",
      });
      expect(unassociated.status).toBe(409);
      expect(await errorOf(unassociated)).toMatchObject({
        code: "results.candidate_not_associated",
        messageKey: "errors.results.candidate_not_associated",
      });
      expect(await snapshot()).toEqual({
        selections: [],
        proposals: 0,
        actions: 0,
        disputes: 0,
        results: 0,
        teamContributions: 0,
      });

      const associated = await send(ctx, HOME_CAPTAIN, "POST", `${BASE}/proposals`, proposeBody);
      expect(associated.status).toBe(200);
      expect(await count("official_selection_proposals")).toBe(1);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "stale versions, a stale proposal, a missing snapshot and malformed bodies are 4xx",
    async () => {
      const ctx = await fresh();
      const { proposal } = await proposeAsHome(ctx);
      const confirm = (body: Record<string, unknown>, proposalId = proposal.id) =>
        send(ctx, AWAY_CAPTAIN, "POST", `${BASE}/proposals/${proposalId}/confirm`, {
          actingTeamId: AWAY,
          expectedVersion: 1,
          ...body,
        });

      const malformed = await confirm({ commandKey: "" });
      expect(malformed.status).toBe(400);
      expect(await errorOf(malformed)).toMatchObject({ code: "api.validation_error" });
      const missingTeam = await send(ctx, AWAY_CAPTAIN, "GET", BASE);
      expect(missingTeam.status).toBe(400);

      const stale = await confirm({ expectedVersion: 0, commandKey: "stale-version" });
      expect(stale.status).toBe(409);
      expect(await errorOf(stale)).toMatchObject({ code: "results.selection_version_conflict" });

      const unknownProposal = await confirm({ commandKey: "stale-proposal" }, "proposal-missing");
      expect(unknownProposal.status).toBe(409);
      expect(await errorOf(unknownProposal)).toMatchObject({
        code: "results.selection_proposal_stale",
      });

      await isolated.pool.query("DELETE FROM provider_matches WHERE external_match_id = 'm-1'");
      const missingSnapshot = await confirm({ commandKey: "missing-snapshot" });
      expect(missingSnapshot.status).toBe(409);
      expect(await errorOf(missingSnapshot)).toMatchObject({
        code: "results.provider_match_snapshot_missing",
        messageKey: "errors.results.provider_match_snapshot_missing",
      });
      expect(await count("official_results")).toBe(0);
    },
    TEST_TIMEOUT_MS,
  );

  it(
    "views and replays never serve raw sensitive reasons or fingerprints, including legacy rows",
    async () => {
      const ctx = await fresh();
      await proposeAsHome(ctx);
      const raw = "Marcador incorrecto; llamar +1-555-0100 o capi@example.com";
      const openBody = {
        actingTeamId: AWAY,
        expectedVersion: 1,
        reason: raw,
        commandKey: "away-dispute",
      };
      const opened = await send(ctx, AWAY_CAPTAIN, "POST", `${BASE}/disputes`, openBody);
      expect(opened.status).toBe(200);
      const dispute = await commandOf(opened);
      expect(dispute).toMatchObject({
        selection: { status: "disputed", version: 2 },
        dispute: { openedReason: "Marcador incorrecto; llamar [REDACTED] o [REDACTED]" },
        actions: [
          { type: "dispute_opened", reason: "Marcador incorrecto; llamar [REDACTED] o [REDACTED]" },
        ],
      });
      const [stored] = await rows(
        "SELECT reason, command_key, request_fingerprint FROM official_selection_actions WHERE action_type = 'dispute_opened'",
      );
      expect(stored).toMatchObject({
        reason: "Marcador incorrecto; llamar [REDACTED] o [REDACTED]",
        command_key: "away-dispute",
      });
      expect(stored.request_fingerprint).toMatch(/^sha256:[0-9a-f]{64}$/);

      // Rewrite the rows as they were stored before redaction and opaque receipts.
      const legacyFingerprint = `open_dispute|${AWAY}|1|${raw}`;
      const client = await isolated.pool.connect();
      try {
        await client.query(
          "ALTER TABLE official_selection_actions DISABLE TRIGGER official_selection_actions_append_only",
        );
        await client.query(
          "UPDATE official_selection_actions SET reason = $1, request_fingerprint = $2 WHERE action_type = 'dispute_opened'",
          [raw, legacyFingerprint],
        );
        await client.query(
          "ALTER TABLE official_selection_actions ENABLE TRIGGER official_selection_actions_append_only",
        );
        await client.query("UPDATE match_disputes SET opened_reason = $1", [raw]);
      } finally {
        client.release();
      }

      const forbidden = [
        "555-0100",
        "capi@example.com",
        "sha256:",
        legacyFingerprint,
        "away-dispute",
      ];
      const view = await send(ctx, HOME_CAPTAIN, "GET", `${BASE}?actingTeamId=${HOME}`);
      expect(view.status).toBe(200);
      const viewText = await view.text();
      for (const secret of forbidden) expect(viewText).not.toContain(secret);
      expect(JSON.parse(viewText)).toMatchObject({
        actions: [
          { type: "proposed", reason: null },
          { type: "dispute_opened", reason: "Marcador incorrecto; llamar [REDACTED] o [REDACTED]" },
        ],
        activeDispute: { openedReason: "Marcador incorrecto; llamar [REDACTED] o [REDACTED]" },
      });
      expect(JSON.parse(viewText).actions[1]).not.toHaveProperty("requestFingerprint");
      expect(JSON.parse(viewText).actions[1]).not.toHaveProperty("commandKey");

      const replay = await send(ctx, AWAY_CAPTAIN, "POST", `${BASE}/disputes`, openBody);
      expect(replay.status).toBe(200);
      const replayText = await replay.text();
      for (const secret of forbidden) expect(replayText).not.toContain(secret);
      expect(JSON.parse(replayText)).toMatchObject({
        replayed: true,
        dispute: { openedReason: "Marcador incorrecto; llamar [REDACTED] o [REDACTED]" },
        actions: [{ reason: "Marcador incorrecto; llamar [REDACTED] o [REDACTED]" }],
      });

      const changed = await send(ctx, AWAY_CAPTAIN, "POST", `${BASE}/disputes`, {
        ...openBody,
        reason: "Otro motivo",
      });
      expect(changed.status).toBe(409);
      expect(await errorOf(changed)).toMatchObject({ code: "results.command_key_reused" });
      expect(
        await rows(
          "SELECT reason FROM official_selection_actions WHERE action_type = 'dispute_opened'",
        ),
      ).toEqual([{ reason: raw }]);
    },
    TEST_TIMEOUT_MS,
  );
});
