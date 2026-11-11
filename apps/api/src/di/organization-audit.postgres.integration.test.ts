import { assignOrganizationPlanForTest } from "@/testing/organization-plan.fixture.ts";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { asActorId, asOrganizationId, asEncounterId } from "@futrob/shared-kernel";
import { createModules } from "./create-modules.ts";
import { stubFetch, serviceHeaders, INTERNAL_JOB_SECRET } from "@/http/http-app.harness.ts";
import { createApp } from "@/app.ts";
import { listOrganizationAuditResponseSchema } from "@futrob/api-contracts";
import { parseResponse } from "@/http/parse-response.ts";
import { buildAction } from "@/adapters/results/official-selection.fixtures.ts";
import {
  createIsolatedSchema,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";
import { seedActors } from "@/testing/seed-actors.ts";
import { runWithRequestCorrelation } from "@/context/request-correlation.ts";

import { ORGANIZATION_PERMISSION } from "@futrob/organizations";

const databaseUrl = process.env.TEST_DATABASE_URL;
describe.skipIf(!databaseUrl)("unified organization audit on Postgres", () => {
  let isolated: IsolatedSchema;
  beforeAll(async () => {
    isolated = await createIsolatedSchema(databaseUrl ?? "", "organization_audit");
    await migrateIsolatedSchema(isolated.pool);
  });
  afterAll(async () => {
    await isolated?.drop();
  });

  it("filters competition denies in PostgreSQL before source limits and global cursors", async () => {
    const actorId = asActorId("audit-scopes-pg-owner");
    await seedActors(isolated.pool, actorId);
    const modules = createModules({
      pool: isolated.pool,
      fetcher: stubFetch,
      eaClubsBaseUrl: "https://example.test",
    });
    const org = await modules.organizations.createOrganization.execute({
      actorId,
      name: "Audit scopes PostgreSQL",
      timeZone: "UTC",
    });
    if (org.isErr()) throw org.error;
    const organizationId = org.value.organization.id;
    await assignOrganizationPlanForTest(modules, { organizationId, actorId });
    const competitionIds = [];
    for (const name of ["Permitted", "Denied"]) {
      const draft = await modules.competitions.createDraft.execute({
        actorId,
        organizationId,
        name,
        format: "league",
        gameEdition: "fc26",
        platform: "playstation",
        region: "south-america",
        timeZone: "UTC",
      });
      if (draft.isErr()) throw draft.error;
      competitionIds.push(draft.value.competition.id);
    }
    const [permittedId, deniedId] = competitionIds;
    if (!permittedId || !deniedId) throw new Error("Expected two competitions");
    const deny = await modules.authorization.upsertGrant.execute({
      actorId,
      targetActorId: actorId,
      organizationId,
      permission: ORGANIZATION_PERMISSION.auditTrailRead,
      effect: "deny",
      scopeType: "competition",
      scopeId: deniedId,
      scope: { organizationId, competitionId: deniedId },
      reason: "Restricted competition history",
    });
    if (deny.isErr()) throw deny.error;
    for (const [id, competitionId] of [
      ["z-denied-3", deniedId],
      ["z-denied-2", deniedId],
      ["z-denied-1", deniedId],
      ["c-organization", null],
      ["b-permitted", permittedId],
      ["a-permitted", permittedId],
    ] as const) {
      await modules.audit.operations.append({
        id,
        organizationId,
        competitionId,
        actorId,
        action: "audit.scope_fixture",
        reason: null,
        occurredAt: new Date("2026-11-11T00:00:00Z"),
        requestId: null,
        object: {
          type: "competition",
          id: competitionId ?? organizationId,
          label: null,
          href: null,
        },
      });
    }
    const app = createApp({
      modules,
      internalJobSecret: INTERNAL_JOB_SECRET,
      checkDbHealth: () => Promise.resolve("ok"),
      correlationLogger: { info: () => {}, error: () => {} },
    });
    const path = `/api/v1/organizations/${organizationId}/audit`;
    expect(
      (
        await app.request(`${path}?competitionId=${deniedId}`, {
          headers: serviceHeaders(actorId),
        })
      ).status,
    ).toBe(403);
    let cursor: string | undefined;
    const entries = [];
    do {
      const query = new URLSearchParams({ limit: "1", action: "audit.scope_fixture" });
      if (cursor) query.set("cursor", cursor);
      const response = await app.request(`${path}?${query}`, { headers: serviceHeaders(actorId) });
      expect(response.status).toBe(200);
      const page = await parseResponse(listOrganizationAuditResponseSchema, response);
      expect(page.entries).toHaveLength(1);
      entries.push(...page.entries);
      cursor = page.nextCursor ?? undefined;
    } while (cursor);
    expect(entries.map((entry) => entry.id)).toEqual([
      "60:operation:c-organization",
      "60:operation:b-permitted",
      "60:operation:a-permitted",
    ]);
    expect(entries.every((entry) => entry.competitionId !== deniedId)).toBe(true);
  });

  it("redacts legacy result reasons on GET while preserving the original PostgreSQL row", async () => {
    const actorId = asActorId("audit-legacy-pg-owner");
    await seedActors(isolated.pool, actorId);
    const modules = createModules({
      pool: isolated.pool,
      fetcher: stubFetch,
      eaClubsBaseUrl: "https://example.test",
    });
    const org = await modules.organizations.createOrganization.execute({
      actorId,
      name: "Legacy result audit",
      timeZone: "UTC",
    });
    if (org.isErr()) throw org.error;
    const organizationId = org.value.organization.id;
    const draft = await modules.competitions.createDraft.execute({
      actorId,
      organizationId,
      name: "Legacy result competition",
      format: "league",
      gameEdition: "fc26",
      platform: "playstation",
      region: "south-america",
      timeZone: "UTC",
    });
    if (draft.isErr()) throw draft.error;
    const competitionId = draft.value.competition.id;
    const encounterId = asEncounterId("legacy-pg-audit-encounter");
    const reason = "Score corrected. Contact referee@example.test or +1 202 555 0146.";
    const action = buildAction(null, { organizationId, competitionId, encounterId }, actorId, {
      type: "legacy_review_required",
      reason,
    });
    await modules.results.selections.recordAudit(action);
    const app = createApp({
      modules,
      internalJobSecret: INTERNAL_JOB_SECRET,
      checkDbHealth: () => Promise.resolve("ok"),
      correlationLogger: { info: () => {}, error: () => {} },
    });
    const response = await app.request(
      `/api/v1/organizations/${organizationId}/audit?competitionId=${competitionId}&action=results.legacy_review_required`,
      {
        headers: serviceHeaders(actorId),
      },
    );
    expect(response.status).toBe(200);
    const page = await parseResponse(listOrganizationAuditResponseSchema, response);
    expect(page.entries).toHaveLength(1);
    expect(page.entries[0]?.reason).toBe("Score corrected. Contact [REDACTED] or [REDACTED].");
    const stored = await isolated.pool.query(
      "SELECT reason FROM official_selection_actions WHERE id = $1",
      [action.id],
    );
    expect(stored.rows).toEqual([{ reason }]);
    expect(await modules.results.selections.listActions(encounterId)).toEqual([action]);
  });

  it("filters every source by tenant and paginates same-millisecond entries without skips", async () => {
    const owner = asActorId("audit-owner");
    const outsider = asActorId("audit-outsider");
    await seedActors(isolated.pool, owner, outsider);
    const modules = createModules({
      pool: isolated.pool,
      fetcher: stubFetch,
      eaClubsBaseUrl: "https://example.test",
    });
    const created = await modules.organizations.createOrganization.execute({
      actorId: owner,
      name: "Audited tenant",
      timeZone: "UTC",
    });
    if (created.isErr()) throw created.error;
    const organizationId = created.value.organization.id;
    const foreign = await modules.organizations.createOrganization.execute({
      actorId: outsider,
      name: "Foreign audit tenant",
      timeZone: "UTC",
    });
    if (foreign.isErr()) throw foreign.error;
    const team = await modules.teams.createTeam.execute({
      actorId: owner,
      organizationId,
      name: "Audit team",
    });
    if (team.isErr()) throw team.error;
    const at = new Date("2026-11-10T10:00:00.123Z");
    await isolated.pool.query("UPDATE organizations SET created_at = $1 WHERE id = $2", [
      at,
      organizationId,
    ]);
    await isolated.pool.query(
      "UPDATE teams SET created_at = '2026-11-10T10:00:00.123987Z' WHERE id = $1",
      [team.value.id],
    );
    const fact = {
      id: "audit-operation",
      organizationId,
      competitionId: null,
      actorId: owner,
      action: "teams.external_club_connected",
      reason: "Verified club",
      occurredAt: at,
      requestId: "request-audit",
      object: { type: "team", id: team.value.id, label: "Audit team", href: null },
    };
    await modules.audit.operations.append(fact);
    await modules.audit.operations.append(fact);
    await modules.audit.operations.append({
      ...fact,
      id: "foreign-operation",
      organizationId: foreign.value.organization.id,
      actorId: outsider,
      object: { ...fact.object, id: "foreign-object" },
    });
    let cursor: { occurredAt: Date; id: string } | undefined;
    const entries = [];
    do {
      const read = await modules.audit.list.execute({
        actorId: owner,
        query: { organizationId, limit: 1, cursor, from: at, to: at },
      });
      if (read.isErr()) throw read.error;
      entries.push(...read.value.entries);
      cursor = read.value.nextCursor ?? undefined;
    } while (cursor);
    expect(entries.map((entry) => entry.id)).toEqual([
      "60:operation:audit-operation",
      `03:team:${team.value.id}`,
      `01:organization:${organizationId}`,
    ]);
    expect(entries.every((entry) => entry.organizationId === organizationId)).toBe(true);
    expect(entries[0]).toMatchObject({
      actorId: owner,
      reason: "Verified club",
      occurredAt: at,
      object: { href: `/orgs/${organizationId}/teams` },
    });
    const filtered = await modules.audit.list.execute({
      actorId: owner,
      query: { organizationId, limit: 25, action: "teams.external_club_connected", actorId: owner },
    });
    expect(filtered.isOk() && filtered.value.entries).toHaveLength(1);
    const denied = await modules.audit.list.execute({
      actorId: outsider,
      query: { organizationId, limit: 25 },
    });
    expect(denied.isErr() && denied.error.code).toBe("authorization.forbidden");
    const empty = await modules.audit.list.execute({
      actorId: owner,
      query: {
        organizationId,
        limit: 25,
        competitionId: undefined,
        actorId: asActorId("unrecorded"),
      },
    });
    expect(empty.isOk() && empty.value.entries).toHaveLength(0);

    await expect(
      isolated.pool.query(
        "UPDATE organization_operation_audit SET reason = 'rewrite' WHERE id = 'audit-operation'",
      ),
    ).rejects.toThrow("append-only");
    await expect(
      isolated.pool.query("DELETE FROM organization_operation_audit WHERE id = 'audit-operation'"),
    ).rejects.toThrow("append-only");
    const rows = await isolated.pool.query(
      "SELECT organization_id FROM organization_operation_audit WHERE id = 'foreign-operation'",
    );
    const foreignOrganizationId = asOrganizationId(String(rows.rows[0].organization_id));
    await expect(
      isolated.pool.query("DELETE FROM organizations WHERE id = $1", [foreignOrganizationId]),
    ).resolves.toBeDefined();
    expect(
      (
        await isolated.pool.query(
          "SELECT id FROM organization_operation_audit WHERE organization_id = $1",
          [foreignOrganizationId],
        )
      ).rows,
    ).toHaveLength(0);
  });

  it("projects existing rejection activity once with its actor, competition and event timestamp", async () => {
    const actorId = asActorId("audit-rejected-entry-owner");
    await seedActors(isolated.pool, actorId);
    const modules = createModules({
      pool: isolated.pool,
      fetcher: stubFetch,
      eaClubsBaseUrl: "https://example.test",
    });
    const created = await modules.organizations.createOrganization.execute({
      actorId,
      name: "Existing entry decision",
      timeZone: "UTC",
    });
    if (created.isErr()) throw created.error;
    const organizationId = created.value.organization.id;
    const draft = await modules.competitions.createDraft.execute({
      actorId,
      organizationId,
      name: "Audited entries",
      format: "league",
      gameEdition: "fc26",
      platform: "playstation",
      region: "south-america",
      timeZone: "UTC",
    });
    if (draft.isErr()) throw draft.error;
    const competitionId = draft.value.competition.id;
    const occurredAt = new Date("2026-11-10T10:00:00.000Z");
    const fact = {
      organizationId,
      competitionId,
      actorId,
      occurredAt,
      kind: "organizer_decision",
      source: { name: "organizer_decision", id: "existing-rejected-entry" },
      resource: { type: "competition", id: competitionId },
      subject: { teamName: "Rejected team", outcome: "entry_rejected" },
      bornClosed: true,
      recipients: [
        { audience: "organization", audienceId: organizationId, requiresAction: false },
        { audience: "team", audienceId: "rejected-team", requiresAction: false },
      ],
    } satisfies Parameters<typeof modules.notifications.recordActivity.execute>[0];
    for (const replay of [fact, fact])
      expect((await modules.notifications.recordActivity.execute(replay)).isOk()).toBe(true);
    const read = await modules.audit.list.execute({
      actorId,
      query: {
        organizationId,
        competitionId,
        actorId,
        action: "competitions.entry_rejected",
        from: occurredAt,
        to: occurredAt,
        limit: 25,
      },
    });
    if (read.isErr()) throw read.error;
    expect(read.value.entries).toHaveLength(1);
    expect(read.value.entries[0]).toMatchObject({
      id: "05:entry-decision:existing-rejected-entry",
      organizationId,
      competitionId,
      actorId,
      action: "competitions.entry_rejected",
      occurredAt,
      object: {
        type: "competition",
        id: competitionId,
        label: "Rejected team",
        href: `/orgs/${organizationId}/competitions/${competitionId}`,
      },
    });
  });

  it("rolls a club association back when its audit insert fails", async () => {
    const actorId = asActorId("audit-club-owner");
    await seedActors(isolated.pool, actorId);
    const modules = createModules({
      pool: isolated.pool,
      fetcher: stubFetch,
      eaClubsBaseUrl: "https://example.test",
    });
    const org = await modules.organizations.createOrganization.execute({
      actorId,
      name: "Audit rollback",
      timeZone: "UTC",
    });
    if (org.isErr()) throw org.error;
    const organizationId = org.value.organization.id;
    const team = await modules.teams.createTeam.execute({
      actorId,
      organizationId,
      name: "Rollback team",
    });
    if (team.isErr()) throw team.error;
    await isolated.pool
      .query(`CREATE FUNCTION reject_club_audit() RETURNS trigger AS $$ BEGIN IF NEW.action = 'teams.external_club_connected' THEN RAISE EXCEPTION 'audit unavailable'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql;
      CREATE TRIGGER reject_club_audit BEFORE INSERT ON organization_operation_audit FOR EACH ROW EXECUTE FUNCTION reject_club_audit()`);
    try {
      await expect(
        modules.audit.commands.connectTeamExternalClub.execute({
          actorId,
          organizationId,
          teamId: team.value.id,
          providerKey: "ea-clubs",
          externalClubId: "club-rollback",
          externalClubName: "Club",
          gameEdition: "fc26",
          platform: "common-gen5",
        }),
      ).rejects.toThrow("audit unavailable");
      expect(await modules.teams.externalClubConnections.findByTeam(team.value.id)).toBeNull();
    } finally {
      await isolated.pool.query(
        "DROP TRIGGER reject_club_audit ON organization_operation_audit; DROP FUNCTION reject_club_audit()",
      );
    }
  });

  it("retains distinct club relinks sharing a request correlation without duplicating a replay", async () => {
    const actorId = asActorId("audit-relink-owner");
    await seedActors(isolated.pool, actorId);
    const modules = createModules({
      pool: isolated.pool,
      fetcher: stubFetch,
      eaClubsBaseUrl: "https://example.test",
    });
    const org = await modules.organizations.createOrganization.execute({
      actorId,
      name: "Audit relinks",
      timeZone: "UTC",
    });
    if (org.isErr()) throw org.error;
    const organizationId = org.value.organization.id;
    const team = await modules.teams.createTeam.execute({
      actorId,
      organizationId,
      name: "Relink team",
    });
    if (team.isErr()) throw team.error;
    await runWithRequestCorrelation(
      { requestId: "99330000-0000-4000-8000-000000000001" },
      { info: () => {}, error: () => {} },
      async () => {
        for (const externalClubId of ["club-first", "club-second", "club-second"]) {
          const result = await modules.audit.commands.connectTeamExternalClub.execute({
            actorId,
            organizationId,
            teamId: team.value.id,
            providerKey: "ea-clubs",
            externalClubId,
            externalClubName: externalClubId,
            gameEdition: "fc26",
            platform: "common-gen5",
          });
          expect(result.isOk()).toBe(true);
        }
      },
    );
    const result = await modules.audit.list.execute({
      actorId,
      query: { organizationId, action: "teams.external_club_connected", limit: 25 },
    });
    if (result.isErr()) throw result.error;
    expect(result.value.entries.map((entry) => entry.object.label).sort()).toEqual([
      "club-first",
      "club-second",
    ]);
  });
});
