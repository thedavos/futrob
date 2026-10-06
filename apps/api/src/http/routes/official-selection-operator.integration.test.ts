import { serve } from "@hono/node-server";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vite-plus/test";
import {
  apiErrorSchema,
  officialSelectionCommandResponseSchema,
  officialSelectionViewSchema,
} from "@futrob/api-contracts";
import { RESULT_PERMISSION } from "@futrob/results";
import { PostgresProviderMatchRepository } from "@/adapters/game-data/persistence/postgres.repository.ts";
import { createApp } from "@/app.ts";
import {
  AWAY,
  AWAY_CAPTAIN,
  ENCOUNTER,
  HOME,
  HOME_CAPTAIN,
  NOW,
  OPERATOR,
  ORG,
  SECOND_ENCOUNTER,
  STAFF,
  providerMatch,
  seedComposition,
  slot,
} from "@/di/official-selection.composition.fixture.ts";
import { INTERNAL_JOB_SECRET, serviceHeaders } from "@/http/http-app.harness.ts";
import {
  createIsolatedSchema,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const suite = describe.skipIf(!databaseUrl);
const BASE = `/api/v1/organizations/${ORG}/encounters/${ENCOUNTER}/official-selection`;
const DISPUTES = `${BASE}/disputes`;
const TIMEOUT = 180_000;
const commandOf = async (response: Response) =>
  officialSelectionCommandResponseSchema.parse(await response.json());
const viewOf = async (response: Response) =>
  officialSelectionViewSchema.parse(await response.json());
const errorOf = async (response: Response) => apiErrorSchema.parse(await response.json());

suite("operator disputes over live HTTP and Postgres", () => {
  let isolated: IsolatedSchema;
  let server: ReturnType<typeof serve> | undefined;

  beforeAll(async () => {
    isolated = await createIsolatedSchema(databaseUrl ?? "", "operator_http");
    await migrateIsolatedSchema(isolated.pool);
  }, TIMEOUT);
  afterEach(async () => {
    if (server) {
      const current = server;
      await new Promise<void>((resolve, reject) =>
        current.close((error) => (error ? reject(error) : resolve())),
      );
      server = undefined;
    }
  });
  afterAll(async () => {
    await isolated?.drop();
  }, TIMEOUT);

  async function fresh() {
    await isolated.pool.query(
      `TRUNCATE "${isolated.schema}".organizations, "${isolated.schema}".actors,
       "${isolated.schema}".provider_matches RESTART IDENTITY CASCADE`,
    );
    let now = NOW;
    const matches = new PostgresProviderMatchRepository(isolated.pool);
    const { modules } = await seedComposition({
      pool: isolated.pool,
      matches,
      clock: { now: () => now },
      resultsSystemActorId: OPERATOR,
    });
    const app = createApp({
      modules,
      internalJobSecret: INTERNAL_JOB_SECRET,
      checkDbHealth: () => Promise.resolve("ok"),
      correlationLogger: { info() {}, error() {} },
    });
    const origin = await new Promise<string>((resolve) => {
      server = serve({ fetch: app.fetch, hostname: "127.0.0.1", port: 0 }, (info) =>
        resolve(`http://127.0.0.1:${info.port}`),
      );
    });
    return { origin, modules, matches, setNow: (value: Date) => (now = value) };
  }

  type Fresh = Awaited<ReturnType<typeof fresh>>;
  function send(ctx: Fresh, actor: string, path: string, body?: unknown) {
    return fetch(`${ctx.origin}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: serviceHeaders(actor),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }
  async function rows(sql: string, params: unknown[] = []) {
    return (await isolated.pool.query(sql, params)).rows;
  }
  async function snapshot() {
    const tables = [
      "official_match_selections",
      "official_selection_proposals",
      "official_selection_actions",
      "match_disputes",
      "official_selection_reference_claims",
      "official_results",
      "team_match_contributions",
      "player_match_contributions",
      "team_competition_stats",
      "player_competition_stats",
      "player_personal_stats",
      "competition_standing_snapshots",
      "ranking_snapshots",
    ];
    return Object.fromEntries(
      await Promise.all(
        tables.map(async (table) => [
          table,
          await rows(`SELECT to_jsonb(t) AS row FROM ${table} t ORDER BY to_jsonb(t)::text`),
        ]),
      ),
    );
  }
  async function accepted(response: Response) {
    expect(response.status).toBe(200);
    return commandOf(response);
  }
  async function propose(ctx: Fresh, version = 0, key = "home-propose") {
    return accepted(
      await send(ctx, HOME_CAPTAIN, `${BASE}/proposals`, {
        actingTeamId: HOME,
        selections: slot("m-1"),
        expectedVersion: version,
        commandKey: key,
      }),
    );
  }
  async function disputed(ctx: Fresh) {
    const proposed = await propose(ctx);
    const rejected = await accepted(
      await send(ctx, AWAY_CAPTAIN, `${BASE}/proposals/${proposed.proposal!.id}/reject`, {
        actingTeamId: AWAY,
        expectedVersion: 1,
        commandKey: "away-reject",
        reason: "Marcador incorrecto; capi@example.com",
      }),
    );
    expect(rejected.selection).toMatchObject({ status: "disputed", version: 2 });
    return proposed.proposal!;
  }
  const reviewBody = {
    expectedVersion: 2,
    commandKey: "operator-review",
    reason: "Revisar con arbitro@example.com",
  };
  async function review(ctx: Fresh, actor = OPERATOR) {
    return accepted(await send(ctx, actor, `${DISPUTES}/review`, reviewBody));
  }
  function approval(proposalId: string) {
    return {
      expectedVersion: 3,
      commandKey: "operator-resolve",
      reason: "Marcador 2-1 validado; llamar +1-555-0100",
      decision: { type: "approve_proposal", proposalId },
    };
  }
  async function expectProjection(resultId: string) {
    expect(
      await rows(
        "SELECT team_id, revision, goals_for, goals_against FROM team_match_contributions WHERE official_result_id = $1 ORDER BY side",
        [resultId],
      ),
    ).toEqual([
      { team_id: "team-away", revision: 1, goals_for: 1, goals_against: 2 },
      { team_id: "team-home", revision: 1, goals_for: 2, goals_against: 1 },
    ]);
    expect(
      await rows("SELECT team_id, matches_played FROM team_competition_stats ORDER BY team_id"),
    ).toEqual([
      { team_id: "team-away", matches_played: 1 },
      { team_id: "team-home", matches_played: 1 },
    ]);
  }

  it(
    "requires trusted authentication and contextual approve, ignoring client authority",
    async () => {
      const ctx = await fresh();
      const proposal = await disputed(ctx);
      const before = await snapshot();
      for (const path of [DISPUTES, `${DISPUTES}/review`, `${DISPUTES}/resolve`]) {
        const body =
          path === DISPUTES
            ? undefined
            : path.endsWith("review")
              ? reviewBody
              : approval(proposal.id);
        const noAuth = await fetch(`${ctx.origin}${path}`, {
          method: body ? "POST" : "GET",
          headers: { "Content-Type": "application/json", "X-Futrob-Actor-Id": OPERATOR },
          body: body ? JSON.stringify(body) : undefined,
        });
        expect(noAuth.status).toBe(401);
        expect(await errorOf(noAuth)).toMatchObject({ code: "api.unauthorized" });
        const denied = await send(
          ctx,
          STAFF,
          `${path}?actorId=${OPERATOR}&actingTeamId=${HOME}&role=organizer`,
          body
            ? {
                ...body,
                actorId: OPERATOR,
                role: "superuser",
                permissions: ["encounters.results.approve"],
              }
            : undefined,
        );
        expect(denied.status).toBe(403);
        expect(await errorOf(denied)).toMatchObject({
          code:
            path === DISPUTES
              ? "results.official_selection_forbidden"
              : "results.official_result_forbidden",
        });
      }
      const grant = {
        id: "operator-grant",
        organizationId: ORG,
        actorId: STAFF,
        permission: RESULT_PERMISSION.officialSelectionResolve,
        effect: "allow" as const,
        scopeType: "encounter" as const,
        scopeId: ENCOUNTER,
        grantedByActorId: OPERATOR,
        reason: "Delegación",
        createdAt: NOW,
        updatedAt: NOW,
      };
      await ctx.modules.organizations.repositories.grants.upsert(grant);
      expect((await send(ctx, STAFF, DISPUTES)).status).toBe(403);
      expect(await snapshot()).toEqual(before);
      await ctx.modules.organizations.repositories.grants.upsert({
        ...grant,
        id: "operator-approve-grant",
        permission: RESULT_PERMISSION.resultApprove,
      });
      const read = await send(ctx, STAFF, DISPUTES);
      expect(read.status).toBe(200);
      expect(await viewOf(read)).toMatchObject({
        selection: { status: "disputed", version: 2 },
        activeDispute: { openedReason: "Marcador incorrecto; [REDACTED]" },
        allowedActions: ["review_dispute"],
      });
      const otherEncounter = await send(ctx, STAFF, DISPUTES.replace(ENCOUNTER, SECOND_ENCOUNTER));
      expect(otherEncounter.status).toBe(403);
      const otherTenant = await send(ctx, STAFF, DISPUTES.replace(ORG, "org-other"));
      expect(otherTenant.status).toBe(404);
      expect(await errorOf(otherTenant)).toMatchObject({ code: "results.encounter_not_found" });
      const reviewed = await review(ctx, STAFF);
      expect(reviewed).toMatchObject({
        selection: { status: "organizer_review", version: 3 },
        actions: [{ actorId: "actor-staff-nogrant", capacity: "operator", teamId: null }],
      });
      const underReview = await snapshot();
      const deniedResolution = await send(
        ctx,
        HOME_CAPTAIN,
        `${DISPUTES}/resolve`,
        approval(proposal.id),
      );
      expect(deniedResolution.status).toBe(403);
      expect(await snapshot()).toEqual(underReview);
      const approved = await accepted(
        await send(ctx, STAFF, `${DISPUTES}/resolve`, approval(proposal.id)),
      );
      expect(approved.approvedResult).toMatchObject({
        revision: 1,
        approvalBasis: "operator_resolution",
      });
      await expectProjection(approved.approvedResult!.id);
    },
    TIMEOUT,
  );

  it(
    "takes and resolves m-1 once, with ordered redacted history and safe conflicts",
    async () => {
      const ctx = await fresh();
      const proposal = await disputed(ctx);
      const direct = await send(ctx, OPERATOR, `${DISPUTES}/resolve`, {
        ...approval(proposal.id),
        expectedVersion: 2,
      });
      expect(direct.status).toBe(409);
      expect(await errorOf(direct)).toMatchObject({ code: "results.selection_state_conflict" });
      const reviewed = await review(ctx);
      expect(reviewed).toMatchObject({
        selection: { status: "organizer_review", version: 3 },
        dispute: { status: "under_review" },
        actions: [{ type: "review_started", reason: "Revisar con [REDACTED]" }],
        approvedResult: null,
      });
      const before = await snapshot();
      const replayReview = await accepted(
        await send(ctx, OPERATOR, `${DISPUTES}/review`, reviewBody),
      );
      expect(replayReview).toEqual({ ...reviewed, replayed: true });
      for (const [body, status, code] of [
        [
          { ...approval(proposal.id), expectedVersion: 2 },
          409,
          "results.selection_version_conflict",
        ],
        [approval("proposal-missing"), 404, "results.proposal_not_found"],
        [{ ...approval(proposal.id), reason: " " }, 400, "api.validation_error"],
      ] as const) {
        const response = await send(ctx, OPERATOR, `${DISPUTES}/resolve`, body);
        expect(response.status).toBe(status);
        expect(await errorOf(response)).toMatchObject({ code });
      }
      expect(await snapshot()).toEqual(before);
      const body = approval(proposal.id);
      const approved = await accepted(await send(ctx, OPERATOR, `${DISPUTES}/resolve`, body));
      expect(approved).toMatchObject({
        selection: { status: "approved", version: 4 },
        approvedResult: {
          revision: 1,
          status: "approved",
          proposalId: proposal.id,
          approvalBasis: "operator_resolution",
        },
        dispute: {
          status: "resolved",
          resolution: "approved_proposal",
          resolutionProposalId: proposal.id,
          resolutionReason: "Marcador 2-1 validado; llamar [REDACTED]",
        },
        replayed: false,
      });
      await expectProjection(approved.approvedResult!.id);
      const persisted = await snapshot();
      const replay = await accepted(await send(ctx, OPERATOR, `${DISPUTES}/resolve`, body));
      expect(replay).toEqual({ ...approved, replayed: true });
      const reused = await send(ctx, OPERATOR, `${DISPUTES}/resolve`, {
        ...body,
        reason: "Motivo distinto",
      });
      expect(reused.status).toBe(409);
      expect(await errorOf(reused)).toMatchObject({ code: "results.command_key_reused" });
      expect(await snapshot()).toEqual(persisted);
      const response = await send(ctx, OPERATOR, DISPUTES);
      expect(response.status).toBe(200);
      const view = await viewOf(response);
      expect(view).toMatchObject({
        approvedResultId: approved.approvedResult!.id,
        activeDispute: null,
        proposals: [{ id: proposal.id, confirmationDeadline: "2026-09-15T21:00:00.000Z" }],
      });
      expect(
        view.actions.map(({ type, versionBefore, versionAfter }) => ({
          type,
          versionBefore,
          versionAfter,
        })),
      ).toEqual([
        { type: "proposed", versionBefore: 0, versionAfter: 1 },
        { type: "rejected", versionBefore: 1, versionAfter: 2 },
        { type: "review_started", versionBefore: 2, versionAfter: 3 },
        { type: "dispute_resolved_approved", versionBefore: 3, versionAfter: 4 },
      ]);
      const text = JSON.stringify({ view, replay });
      for (const secret of [
        "capi@example.com",
        "arbitro@example.com",
        "555-0100",
        "requestFingerprint",
        "commandKey",
        "sha256:",
        "operator-resolve",
      ]) {
        expect(text).not.toContain(secret);
      }
      expect(await rows("SELECT revision, approval_basis FROM official_results")).toEqual([
        { revision: 1, approval_basis: "operator_resolution" },
      ]);
    },
    TIMEOUT,
  );

  it(
    "redacts legacy operator reads and replays without rewriting the audit receipt",
    async () => {
      const ctx = await fresh();
      await disputed(ctx);
      const raw = "Revisar con arbitro@example.com; llamar +1-555-0100";
      const body = { ...reviewBody, reason: raw };
      const reviewed = await accepted(await send(ctx, OPERATOR, `${DISPUTES}/review`, body));
      await isolated.pool.query(
        `
      INSERT INTO official_selection_actions (
        id, selection_id, proposal_id, organization_id, competition_id, encounter_id,
        action_type, from_status, to_status, version_before, version_after, actor_id,
        capacity, reason, command_key, request_fingerprint, details, occurred_at
      ) SELECT 'legacy-review', selection_id, proposal_id, organization_id, competition_id, encounter_id,
        action_type, from_status, to_status, version_before, version_after, actor_id,
        capacity, $2, 'legacy-review', $3, details, occurred_at
        FROM official_selection_actions WHERE id = $1
    `,
        [reviewed.actions[0]!.id, raw, `review_dispute|2|${raw}`],
      );
      await isolated.pool.query("UPDATE match_disputes SET opened_reason = $1", [raw]);
      const before = await snapshot();
      const view = await viewOf(await send(ctx, OPERATOR, DISPUTES));
      expect(view).toMatchObject({
        selection: { status: "organizer_review", version: 3 },
        activeDispute: { openedReason: "Revisar con [REDACTED]; llamar [REDACTED]" },
      });
      expect(view.actions.find((action) => action.id === "legacy-review")?.reason).toBe(
        "Revisar con [REDACTED]; llamar [REDACTED]",
      );
      const replay = await accepted(
        await send(ctx, OPERATOR, `${DISPUTES}/review`, { ...body, commandKey: "legacy-review" }),
      );
      expect(replay).toMatchObject({
        selection: { status: "organizer_review", version: 3 },
        replayed: true,
        actions: [{ id: "legacy-review", reason: "Revisar con [REDACTED]; llamar [REDACTED]" }],
        approvedResult: null,
      });
      const exposed = JSON.stringify({ view, replay });
      for (const secret of [
        raw,
        "arbitro@example.com",
        "555-0100",
        "requestFingerprint",
        "commandKey",
        "review_dispute|2|",
      ]) {
        expect(exposed).not.toContain(secret);
      }
      expect(await snapshot()).toEqual(before);
    },
    TIMEOUT,
  );

  it(
    "returns to selection, frees m-1, and requires a new proposal and rival consent",
    async () => {
      const ctx = await fresh();
      const old = await disputed(ctx);
      await review(ctx);
      const body = {
        expectedVersion: 3,
        commandKey: "operator-return",
        reason: "Rehacer selección",
        decision: { type: "return_to_selection" },
      };
      const returned = await accepted(await send(ctx, OPERATOR, `${DISPUTES}/resolve`, body));
      expect(returned).toMatchObject({
        selection: {
          status: "selection_in_progress",
          version: 4,
          round: 2,
          currentProposalId: null,
        },
        proposal: null,
        dispute: { status: "resolved", resolution: "returned_to_selection" },
        approvedResult: null,
      });
      expect(
        await rows(
          "SELECT provider_key, external_match_id FROM official_selection_reference_claims WHERE released_at IS NOT NULL",
        ),
      ).toEqual([{ provider_key: "ea-clubs", external_match_id: "m-1" }]);
      expect(await rows("SELECT id FROM official_results")).toEqual([]);
      expect(await rows("SELECT id FROM team_match_contributions")).toEqual([]);
      const state = await snapshot();
      expect(await accepted(await send(ctx, OPERATOR, `${DISPUTES}/resolve`, body))).toEqual({
        ...returned,
        replayed: true,
      });
      expect(await snapshot()).toEqual(state);
      const next = await propose(ctx, 4, "home-new-round");
      expect(next).toMatchObject({
        selection: { status: "awaiting_opponent_confirmation", version: 5, round: 2 },
        proposal: { round: 2 },
        approvedResult: null,
      });
      expect(next.proposal!.id).not.toBe(old.id);
      const confirm = (id: string) =>
        send(ctx, AWAY_CAPTAIN, `${BASE}/proposals/${id}/confirm`, {
          actingTeamId: AWAY,
          expectedVersion: 5,
          commandKey: "away-new-consent",
        });
      const stale = await confirm(old.id);
      expect(stale.status).toBe(409);
      expect(await errorOf(stale)).toMatchObject({ code: "results.selection_proposal_stale" });
      expect(await rows("SELECT id FROM official_results")).toEqual([]);
      const approved = await accepted(await confirm(next.proposal!.id));
      expect(approved.approvedResult).toMatchObject({
        revision: 1,
        proposalId: next.proposal!.id,
        approvalBasis: "team_agreement",
      });
      await expectProjection(approved.approvedResult!.id);
    },
    TIMEOUT,
  );

  it(
    "requires explicit acknowledgement of the blocking flags before operator approval",
    async () => {
      const ctx = await fresh();
      const match = providerMatch("m-1");
      await ctx.matches.upsertMany([
        {
          ...match,
          metadata: { ...match.metadata, completeness: "partial", wasDisconnected: true },
        },
      ]);
      const proposed = await propose(ctx);
      const flagged = await accepted(
        await send(ctx, AWAY_CAPTAIN, `${BASE}/proposals/${proposed.proposal!.id}/confirm`, {
          actingTeamId: AWAY,
          expectedVersion: 1,
          commandKey: "flag-confirm",
        }),
      );
      expect(flagged.selection).toMatchObject({ status: "organizer_review", version: 2 });
      const flags = [
        {
          code: "provider_data_incomplete",
          providerMatchRef: { providerKey: "ea-clubs", externalId: "m-1" },
        },
        {
          code: "provider_match_disconnected",
          providerMatchRef: { providerKey: "ea-clubs", externalId: "m-1" },
        },
      ];
      expect(await viewOf(await send(ctx, OPERATOR, DISPUTES))).toMatchObject({
        integrityFlags: flags,
        allowedActions: ["resolve_dispute"],
      });
      const before = await snapshot();
      const body = { ...approval(proposed.proposal!.id), expectedVersion: 2 };
      for (const decision of [
        body.decision,
        { ...body.decision, acknowledgeIntegrityFlags: false },
      ]) {
        const denied = await send(ctx, OPERATOR, `${DISPUTES}/resolve`, { ...body, decision });
        expect(denied.status).toBe(409);
        expect(await errorOf(denied)).toMatchObject({
          code: "results.integrity_flags_not_acknowledged",
        });
      }
      expect(await snapshot()).toEqual(before);
      const approved = await accepted(
        await send(ctx, OPERATOR, `${DISPUTES}/resolve`, {
          ...body,
          decision: { ...body.decision, acknowledgeIntegrityFlags: true },
        }),
      );
      expect(approved).toMatchObject({
        selection: { status: "approved", version: 3 },
        actions: [{ type: "dispute_resolved_approved", details: { acknowledgedFlags: flags } }],
        integrityFlags: flags,
      });
      await expectProjection(approved.approvedResult!.id);
    },
    TIMEOUT,
  );

  it(
    "rolls back selection, audit, result and prior projection writes on a Postgres failure",
    async () => {
      const ctx = await fresh();
      const proposal = await disputed(ctx);
      await review(ctx);
      const before = await snapshot();
      await isolated.pool.query(`
      CREATE FUNCTION fail_operator_projection() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'injected standings failure';
      END;
      $$;
      CREATE TRIGGER fail_operator_projection BEFORE INSERT ON competition_standing_snapshots
      FOR EACH ROW EXECUTE FUNCTION fail_operator_projection();
    `);
      const body = approval(proposal.id);
      try {
        const failed = await send(ctx, OPERATOR, `${DISPUTES}/resolve`, body);
        expect(failed.status).toBe(500);
        expect(await errorOf(failed)).toMatchObject({
          code: "api.unexpected_error",
          messageKey: "errors.api.unexpected_error",
        });
        expect(await snapshot()).toEqual(before);
        expect(await viewOf(await send(ctx, OPERATOR, DISPUTES))).toMatchObject({
          selection: { status: "organizer_review", version: 3 },
          activeDispute: { status: "under_review" },
          approvedResultId: null,
        });
      } finally {
        await isolated.pool.query(
          "DROP TRIGGER fail_operator_projection ON competition_standing_snapshots; DROP FUNCTION fail_operator_projection()",
        );
      }
      const approved = await accepted(await send(ctx, OPERATOR, `${DISPUTES}/resolve`, body));
      expect(approved).toMatchObject({
        selection: { status: "approved", version: 4 },
        approvedResult: { revision: 1 },
        replayed: false,
      });
      await expectProjection(approved.approvedResult!.id);
      expect(
        await rows(
          "SELECT action_type FROM official_selection_actions WHERE action_type = 'dispute_resolved_approved'",
        ),
      ).toEqual([{ action_type: "dispute_resolved_approved" }]);
    },
    TIMEOUT,
  );

  it(
    "reads and resolves an expired proposal using the existing deadline runtime",
    async () => {
      const ctx = await fresh();
      const proposed = await propose(ctx);
      ctx.setNow(new Date("2026-09-15T21:00:00.000Z"));
      const run = await send(ctx, OPERATOR, "/api/v1/internal/results/confirmation-expiry/run", {});
      expect(run.status).toBe(200);
      expect(await viewOf(await send(ctx, OPERATOR, DISPUTES))).toMatchObject({
        selection: { status: "organizer_review", version: 2 },
        proposals: [{ confirmationDeadline: "2026-09-15T21:00:00.000Z" }],
        activeDispute: null,
        approvedResultId: null,
        actions: [
          { type: "proposed" },
          {
            type: "confirmation_expired",
            capacity: "system",
            details: {
              confirmationDeadline: "2026-09-15T21:00:00.000Z",
              processedAt: "2026-09-15T21:00:00.000Z",
            },
          },
        ],
        allowedActions: ["resolve_dispute"],
      });
      const approved = await accepted(
        await send(ctx, OPERATOR, `${DISPUTES}/resolve`, {
          ...approval(proposed.proposal!.id),
          expectedVersion: 2,
        }),
      );
      expect(approved.approvedResult).toMatchObject({
        revision: 1,
        approvalBasis: "operator_resolution",
      });
      await expectProjection(approved.approvedResult!.id);
    },
    TIMEOUT,
  );
});
