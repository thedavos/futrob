#!/usr/bin/env -S ./apps/api/node_modules/.bin/tsx --tsconfig apps/api/tsconfig.json
import "../../../../apps/api/src/http/openapi/zod-openapi-setup.ts";
import assert from "node:assert/strict";
import { readFileSync, appendFileSync } from "node:fs";
import pg from "pg";
import { spawnSync } from "node:child_process";
import { createFutrobClient } from "@futrob/sdk";

const modes = [
  "inspect",
  "registrations",
  "selections",
  "invitations",
  "reschedules",
  "expiry",
  "access",
  "readback",
  "applications",
  "preferences",
];
assert(modes.includes(process.argv[2]), `Choose a verification mode: ${modes.join(", ")}`);
const evidence = process.env.FEED_EVIDENCE_DIR;
assert(evidence, "Set FEED_EVIDENCE_DIR to a verify-futrob evidence directory");
const env = Object.fromEntries(
  readFileSync("apps/api/.env", "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1).replace(/^["']|["']$/g, "")];
    }),
);
const database = new URL(env.DATABASE_URL);
assert.equal(database.hostname, "127.0.0.1", "This driver requires the isolated local database");
assert.equal(database.port, "55432");
assert.equal(database.pathname, "/futrob_feed01");
const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
function log(action, result) {
  const value = JSON.stringify({ action, result }, null, 2);
  appendFileSync(`${evidence}/sdk-${process.argv[2]}.log`, `${value}\n`);
  console.log(value);
}
const client = (actorId) =>
  createFutrobClient({
    baseUrl: "http://localhost:8787/api/v1",
    getAccessToken: () => env.INTERNAL_JOB_SECRET,
    getExtraHeaders: () => ({ "X-Futrob-Actor-Id": actorId }),
  });
const actor = async (email) =>
  (
    await pool.query("SELECT actor_id FROM actor_contact_profiles WHERE email=$1", [
      `${email}@demo.futrob.test`,
    ])
  ).rows[0].actor_id;
const org = (await pool.query("SELECT id FROM organizations WHERE name='Liga Andina'")).rows[0].id;
const comp = (await pool.query("SELECT id FROM competitions WHERE name='Clausura 26'")).rows[0].id;
const operator = client(await actor("org-pro"));
const pending = { status: "open", requiresAction: true, limit: 50 };
const orgRows = async () =>
  (await operator.activities.listForOrganization(org, { limit: 50 })).activities;
try {
  if (process.argv[2] === "selections") {
    async function encounter(suffix) {
      return (
        await pool.query(
          "SELECT * FROM encounter_schedule_snapshots WHERE competition_id=$1 AND encounter_id LIKE $2",
          [comp, suffix],
        )
      ).rows[0];
    }
    async function representative(teamId) {
      return (
        await pool.query(
          "SELECT p.actor_id FROM competition_roster_memberships r JOIN player_profiles p ON p.id=r.player_profile_id WHERE r.competition_id=$1 AND r.team_id=$2 AND r.role='captain'",
          [comp, teamId],
        )
      ).rows[0].actor_id;
    }
    const target = await encounter("%:round:4:encounter:1");
    const proposerId = await representative(target.away_team_id);
    const responderId = await representative(target.home_team_id);
    const proposer = client(proposerId);
    const responder = client(responderId);
    const candidates = await proposer.results.listEncounterCandidates(target.encounter_id);
    const input = {
      actingTeamId: target.away_team_id,
      selections: candidates.candidates
        .slice(0, 2)
        .map((candidate, index) => ({
          officialSlot: index + 1,
          providerMatchRef: candidate.reference,
        })),
      expectedVersion: 0,
      commandKey: "feed01-propose",
    };
    const proposed = await proposer.results.proposeOfficialSelection(
      org,
      target.encounter_id,
      input,
    );
    log("propose selection", proposed);
    const before = (await responder.activities.listMine(pending)).activities.filter(
      (x) => x.resourceId === target.encounter_id,
    );
    assert.equal(before.length, 1);
    assert.equal(before[0].kind, "selection_confirmation");
    assert.equal(
      (await proposer.activities.listMine(pending)).activities.filter(
        (x) => x.resourceId === target.encounter_id,
      ).length,
      0,
    );
    const watch = (await orgRows()).find((x) => x.resourceId === target.encounter_id);
    assert.equal(watch.requiresAction, false);
    log("selection audience readback", { rival: before, watch });
    await proposer.results.proposeOfficialSelection(org, target.encounter_id, input);
    assert.deepEqual(
      (await responder.activities.listMine(pending)).activities
        .filter((x) => x.resourceId === target.encounter_id)
        .map((x) => x.id),
      before.map((x) => x.id),
    );
    const confirmInput = {
      actingTeamId: target.home_team_id,
      expectedVersion: proposed.selection.version,
      commandKey: "feed01-confirm",
    };
    log(
      "confirm selection",
      await responder.results.confirmOfficialSelection(
        org,
        target.encounter_id,
        proposed.proposal.id,
        confirmInput,
      ),
    );
    await responder.results.confirmOfficialSelection(
      org,
      target.encounter_id,
      proposed.proposal.id,
      confirmInput,
    );
    assert.equal(
      (await responder.activities.listMine(pending)).activities.filter(
        (x) => x.resourceId === target.encounter_id,
      ).length,
      0,
    );
    log(
      "confirmed selection readback",
      (await responder.activities.listMine({ limit: 50 })).activities.filter(
        (x) => x.resourceId === target.encounter_id,
      ),
    );
    const disputedTarget = await encounter("%:round:5:encounter:1");
    const rival = client(await representative(disputedTarget.away_team_id));
    const current = await rival.results.getTeamOfficialSelection(org, disputedTarget.encounter_id, {
      actingTeamId: disputedTarget.away_team_id,
    });
    const disputeInput = {
      actingTeamId: disputedTarget.away_team_id,
      expectedVersion: current.selection.version,
      commandKey: "feed01-dispute",
      reason: "FEED-01 verify official match choice",
    };
    const opened = await rival.results.openMatchDispute(
      org,
      disputedTarget.encounter_id,
      disputeInput,
    );
    log("open dispute", opened);
    await rival.results.openMatchDispute(org, disputedTarget.encounter_id, disputeInput);
    const disputes = (
      await operator.activities.listForOrganization(org, pending)
    ).activities.filter(
      (x) => x.resourceId === disputedTarget.encounter_id && x.kind === "match_dispute",
    );
    assert.equal(disputes.length, 1);
    log("dispute operator pending", disputes);
    const reviewed = await operator.results.reviewMatchDispute(org, disputedTarget.encounter_id, {
      expectedVersion: opened.selection.version,
      commandKey: "feed01-review",
      reason: "FEED-01 review evidence",
    });
    const resolution = {
      expectedVersion: reviewed.selection.version,
      commandKey: "feed01-resolve",
      reason: "FEED-01 return for a new agreement",
      decision: { type: "return_to_selection" },
    };
    log(
      "resolve dispute",
      await operator.results.resolveMatchDispute(org, disputedTarget.encounter_id, resolution),
    );
    await operator.results.resolveMatchDispute(org, disputedTarget.encounter_id, resolution);
    assert.equal(
      (await operator.activities.listForOrganization(org, pending)).activities.filter(
        (x) => x.id === disputes[0].id,
      ).length,
      0,
    );
    log(
      "resolved dispute readback",
      (await orgRows()).find((x) => x.id === disputes[0].id),
    );
  }
  if (process.argv[2] === "invitations") {
    const inviteeId = await actor("jugador-solo");
    const team = (
      await pool.query("SELECT id FROM teams WHERE organization_id=$1 AND name='Cóndores FC'", [
        org,
      ])
    ).rows[0].id;
    const invite = await operator.teams.rosterInvitations.create(org, comp, team, {
      inviteeIdentifier: (
        await pool.query(
          "SELECT g.identifier FROM player_game_accounts g JOIN player_profiles p ON p.id=g.player_profile_id WHERE p.actor_id=$1 LIMIT 1",
          [inviteeId],
        )
      ).rows[0].identifier,
    });
    log("create directed roster invitation", { invitationId: invite.invitationId });
    const invited = client(inviteeId);
    const before = (await invited.activities.listMine(pending)).activities.filter(
      (x) => x.resourceId === invite.invitationId,
    );
    assert.equal(before.length, 1);
    assert.equal(
      (await client(await actor("espectador")).activities.listMine(pending)).activities.filter(
        (x) => x.resourceId === invite.invitationId,
      ).length,
      0,
    );
    log("invitee pending", before);
    log(
      "decline directed invitation",
      await invited.teams.rosterInvitations.respond(invite.invitationId, { action: "decline" }),
    );
    assert.equal(
      (await invited.activities.listMine(pending)).activities.filter(
        (x) => x.resourceId === invite.invitationId,
      ).length,
      0,
    );
    log(
      "closed invitation readback",
      (await invited.activities.listMine({ limit: 50 })).activities.filter(
        (x) => x.resourceId === invite.invitationId,
      ),
    );
  }

  if (process.argv[2] === "reschedules" || process.argv[2] === "expiry") {
    const isExpiry = process.argv[2] === "expiry";
    let server;
    let clockValue = new Date();
    let baseUrl = "http://localhost:8787/api/v1";
    if (isExpiry) {
      const { createModules } = await import("../../../../apps/api/src/di/create-modules.ts");
      const { createApp } = await import("../../../../apps/api/src/app.ts");
      const { serve } = await import("@hono/node-server");
      const system = (
        await pool.query("SELECT id FROM actors WHERE id LIKE 'demo-system-%' LIMIT 1")
      ).rows[0].id;
      const modules = createModules({
        pool,
        fetcher: fetch,
        eaClubsBaseUrl: "https://proclubs.ea.com/api/fc",
        clock: { now: () => clockValue },
        schedulingSystemActorId: system,
      });
      const app = createApp({
        modules,
        internalJobSecret: env.INTERNAL_JOB_SECRET,
        checkDbHealth: async () => "ok",
        correlationLogger: { info: () => undefined, error: () => undefined },
      });
      server = serve({ fetch: app.fetch, port: 0, hostname: "127.0.0.1" });
      await new Promise((resolve) => server.once("listening", resolve));
      baseUrl = `http://127.0.0.1:${server.address().port}/api/v1`;
      log("expiry verification clock", {
        injectedClockPort: true,
        initial: clockValue.toISOString(),
        productionRoutes: true,
      });
    }
    try {
      const as = (actorId) =>
        createFutrobClient({
          baseUrl,
          getAccessToken: () => env.INTERNAL_JOB_SECRET,
          getExtraHeaders: () => ({ "X-Futrob-Actor-Id": actorId }),
        });
      const target = (
        await pool.query(
          "SELECT * FROM encounter_schedule_snapshots WHERE competition_id=$1 AND encounter_id LIKE $2",
          [comp, isExpiry ? "%:round:7:encounter:3" : "%:round:7:encounter:4"],
        )
      ).rows[0];
      const representative = async (team) =>
        (
          await pool.query(
            "SELECT p.actor_id FROM competition_roster_memberships r JOIN player_profiles p ON p.id=r.player_profile_id WHERE r.competition_id=$1 AND r.team_id=$2 AND r.role='captain'",
            [comp, team],
          )
        ).rows[0].actor_id;
      const home = as(await representative(target.home_team_id));
      const away = as(await representative(target.away_team_id));
      const ops = as(await actor("org-pro"));
      const wallTime = (offset) => {
        const at = new Date(new Date(target.scheduled_start_at).getTime() + (offset - 5) * 3600000);
        return {
          year: at.getUTCFullYear(),
          month: at.getUTCMonth() + 1,
          day: at.getUTCDate(),
          hour: at.getUTCHours(),
          minute: at.getUTCMinutes(),
          second: 0,
        };
      };
      const createInput = {
        requestingTeamId: target.home_team_id,
        scope: { type: "entire_encounter" },
        proposedWallTime: wallTime(2),
        timeZone: "America/Lima",
        reason: "FEED-01 verify schedule change",
        idempotencyKey: `feed01-${process.argv[2]}`,
      };
      let request = await home.encounters.createScheduleChangeRequest(
        target.encounter_id,
        createInput,
      );
      log("create reschedule", request);
      const same = await home.encounters.createScheduleChangeRequest(
        target.encounter_id,
        createInput,
      );
      assert.equal(same.id, request.id);
      const rows = async (viewer) =>
        (await viewer.activities.listMine({ limit: 50 })).activities.filter(
          (x) => x.resourceId === target.encounter_id,
        );
      const before = await rows(away);
      assert.equal(before.filter((x) => x.status === "open" && x.requiresAction).length, 1);
      assert.equal(
        (await rows(home)).filter((x) => x.status === "open" && x.requiresAction).length,
        0,
      );
      log("reschedule audience readback", {
        rival: before,
        organization: (
          await ops.activities.listForOrganization(org, { limit: 50 })
        ).activities.filter((x) => x.resourceId === target.encounter_id),
      });
      if (!isExpiry) {
        const counterInput = {
          expectedVersion: request.version,
          commandKey: "feed01-counter",
          teamId: target.away_team_id,
          proposedWallTime: wallTime(3),
          timeZone: "America/Lima",
          reason: "FEED-01 rival counterproposal",
        };
        const originalTarget = {
          encounterId: target.encounter_id,
          requestId: request.id,
          proposalId: request.currentProposalId,
        };
        request = (
          await away.encounters.counterScheduleChangeProposal(originalTarget, counterInput)
        ).request;
        log("counter reschedule", request);
        assert.equal(
          (await away.encounters.counterScheduleChangeProposal(originalTarget, counterInput))
            .replayed,
          true,
        );
        assert.equal((await rows(away)).filter((x) => x.status === "open").length, 0);
        assert.equal(
          (await rows(home)).filter((x) => x.status === "open" && x.requiresAction).length,
          1,
        );
        const acceptInput = {
          expectedVersion: request.version,
          commandKey: "feed01-accept",
          responder: { authority: "rival_team", teamId: target.home_team_id },
        };
        const counterTarget = {
          encounterId: target.encounter_id,
          requestId: request.id,
          proposalId: request.currentProposalId,
        };
        const accepted = await home.encounters.acceptScheduleChangeProposal(
          counterTarget,
          acceptInput,
        );
        log("accept reschedule", accepted);
        assert.equal(accepted.request.status, "accepted");
        assert.equal(
          (await home.encounters.acceptScheduleChangeProposal(counterTarget, acceptInput)).replayed,
          true,
        );
        assert.equal((await rows(home)).filter((x) => x.status === "open").length, 0);
        assert.equal((await rows(away)).filter((x) => x.status === "open").length, 0);
        log(
          "accepted reschedule readback",
          await home.encounters.getScheduleChangeRequest(target.encounter_id, request.id),
        );
      } else {
        clockValue = new Date(new Date(request.proposals[0].responseDeadline).getTime() + 1000);
        const expiryPath = "/internal/scheduling/reschedule-expiry/run";
        const response = await fetch(`${baseUrl}${expiryPath}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${env.INTERNAL_JOB_SECRET}` },
        });
        log("run expiry after response deadline", {
          clock: clockValue.toISOString(),
          status: response.status,
          body: await response.json(),
        });
        assert.equal(response.status, 200);
        request = await ops.encounters.getScheduleChangeRequest(target.encounter_id, request.id);
        assert.equal(request.status, "escalated");
        const escalated = (
          await ops.activities.listForOrganization(org, pending)
        ).activities.filter((x) => x.resourceId === target.encounter_id);
        assert.equal(escalated.length, 1);
        log("expiry audience readback", {
          organizationPending: escalated,
          rival: await rows(away),
        });
        const resolution = {
          proposalId: request.currentProposalId,
          expectedVersion: request.version,
          commandKey: "feed01-reschedule-resolve",
          resolution: { outcome: "schedule_kept", reason: "FEED-01 preserve original schedule" },
        };
        log(
          "resolve expired reschedule",
          await ops.encounters.resolveScheduleChangeRequest(
            target.encounter_id,
            request.id,
            resolution,
          ),
        );
        assert.equal(
          (
            await ops.encounters.resolveScheduleChangeRequest(
              target.encounter_id,
              request.id,
              resolution,
            )
          ).replayed,
          true,
        );
        assert.equal(
          (await ops.activities.listForOrganization(org, pending)).activities.filter(
            (x) => x.resourceId === target.encounter_id,
          ).length,
          0,
        );
        const decisions = (await rows(home)).filter((x) => x.kind === "organizer_decision");
        assert.equal(decisions.length, 1);
        assert.equal(decisions[0].subject.outcome, "schedule_kept");
        log("resolved expiry readback", {
          organization: (
            await ops.activities.listForOrganization(org, { limit: 50 })
          ).activities.filter((x) => x.resourceId === target.encounter_id),
          home: await rows(home),
          away: await rows(away),
        });
      }
    } finally {
      if (server)
        await new Promise((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
    }
  }

  if (process.argv[2] === "access") {
    for (const account of [
      "superadmin",
      "org-pro",
      "staff",
      "capitan-local",
      "subcapitan",
      "jugador01",
      "espectador",
      "org-free",
    ]) {
      const viewer = client(await actor(account));
      const access = await viewer.authorization.getEffectiveAccess({ organizationId: org }, [
        "encounters.results.approve",
      ]);
      let organizationFeed;
      try {
        const feed = await viewer.activities.listForOrganization(org, { limit: 1 });
        organizationFeed = { status: 200, count: feed.activities.length };
      } catch (error) {
        organizationFeed = { status: error.status, code: error.code };
      }
      assert.equal(
        organizationFeed.status,
        ["superadmin", "org-pro"].includes(account) ? 200 : 403,
      );
      const mine = await viewer.activities.listMine({ limit: 50 });
      assert(mine.activities.every((x) => x.audience !== "organization"));
      log("effective access and organization isolation", {
        account,
        access,
        organizationFeed,
        personalAudiences: [...new Set(mine.activities.map((x) => x.audience))],
      });
    }
    const recent = await operator.activities.listForOrganization(org, { limit: 10 });
    assert.equal(recent.activities.length, 10);
    const first = await operator.activities.listForOrganization(org, { limit: 25 });
    const next = await operator.activities.listForOrganization(org, {
      limit: 25,
      cursor: first.nextCursor,
    });
    assert.equal(first.activities.length, 25);
    assert.equal(
      new Set([...first.activities, ...next.activities].map((x) => x.id)).size,
      first.activities.length + next.activities.length,
    );
    log("organization paging", {
      home: recent.activities.map((x) => x.id),
      first: first.activities.map((x) => x.id),
      second: next.activities.map((x) => x.id),
      nextCursor: next.nextCursor,
    });
  }

  if (process.argv[2] === "applications") {
    const registration = (
      await pool.query("SELECT id FROM competitions WHERE name='Apertura Inscripciones'")
    ).rows[0].id;
    for (const [account, decision] of [
      ["premium", "approve"],
      ["jugador-solo", "reject"],
    ]) {
      const id = await actor(account);
      const args = [
        "run",
        "cli",
        "--",
        "comp-apply",
        registration,
        `FEED-01 ${decision}`,
        "--key",
        `feed01-application-${decision}`,
        "--actor",
        id,
        "--json",
      ];
      const applied = spawnSync("npm", args, {
        env: {
          ...process.env,
          TSX_TSCONFIG_PATH: undefined,
          FUTROB_INTERNAL_JOB_SECRET: env.INTERNAL_JOB_SECRET,
        },
        encoding: "utf8",
      });
      log("CLI self-service application", {
        command: `npm ${args.join(" ")}`,
        stdout: applied.stdout,
        stderr: applied.stderr,
        exitCode: applied.status,
      });
      assert.equal(applied.status, 0);
      const applicant = client(id);
      const pendingApplication = (await applicant.competitions.getMyApplication(registration))
        .application;
      assert.equal(pendingApplication.status, "pending");
      const entry = pendingApplication.entryId;
      const row = (await orgRows()).find(
        (x) => x.kind === "competition_entry" && x.subject.teamName === pendingApplication.teamName,
      );
      assert.equal(row.status, "open");
      assert.equal(row.requiresAction, true);
      const result =
        decision === "approve"
          ? await operator.competitions.approveTeamEntry(org, registration, entry)
          : await operator.competitions.rejectTeamEntry(org, registration, entry);
      assert.equal(result.status, decision === "approve" ? "approved" : "rejected");
      const current = (await applicant.competitions.getMyApplication(registration)).application;
      assert.equal(current.status, result.status);
      const mine = (await applicant.activities.listMine()).activities.filter(
        (x) => x.competitionId === registration,
      );
      assert.equal(mine.length, 1);
      assert.equal(
        mine[0].subject.outcome,
        decision === "approve" ? "entry_approved" : "entry_rejected",
      );
      assert.equal((await orgRows()).find((x) => x.id === row.id).status, "closed");
      log("registration decision readback", {
        decision,
        current,
        personal: mine,
        organization: (await orgRows()).filter(
          (x) => x.subject.teamName === pendingApplication.teamName,
        ),
      });
    }
  }
  if (process.argv[2] === "readback") {
    const golden = (
      await pool.query(
        "SELECT id,organization_id FROM competitions WHERE name LIKE 'Liga CLI-%' ORDER BY created_at DESC LIMIT 1",
      )
    ).rows[0];
    const admin = client(await actor("superadmin"));
    const publication = (
      await admin.activities.listForOrganization(golden.organization_id)
    ).activities.filter((x) => x.kind === "competition_published");
    assert.equal(publication.length, 1);
    assert.equal(publication[0].status, "closed");
    assert.equal(publication[0].requiresAction, false);
    try {
      await admin.competitions.publish(golden.organization_id, golden.id);
      assert.fail("published twice");
    } catch (error) {
      assert.equal(error.status, 409);
    }
    assert.deepEqual(
      (await admin.activities.listForOrganization(golden.organization_id)).activities.filter(
        (x) => x.kind === "competition_published",
      ),
      publication,
    );
    log("publication and retry readback", publication);
    const organization = await orgRows();
    for (const suffix of [
      ":round:4:encounter:1",
      ":round:5:encounter:1",
      ":round:7:encounter:4",
      ":round:7:encounter:3",
    ]) {
      const rows = organization.filter((x) => x.resourceId.endsWith(suffix));
      assert(rows.length > 0);
      assert(rows.every((x) => x.status === "closed"));
      assert.equal(new Set(rows.map((x) => x.id)).size, rows.length);
      log("final lifecycle readback", { suffix, rows });
    }
    const invited = client(await actor("jugador-solo"));
    const invitations = (await invited.activities.listMine({ limit: 50 })).activities.filter(
      (x) => x.kind === "roster_invitation",
    );
    assert(invitations.length > 0);
    assert(invitations.every((x) => x.status === "closed"));
    log("final directed invitation readback", invitations);

    const registration = (
      await pool.query("SELECT id FROM competitions WHERE name='Apertura Inscripciones'")
    ).rows[0].id;
    const rejected = (
      await pool.query(
        "SELECT id,team_id FROM competition_entries WHERE competition_id=$1 AND status='rejected' AND team_id IN (SELECT team_id FROM competition_roster_memberships WHERE competition_id=$1) LIMIT 1",
        [registration],
      )
    ).rows[0];
    const rejectedActor = (
      await pool.query(
        "SELECT p.actor_id FROM competition_roster_memberships r JOIN player_profiles p ON p.id=r.player_profile_id WHERE r.competition_id=$1 AND r.team_id=$2 AND r.role='captain'",
        [registration, rejected.team_id],
      )
    ).rows[0].actor_id;
    const applicant = client(rejectedActor);
    assert.equal(
      (await applicant.competitions.getMyApplication(registration)).application.status,
      "rejected",
    );
    const before = (await orgRows()).filter((x) => x.competitionId === registration);
    try {
      await operator.competitions.rejectTeamEntry(org, registration, rejected.id);
      assert.fail("decided twice");
    } catch (error) {
      assert.equal(error.status, 409);
    }
    assert.deepEqual(
      (await orgRows()).filter((x) => x.competitionId === registration),
      before,
    );
    log("rejected registration application and retry readback", {
      application: await applicant.competitions.getMyApplication(registration),
      activity: (await applicant.activities.listMine({ limit: 50 })).activities.filter(
        (x) => x.competitionId === registration,
      ),
    });
  }
  if (process.argv[2] === "preferences") {
    for (const account of ["org-pro", "capitan-visita"]) {
      const viewer = client(await actor(account));
      await viewer.identity.saveActorPreferences({ sidebarLayout: "pending-queue" });
      const readback = await viewer.identity.getActorPreferences();
      assert.equal(readback.sidebarLayout, "pending-queue");
      log("select Pending sidebar layout", { account, readback });
    }
  }
  if (process.argv[2] === "inspect") {
    const encounter = (
      await pool.query(
        "SELECT encounter_id, home_team_id, away_team_id FROM encounter_schedule_snapshots WHERE competition_id=$1 AND encounter_id LIKE $2",
        [comp, "%:round:4:encounter:1"],
      )
    ).rows[0];
    const me = client(await actor("capitan-local"));
    log("candidates", await me.results.listEncounterCandidates(encounter.encounter_id));
    log("existing personal pending", await me.activities.listMine(pending));
  }
  if (process.argv[2] === "registrations") {
    const registration = (
      await pool.query("SELECT id FROM competitions WHERE name='Apertura Inscripciones'")
    ).rows[0].id;
    const entries = (
      await pool.query(
        "SELECT id FROM competition_entries WHERE competition_id=$1 AND status='pending' ORDER BY id",
        [registration],
      )
    ).rows;
    log(
      "pending before decision",
      (await operator.activities.listForOrganization(org, pending)).activities.filter(
        (x) => x.kind === "competition_entry",
      ),
    );
    const approved = await operator.competitions.approveTeamEntry(org, registration, entries[0].id);
    log("approve registration", approved);
    assert.equal(approved.status, "approved");
    const rejected = await operator.competitions.rejectTeamEntry(org, registration, entries[1].id);
    log("reject registration", rejected);
    assert.equal(rejected.status, "rejected");
    log(
      "registration activity readback",
      (await orgRows()).filter((x) => x.competitionId === registration),
    );
  }
  log("verification complete", { mode: process.argv[2], verified: true });
} finally {
  await pool.end();
}
