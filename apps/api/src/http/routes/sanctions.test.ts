import { describe, expect, it } from "vite-plus/test";
import { asActorId, asCompetitionId, asOrganizationId, asTeamId } from "@futrob/shared-kernel";
import {
  acceptEntryInvitationResponseSchema,
  competitionSanctionSchema,
  listActivitiesResponseSchema,
  listCompetitionSanctionsResponseSchema,
  sentEntryInvitationSchema,
} from "@futrob/api-contracts";
import {
  buildApp,
  buildAppWithModules,
  onboardingCompetition,
  serviceHeaders,
  stubFetch,
} from "@/http/http-app.harness.ts";
import { createOrganizationCompetitionFixture } from "@/http/organization-competition.fixture.ts";
import { parseResponse } from "@/http/parse-response.ts";

type App = ReturnType<typeof buildApp>;

function post(app: App, path: string, actorId: string, body?: unknown) {
  return app.request(path, {
    method: "POST",
    headers: serviceHeaders(actorId),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function captainOf(
  app: App,
  input: { organizer: string; base: string; captain: string; gamertag: string; team: string },
): Promise<string> {
  const account = await post(app, "/api/v1/players/me/game-accounts", input.captain, {
    identifier: input.gamertag,
    platform: "playstation",
    gameEdition: "FC 26",
  });
  expect(account.status).toBe(201);
  const invitation = await parseResponse(
    sentEntryInvitationSchema,
    await post(app, `${input.base}/entry-invitations`, input.organizer, {
      inviteeActorId: input.captain,
      inviteeLabel: input.gamertag,
    }),
  );
  const accepted = await post(
    app,
    `/api/v1/entry-invitations/${invitation.id}/accept`,
    input.captain,
    { teamName: input.team, creationKey: `sanction-${input.captain}-0001` },
  );
  expect(accepted.status).toBe(201);
  return (await parseResponse(acceptEntryInvitationResponseSchema, accepted)).application.teamId;
}

/** A competition in registration with two approved Teams, each with its captain. */
async function sanctionableCompetition(app: App, organizer: string) {
  const created = await createOrganizationCompetitionFixture(app, {
    method: "POST",
    headers: serviceHeaders(organizer),
    body: JSON.stringify({
      name: `Org ${organizer}`,
      competition: { ...onboardingCompetition, name: "Liga Sanciones", teams: { min: 2, max: 8 } },
      gameAccount: null,
    }),
  });
  const organizationId = created.organizationId;
  const competitionId = created.competition.competition.id;
  const base = `/api/v1/organizations/${organizationId}/competitions/${competitionId}`;
  const condor = `${organizer}-condor`;
  const puma = `${organizer}-puma`;
  const condorTeamId = await captainOf(app, {
    organizer,
    base,
    captain: condor,
    gamertag: "Condor10",
    team: "Cóndor FC",
  });
  await captainOf(app, { organizer, base, captain: puma, gamertag: "Puma7", team: "Puma FC" });
  const opened = await post(app, `${base}/registration/open`, organizer);
  expect(opened.status, await opened.clone().text()).toBe(200);
  return { base, organizationId, competitionId, condor, puma, condorTeamId };
}

describe("apps/api http competition sanctions", () => {
  it.each(["vice_captain", "player"] as const)(
    "lets a roster %s read the affected Team but refuses impose and revoke",
    async (role) => {
      const { app, modules } = buildAppWithModules(stubFetch);
      const organizer = `actor-sanction-${role}-organizer`;
      const actorId = asActorId(`actor-sanction-${role}`);
      const { base, organizationId, competitionId, condorTeamId } = await sanctionableCompetition(
        app,
        organizer,
      );
      const createdAt = new Date("2026-11-10T12:00:00Z");
      const profile = await modules.teams.repositories.profiles.saveIfAbsent({
        id: `profile-sanction-${role}`,
        actorId,
        createdAt,
      });
      await modules.teams.repositories.rosters.add({
        id: `roster-sanction-${role}`,
        organizationId: asOrganizationId(organizationId),
        competitionId: asCompetitionId(competitionId),
        teamId: asTeamId(condorTeamId),
        playerProfileId: profile.id,
        gameAccountId: null,
        role,
        createdAt,
      });
      const body = {
        target: { type: "team", teamId: condorTeamId },
        type: "warning",
        reason: "Conducta antideportiva",
      };
      const sanction = await parseResponse(
        competitionSanctionSchema,
        await post(app, `${base}/sanctions`, organizer, body),
      );
      const view = await app.request(`${base}/teams/${condorTeamId}/sanctions`, {
        headers: serviceHeaders(actorId),
      });
      expect(view.status).toBe(200);
      expect(await parseResponse(listCompetitionSanctionsResponseSchema, view)).toMatchObject({
        sanctions: [{ id: sanction.id }],
      });
      expect((await post(app, `${base}/sanctions`, actorId, body)).status).toBe(403);
      expect(
        (
          await post(app, `${base}/sanctions/${sanction.id}/revoke`, actorId, {
            reason: "Intento sin permiso",
          })
        ).status,
      ).toBe(403);
    },
  );

  it.each(["organization", "competition"] as const)(
    "allows %s staff to impose and revoke, then honors a granular deny",
    async (staffScope) => {
      const { app, modules } = buildAppWithModules(stubFetch);
      const organizer = `actor-sanction-${staffScope}-organizer`;
      const staff = asActorId(`actor-sanction-${staffScope}-staff`);
      const { base, organizationId, competitionId, condorTeamId } = await sanctionableCompetition(
        app,
        organizer,
      );
      const membership = {
        organizationId: asOrganizationId(organizationId),
        actorId: staff,
        role: "staff" as const,
        createdAt: new Date("2026-11-10T12:00:00Z"),
      };
      if (staffScope === "organization") {
        await modules.organizations.repositories.memberships.add(membership);
      } else {
        await modules.organizations.repositories.memberships.add({ ...membership, role: "member" });
        await modules.competitions.membershipRepository.add({
          ...membership,
          competitionId: asCompetitionId(competitionId),
        });
      }
      const body = {
        target: { type: "team", teamId: condorTeamId },
        type: "warning",
        reason: "Conducta antideportiva",
      };
      const imposed = await post(app, `${base}/sanctions`, staff, body);
      expect(imposed.status).toBe(201);
      const sanction = await parseResponse(competitionSanctionSchema, imposed);
      expect(
        (await app.request(`${base}/sanctions`, { headers: serviceHeaders(staff) })).status,
      ).toBe(200);
      expect(
        (
          await post(app, `${base}/sanctions/${sanction.id}/revoke`, staff, {
            reason: "Apelación aceptada",
          })
        ).status,
      ).toBe(200);
      const active = await parseResponse(
        competitionSanctionSchema,
        await post(app, `${base}/sanctions`, staff, body),
      );
      const denied = await app.request("/api/v1/authorization/grants", {
        method: "PUT",
        headers: serviceHeaders(organizer),
        body: JSON.stringify({
          targetActorId: staff,
          organizationId,
          competitionId,
          permission: "competitions.sanctions.manage",
          effect: "deny",
          scopeType: "competition",
          scopeId: competitionId,
          reason: "Read-only disciplinary access",
        }),
      });
      expect(denied.status, await denied.clone().text()).toBe(200);
      const access = await app.request(
        `/api/v1/authorization/effective-access?organizationId=${organizationId}&competitionId=${competitionId}&permissions=competitions.sanctions.manage`,
        { headers: serviceHeaders(staff) },
      );
      expect(await access.json()).toMatchObject({
        permissions: [{ permission: "competitions.sanctions.manage", allowed: false }],
      });
      expect((await post(app, `${base}/sanctions`, staff, body)).status).toBe(403);
      expect(
        (
          await post(app, `${base}/sanctions/${active.id}/revoke`, staff, {
            reason: "Intento denegado",
          })
        ).status,
      ).toBe(403);
      const list = await app.request(`${base}/sanctions`, { headers: serviceHeaders(staff) });
      expect(await parseResponse(listCompetitionSanctionsResponseSchema, list)).toMatchObject({
        sanctions: expect.arrayContaining([
          expect.objectContaining({ id: active.id, revocation: null }),
        ]),
      });
    },
  );

  it("refuses another organization's organizer and mismatched tenant paths without changing sanctions", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-sanction-tenant-a";
    const other = "actor-sanction-tenant-b";
    const own = await sanctionableCompetition(app, organizer);
    const foreign = await sanctionableCompetition(app, other);
    const body = {
      target: { type: "team", teamId: own.condorTeamId },
      type: "warning",
      reason: "Conducta antideportiva",
    };
    const sanction = await parseResponse(
      competitionSanctionSchema,
      await post(app, `${own.base}/sanctions`, organizer, body),
    );
    for (const base of [
      own.base,
      `/api/v1/organizations/${foreign.organizationId}/competitions/${own.competitionId}`,
    ]) {
      expect(
        (await app.request(`${base}/sanctions`, { headers: serviceHeaders(other) })).status,
      ).toBe(403);
      expect((await post(app, `${base}/sanctions`, other, body)).status).toBe(403);
      expect(
        (
          await post(app, `${base}/sanctions/${sanction.id}/revoke`, other, {
            reason: "Intento desde otra organización",
          })
        ).status,
      ).toBe(403);
    }
    const listed = await app.request(`${own.base}/sanctions`, {
      headers: serviceHeaders(organizer),
    });
    expect(await parseResponse(listCompetitionSanctionsResponseSchema, listed)).toMatchObject({
      sanctions: [{ id: sanction.id, revocation: null }],
    });
  });

  it("imposes and revokes a deduction that the table and the affected Team see, never deleting it", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-sanction-organizer";
    const { base, condor, puma, condorTeamId } = await sanctionableCompetition(app, organizer);

    const imposed = await post(app, `${base}/sanctions`, organizer, {
      target: { type: "team", teamId: condorTeamId },
      type: "points_deduction",
      pointsDeducted: 3,
      reason: "Alineación indebida en la fecha 2",
    });
    expect(imposed.status, await imposed.clone().text()).toBe(201);
    const sanction = await parseResponse(competitionSanctionSchema, imposed);
    expect(sanction).toMatchObject({
      teamId: condorTeamId,
      teamName: "Cóndor FC",
      type: "points_deduction",
      pointsDeducted: 3,
      reason: "Alineación indebida en la fecha 2",
      imposedByActorId: organizer,
      revocation: null,
    });
    expect(sanction.requestId).not.toBe("");

    const standings = await app.request(`${base}/standings`, {
      headers: serviceHeaders(organizer),
    });
    expect(await standings.json()).toMatchObject({
      standings: {
        rows: [
          expect.objectContaining({
            teamId: condorTeamId,
            played: 0,
            points: -3,
            pointsDeducted: 3,
          }),
        ],
      },
    });

    const teamView = await app.request(`${base}/teams/${condorTeamId}/sanctions`, {
      headers: serviceHeaders(condor),
    });
    expect(teamView.status).toBe(200);
    expect(await parseResponse(listCompetitionSanctionsResponseSchema, teamView)).toMatchObject({
      sanctions: [{ id: sanction.id }],
    });
    const feed = await app.request("/api/v1/players/me/activities", {
      headers: serviceHeaders(condor),
    });
    expect(await parseResponse(listActivitiesResponseSchema, feed)).toMatchObject({
      activities: expect.arrayContaining([
        expect.objectContaining({
          kind: "organizer_decision",
          subject: expect.objectContaining({ outcome: "sanction_imposed", teamName: "Cóndor FC" }),
        }),
      ]),
    });
    const otherTeamView = await app.request(`${base}/teams/${condorTeamId}/sanctions`, {
      headers: serviceHeaders(puma),
    });
    expect(otherTeamView.status).toBe(403);

    const revoked = await post(app, `${base}/sanctions/${sanction.id}/revoke`, organizer, {
      reason: "Apelación aceptada",
    });
    expect(revoked.status).toBe(200);
    expect(await parseResponse(competitionSanctionSchema, revoked)).toMatchObject({
      id: sanction.id,
      reason: "Alineación indebida en la fecha 2",
      revocation: { actorId: organizer, reason: "Apelación aceptada" },
    });
    const again = await post(app, `${base}/sanctions/${sanction.id}/revoke`, organizer, {
      reason: "Otra vez",
    });
    expect(again.status).toBe(409);
    expect(await again.json()).toMatchObject({ code: "competitions.sanction_already_revoked" });

    const restored = await app.request(`${base}/standings`, { headers: serviceHeaders(organizer) });
    expect(JSON.stringify(await restored.json())).not.toContain('"points":-3');
    const list = await app.request(`${base}/sanctions`, { headers: serviceHeaders(organizer) });
    expect(await parseResponse(listCompetitionSanctionsResponseSchema, list)).toMatchObject({
      sanctions: [{ id: sanction.id, revocation: { reason: "Apelación aceptada" } }],
    });
    const deleted = await app.request(`${base}/sanctions/${sanction.id}`, {
      method: "DELETE",
      headers: serviceHeaders(organizer),
    });
    expect(deleted.status).toBe(404);
  });

  it("answers 403 to captains and strangers who try to list, impose or revoke", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-sanction-organizer-2";
    const { base, condor, condorTeamId } = await sanctionableCompetition(app, organizer);
    const sanction = await parseResponse(
      competitionSanctionSchema,
      await post(app, `${base}/sanctions`, organizer, {
        target: { type: "team", teamId: condorTeamId },
        type: "warning",
        reason: "Conducta antideportiva",
      }),
    );

    for (const actor of [condor, "actor-sanction-stranger"]) {
      expect(
        (await app.request(`${base}/sanctions`, { headers: serviceHeaders(actor) })).status,
      ).toBe(403);
      expect(
        (
          await post(app, `${base}/sanctions`, actor, {
            target: { type: "team", teamId: condorTeamId },
            type: "warning",
            reason: "Intento sin permiso",
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await post(app, `${base}/sanctions/${sanction.id}/revoke`, actor, {
            reason: "Intento sin permiso",
          })
        ).status,
      ).toBe(403);
    }
    expect(
      (
        await app.request(`${base}/teams/${condorTeamId}/sanctions`, {
          headers: serviceHeaders("actor-sanction-stranger"),
        })
      ).status,
    ).toBe(403);
  });

  it("rejects terms that do not fit the type and Teams outside the competition", async () => {
    const app = buildApp(stubFetch);
    const organizer = "actor-sanction-organizer-3";
    const { base, condorTeamId } = await sanctionableCompetition(app, organizer);

    const wrongDetail = await post(app, `${base}/sanctions`, organizer, {
      target: { type: "team", teamId: condorTeamId },
      type: "warning",
      pointsDeducted: 2,
      reason: "Advertencia con puntos",
    });
    expect(wrongDetail.status).toBe(400);
    expect(await wrongDetail.json()).toMatchObject({ code: "competitions.invalid_sanction" });

    const unknownTeam = await post(app, `${base}/sanctions`, organizer, {
      target: { type: "team", teamId: "team-elsewhere" },
      type: "warning",
      reason: "Equipo ajeno",
    });
    expect(unknownTeam.status).toBe(404);
    expect(await unknownTeam.json()).toMatchObject({
      code: "competitions.sanction_target_not_found",
    });
  });
});
