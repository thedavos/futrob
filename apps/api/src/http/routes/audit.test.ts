import { assignOrganizationPlanForTest } from "@/testing/organization-plan.fixture.ts";
import { describe, expect, it } from "vite-plus/test";
import {
  createOrganizationResponseSchema,
  listOrganizationAuditResponseSchema,
} from "@futrob/api-contracts";
import { buildAppWithModules, serviceHeaders, stubFetch } from "@/http/http-app.harness.ts";
import { parseResponse } from "@/http/parse-response.ts";
import { asActorId, asCompetitionId, asOrganizationId, asEncounterId } from "@futrob/shared-kernel";
import { ORGANIZATION_PERMISSION } from "@futrob/organizations";
import { createOrganizationCompetitionFixture } from "@/http/organization-competition.fixture.ts";
import { onboardingCompetition } from "@/http/http-app.harness.ts";

import { buildAction } from "@/adapters/results/official-selection.fixtures.ts";

describe("organization audit HTTP", () => {
  it("excludes denied competition rows before limits across every global page", async () => {
    const { app, modules } = buildAppWithModules(stubFetch);
    const actorId = asActorId("audit-scopes-owner");
    const org = await modules.organizations.createOrganization.execute({
      actorId,
      name: "Audit scopes",
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

  it("redacts legacy result reasons on GET without changing stored history or other contexts", async () => {
    const { app, modules } = buildAppWithModules(stubFetch);
    const actorId = asActorId("audit-legacy-owner");
    const fixture = await createOrganizationCompetitionFixture(app, {
      method: "POST",
      headers: serviceHeaders(actorId),
      body: JSON.stringify({
        name: "Legacy result audit",
        competition: onboardingCompetition,
        gameAccount: null,
      }),
    });
    const organizationId = asOrganizationId(fixture.organizationId);
    const competitionId = asCompetitionId(fixture.competition.competition.id);
    const encounterId = asEncounterId("legacy-audit-encounter");
    const reason = "Score corrected. Contact referee@example.test or +1 202 555 0146.";
    const action = buildAction(null, { organizationId, competitionId, encounterId }, actorId, {
      type: "legacy_review_required",
      reason,
    });
    await modules.results.selections.recordAudit(action);
    await modules.audit.operations.append({
      id: "non-results-legacy-audit",
      organizationId,
      competitionId,
      actorId,
      action: "scheduling.note",
      reason,
      occurredAt: action.occurredAt,
      requestId: null,
      object: { type: "encounter", id: encounterId, label: null, href: null },
    });
    const response = await app.request(
      `/api/v1/organizations/${organizationId}/audit?competitionId=${competitionId}`,
      {
        headers: serviceHeaders(actorId),
      },
    );
    expect(response.status).toBe(200);
    const page = await parseResponse(listOrganizationAuditResponseSchema, response);
    expect(
      page.entries.find((entry) => entry.action === "results.legacy_review_required")?.reason,
    ).toBe("Score corrected. Contact [REDACTED] or [REDACTED].");
    expect(page.entries.find((entry) => entry.action === "scheduling.note")?.reason).toBe(reason);
    expect(await modules.results.selections.listActions(encounterId)).toEqual([action]);
  });

  it("paginates only the organizer's history, rejects outsiders and exposes no mutation", async () => {
    const { app } = buildAppWithModules(stubFetch);
    async function create(actor: string, name: string) {
      const response = await app.request("/api/v1/organizations", {
        method: "POST",
        headers: serviceHeaders(actor),
        body: JSON.stringify({ name, timeZone: "UTC" }),
      });
      return parseResponse(createOrganizationResponseSchema, response);
    }
    const first = await create("organizer-a", "Audit first");
    const second = await create("organizer-b", "Audit second");
    const path = `/api/v1/organizations/${first.organizationId}/audit`;
    const read = await app.request(path, { headers: serviceHeaders("organizer-a") });
    expect(read.status).toBe(200);
    const page = await parseResponse(listOrganizationAuditResponseSchema, read);
    expect(page.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          organizationId: first.organizationId,
          actorId: "organizer-a",
          action: "organizations.created",
        }),
      ]),
    );
    expect(page.entries.every((entry) => entry.organizationId === first.organizationId)).toBe(true);
    expect((await app.request(path, { headers: serviceHeaders("player") })).status).toBe(403);
    expect(
      (
        await app.request(`/api/v1/organizations/${second.organizationId}/audit`, {
          headers: serviceHeaders("organizer-a"),
        })
      ).status,
    ).toBe(403);
    expect(
      (await app.request(`${path}?action=not-recorded`, { headers: serviceHeaders("organizer-a") }))
        .status,
    ).toBe(200);
    for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
      expect(
        (
          await app.request(path, {
            method,
            headers: serviceHeaders("organizer-a"),
            body: method === "DELETE" ? undefined : "{}",
          })
        ).status,
      ).toBe(404);
    }
  });

  it("retains distinct entry approval and rejection decisions once with the real deciding actor", async () => {
    const { app, modules } = buildAppWithModules(stubFetch);
    const actorId = asActorId("audit-entry-owner");
    const fixture = await createOrganizationCompetitionFixture(app, {
      method: "POST",
      headers: serviceHeaders(actorId),
      body: JSON.stringify({
        name: "Entry decisions",
        competition: onboardingCompetition,
        gameAccount: null,
      }),
    });
    const organizationId = asOrganizationId(fixture.organizationId);
    const competitionId = asCompetitionId(fixture.competition.competition.id);
    const expectedIds = [];
    for (const outcome of ["approved", "rejected"] as const) {
      const team = await modules.teams.createTeam.execute({
        actorId,
        organizationId,
        name: outcome,
      });
      if (team.isErr()) throw team.error;
      const registered = await modules.activityCommands.registerTeamEntry.execute({
        actorId,
        organizationId,
        competitionId,
        teamId: team.value.id,
      });
      if (registered.isErr()) throw registered.error;
      const input = { actorId, organizationId, competitionId, entryId: registered.value.id };
      const command =
        outcome === "approved"
          ? modules.activityCommands.approveTeamEntry
          : modules.activityCommands.rejectTeamEntry;
      const decided = await command.execute(input);
      if (decided.isErr()) throw decided.error;
      expect((await command.execute(input)).isErr()).toBe(true);
      expectedIds.push(`05:entry-decision:${registered.value.id}`);
    }
    const path = `/api/v1/organizations/${organizationId}/audit?competitionId=${competitionId}&actorId=${actorId}`;
    const page = await parseResponse(
      listOrganizationAuditResponseSchema,
      await app.request(path, { headers: serviceHeaders(actorId) }),
    );
    const decisions = page.entries.filter((entry) =>
      ["competitions.entry_approved", "competitions.entry_rejected"].includes(entry.action),
    );
    expect(decisions.map((entry) => entry.id).sort()).toEqual(expectedIds.sort());
    expect(decisions.map((entry) => entry.action).sort()).toEqual([
      "competitions.entry_approved",
      "competitions.entry_rejected",
    ]);
    expect(
      decisions.every(
        (entry) =>
          entry.organizationId === organizationId &&
          entry.competitionId === competitionId &&
          entry.actorId === actorId,
      ),
    ).toBe(true);
    for (const action of ["competitions.entry_approved", "competitions.entry_rejected"]) {
      const filtered = await parseResponse(
        listOrganizationAuditResponseSchema,
        await app.request(`${path}&action=${action}`, { headers: serviceHeaders(actorId) }),
      );
      expect(filtered.entries).toEqual(decisions.filter((entry) => entry.action === action));
    }
  });

  it("rejects invalid ranges and cursors", async () => {
    const { app } = buildAppWithModules(stubFetch);
    const response = await app.request("/api/v1/organizations", {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ name: "Audit validation", timeZone: "UTC" }),
    });
    const { organizationId } = await parseResponse(createOrganizationResponseSchema, response);
    const path = `/api/v1/organizations/${organizationId}/audit`;
    expect(
      (await app.request(`${path}?cursor=invalid`, { headers: serviceHeaders() })).status,
    ).toBe(400);
    expect(
      (
        await app.request(`${path}?from=2026-11-11T00:00:00Z&to=2026-11-10T00:00:00Z`, {
          headers: serviceHeaders(),
        })
      ).status,
    ).toBe(400);
  });

  it("binds cursors to their tenant and filters and returns subsequent pages", async () => {
    const { app, modules } = buildAppWithModules(stubFetch);
    const response = await app.request("/api/v1/organizations", {
      method: "POST",
      headers: serviceHeaders(),
      body: JSON.stringify({ name: "Cursor tenant", timeZone: "UTC" }),
    });
    const { organizationId } = await parseResponse(createOrganizationResponseSchema, response);
    for (const name of ["First team", "Second team"])
      await modules.teams.createTeam.execute({
        actorId: asActorId("actor-test-1"),
        organizationId: asOrganizationId(organizationId),
        name,
      });
    const path = `/api/v1/organizations/${organizationId}/audit`;
    const first = await parseResponse(
      listOrganizationAuditResponseSchema,
      await app.request(`${path}?limit=1`, { headers: serviceHeaders() }),
    );
    expect(first.entries).toHaveLength(1);
    expect(first.nextCursor).toBeTruthy();
    const cursor = encodeURIComponent(first.nextCursor ?? "");
    const second = await parseResponse(
      listOrganizationAuditResponseSchema,
      await app.request(`${path}?limit=1&cursor=${cursor}`, { headers: serviceHeaders() }),
    );
    expect(second.entries).toHaveLength(1);
    expect(second.entries[0]?.id).not.toBe(first.entries[0]?.id);
    expect(
      (
        await app.request(`${path}?cursor=${cursor}&actorId=different`, {
          headers: serviceHeaders(),
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await app.request(`/api/v1/organizations/another-org/audit?cursor=${cursor}`, {
          headers: serviceHeaders(),
        })
      ).status,
    ).toBe(400);
  });

  it("uses EffectiveAccess for organizer, staff grants, captain, player, superuser and explicit deny", async () => {
    const { app, modules } = buildAppWithModules(stubFetch);
    const owner = asActorId("audit-role-owner");
    const created = await createOrganizationCompetitionFixture(app, {
      method: "POST",
      headers: serviceHeaders(owner),
      body: JSON.stringify({
        name: "Audit roles",
        competition: onboardingCompetition,
        gameAccount: null,
      }),
    });
    const organizationId = asOrganizationId(created.organizationId);
    const competitionId = asCompetitionId(created.competition.competition.id);
    for (const role of ["staff", "captain", "player"] as const)
      await modules.competitions.membershipRepository.add({
        organizationId,
        competitionId,
        actorId: asActorId(`audit-role-${role}`),
        role,
        createdAt: new Date("2026-11-10T00:00:00Z"),
      });
    await modules.organizations.repositories.memberships.add({
      organizationId,
      actorId: asActorId("audit-role-staff"),
      role: "staff",
      createdAt: new Date("2026-11-10T00:00:00Z"),
    });
    const path = `/api/v1/organizations/${organizationId}/audit`;
    for (const actor of ["audit-role-staff", "audit-role-captain", "audit-role-player"])
      expect((await app.request(path, { headers: serviceHeaders(actor) })).status).toBe(403);
    const grant = await modules.authorization.upsertGrant.execute({
      actorId: owner,
      targetActorId: asActorId("audit-role-staff"),
      organizationId,
      permission: ORGANIZATION_PERMISSION.auditTrailRead,
      effect: "allow",
      scopeType: "competition",
      scopeId: competitionId,
      scope: { organizationId, competitionId },
      reason: "Review competition decisions",
    });
    if (grant.isErr()) throw grant.error;
    expect(
      (
        await app.request(`${path}?competitionId=${competitionId}`, {
          headers: serviceHeaders("audit-role-staff"),
        })
      ).status,
    ).toBe(200);
    expect((await app.request(path, { headers: serviceHeaders("audit-role-staff") })).status).toBe(
      403,
    );
    expect(
      (await app.request(`${path}?competitionId=foreign-comp`, { headers: serviceHeaders(owner) }))
        .status,
    ).toBe(404);
    await modules.authorization.bootstrapInitialSuperuser(asActorId("audit-role-superuser"));
    expect(
      (await app.request(path, { headers: serviceHeaders("audit-role-superuser") })).status,
    ).toBe(200);
    const denied = await modules.authorization.upsertGrant.execute({
      actorId: owner,
      targetActorId: owner,
      organizationId,
      permission: ORGANIZATION_PERMISSION.auditTrailRead,
      effect: "deny",
      scopeType: "organization",
      scopeId: organizationId,
      scope: { organizationId },
      reason: "Restricted audit access",
    });
    expect(denied.isOk()).toBe(true);
    expect((await app.request(path, { headers: serviceHeaders(owner) })).status).toBe(403);
  });
});
