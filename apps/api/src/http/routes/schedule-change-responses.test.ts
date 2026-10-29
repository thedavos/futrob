import { randomUUID } from "node:crypto";
import {
  apiErrorSchema,
  completeOrganizationOnboardingResponseSchema,
  encounterScheduleSnapshotSchema,
  fixturePlanSchema,
  listActivitiesResponseSchema,
  listScheduleChangeRequestsResponseSchema,
  scheduleChangeCommandResponseSchema,
  scheduleChangeRequestSchema,
  type ScheduleChangeRequestDto,
} from "@futrob/api-contracts";
import {
  asActorId,
  asEncounterId,
  asCompetitionId,
  asOrganizationId,
  asTeamId,
} from "@futrob/shared-kernel";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";
import { createApp } from "@/app.ts";
import { createModules } from "@/di/create-modules.ts";
import {
  INTERNAL_JOB_SECRET,
  onboardingCompetition,
  serviceHeaders,
  stubFetch,
} from "@/http/http-app.harness.ts";
import { parseResponse } from "@/http/parse-response.ts";
import {
  createIsolatedSchema,
  migrateIsolatedSchema,
  type IsolatedSchema,
} from "@/testing/isolated-schema.ts";
import { seedActors } from "@/testing/seed-actors.ts";

const databaseUrl = process.env.TEST_DATABASE_URL;
const TIMEOUT_MS = 180_000;

// America/Lima is UTC-5, so 18:00 local is 23:00Z.
const D0 = "2099-01-10T23:00:00.000Z";
const D1 = "2099-01-15T23:00:00.000Z";
const D2 = "2099-01-16T23:00:00.000Z";
const limaSix = (day: number) => ({ year: 2099, month: 1, day, hour: 18, minute: 0, second: 0 });

const requestOf = async (response: Response) =>
  scheduleChangeRequestSchema.parse(await response.json());
/** The request as stored; create responses leave the reader's capabilities empty. */
const stateOf = (request: ScheduleChangeRequestDto): ScheduleChangeRequestDto => ({
  ...request,
  allowedActions: [],
  respondAs: null,
  blockedActions: [],
});
const commandOf = async (response: Response) =>
  scheduleChangeCommandResponseSchema.parse(await response.json());
const failureOf = async (response: Response) => ({
  status: response.status,
  code: apiErrorSchema.parse(await response.json()).code,
});

describe.each([
  { backend: "in memory", postgres: false },
  { backend: "Postgres", postgres: true },
])("schedule-change responses over HTTP ($backend)", { timeout: TIMEOUT_MS }, ({ postgres }) => {
  const skip = postgres && !databaseUrl;
  let isolated: IsolatedSchema | undefined;

  beforeAll(async () => {
    if (!postgres || !databaseUrl) return;
    isolated = await createIsolatedSchema(databaseUrl, "reschedule_http");
    await migrateIsolatedSchema(isolated.pool);
  }, TIMEOUT_MS);

  afterAll(async () => {
    await isolated?.drop();
  }, TIMEOUT_MS);

  /** One organization, one Team vs Team Encounter at D0, and a session per actor. */
  async function seed(format: "league" | "knockout" = "league") {
    const tag = randomUUID().slice(0, 8);
    const actors = {
      organizer: `actor-organizer-${tag}`,
      homeCaptain: `actor-home-captain-${tag}`,
      awayCaptain: `actor-away-captain-${tag}`,
      awayPlayer: `actor-away-player-${tag}`,
      stranger: `actor-stranger-${tag}`,
    };
    if (isolated) await seedActors(isolated.pool, ...Object.values(actors));
    let now = new Date("2026-10-01T12:00:00.000Z");
    const modules = createModules({
      fetcher: stubFetch,
      eaClubsBaseUrl: "https://proclubs.ea.com/api/fc",
      pool: isolated?.pool,
      clock: { now: () => new Date(now.getTime()) },
    });
    const app = createApp({
      modules,
      checkDbHealth: () => Promise.resolve(isolated ? "ok" : "skipped"),
      internalJobSecret: INTERNAL_JOB_SECRET,
      correlationLogger: { info: () => undefined, error: () => undefined },
    });
    const send = (actorId: string, method: "GET" | "POST", path: string, body?: unknown) =>
      app.request(`/api/v1${path}`, {
        method,
        headers: serviceHeaders(actorId),
        body: body === undefined ? undefined : JSON.stringify(body),
      });

    const onboarded = await parseResponse(
      completeOrganizationOnboardingResponseSchema,
      await send(actors.organizer, "POST", "/identity/onboarding/organization", {
        name: `Reschedule ${tag}`,
        competition: { ...onboardingCompetition, format },
        gameAccount: null,
      }),
    );
    const organizationId = onboarded.organizationId;
    const competitionId = onboarded.competition.competition.id;
    const competitionPath = `/organizations/${organizationId}/competitions/${competitionId}`;
    for (const name of ["Alpha", "Beta"]) {
      const added = await send(actors.organizer, "POST", `${competitionPath}/participants`, {
        kind: "new-team",
        name: `${name} ${tag}`,
        creationKey: `${name}-${tag}`,
      });
      expect(added.status).toBeLessThan(300);
    }
    expect((await send(actors.organizer, "POST", `${competitionPath}/publish`)).status).toBe(200);
    const fixture = await parseResponse(
      fixturePlanSchema,
      await send(actors.organizer, "POST", `${competitionPath}/fixture`, {
        generationVersion: 1,
        startsAt: D0,
        roundIntervalDays: 7,
        homeAndAway: false,
      }),
    );
    const encounter = fixture.stages
      .flatMap((stage) => stage.rounds.flatMap((round) => round.encounters))
      .find((row) => row.home.kind === "team" && row.away.kind === "team");
    if (!encounter || encounter.home.kind !== "team" || encounter.away.kind !== "team") {
      throw new Error("Expected a Team vs Team Encounter");
    }
    const home = encounter.home.teamId;
    const away = encounter.away.teamId;

    for (const [actorId, teamId, role] of [
      [actors.homeCaptain, home, "captain"],
      [actors.awayCaptain, away, "captain"],
      [actors.awayPlayer, away, "player"],
    ] as const) {
      const profile = await modules.teams.repositories.profiles.saveIfAbsent({
        id: `profile-${actorId}`,
        actorId: asActorId(actorId),
        createdAt: new Date(),
      });
      await modules.teams.repositories.rosters.add({
        id: `roster-${actorId}`,
        organizationId: asOrganizationId(organizationId),
        competitionId: asCompetitionId(competitionId),
        teamId: asTeamId(teamId),
        playerProfileId: profile.id,
        gameAccountId: null,
        role,
        createdAt: new Date(),
      });
    }

    const requestsPath = `/encounters/${encounter.id}/schedule-change-requests`;
    return {
      setTime(value: string) {
        now = new Date(value);
      },
      actors,
      setNow: (instant: string) => {
        now = new Date(instant);
      },
      home,
      away,
      modules,
      send,
      requestsPath,
      snapshot: async () =>
        encounterScheduleSnapshotSchema.parse(
          await (
            await send(actors.organizer, "GET", `/encounters/${encounter.id}/schedule-snapshot`)
          ).json(),
        ),
      /** The requesting Team's captain asks to move the Encounter (or one slot) to `day`. */
      create: async (
        day: number,
        scope: { type: "entire_encounter" } | { type: "official_match"; officialSlot: 1 | 2 } = {
          type: "entire_encounter",
        },
      ) => {
        const response = await send(actors.homeCaptain, "POST", requestsPath, {
          requestingTeamId: home,
          scope,
          proposedWallTime: limaSix(day),
          reason: "Home travel conflict",
          idempotencyKey: `create-${day}`,
        });
        expect(response.status).toBe(200);
        return requestOf(response);
      },
      command: (
        actorId: string,
        request: { id: string },
        proposalId: string,
        command: "accept" | "reject" | "counter",
        body: unknown,
      ) =>
        send(
          actorId,
          "POST",
          `${requestsPath}/${request.id}/proposals/${proposalId}/${command}`,
          body,
        ),
    };
  }

  it.skipIf(skip)(
    "lists what the session actor may do with each request and with a new one",
    async () => {
      const flow = await seed();
      const created = await flow.create(15);
      const listAs = async (actorId: string) =>
        listScheduleChangeRequestsResponseSchema.parse(
          await (await flow.send(actorId, "GET", flow.requestsPath)).json(),
        );
      const capabilitiesOf = (list: Awaited<ReturnType<typeof listAs>>) =>
        list.requests.map(({ id, allowedActions, respondAs, blockedActions }) => ({
          id,
          allowedActions,
          respondAs,
          blockedActions,
        }));
      const every = (reason: string) =>
        ["accept", "reject", "counter"].map((action) => ({ action, reason }));

      const rival = await listAs(flow.actors.awayCaptain);
      expect(capabilitiesOf(rival)).toEqual([
        {
          id: created.id,
          allowedActions: ["accept", "reject", "counter"],
          respondAs: { authority: "rival_team", teamId: flow.away },
          blockedActions: [],
        },
      ]);
      expect(rival.creation.blockedReason).toBeNull();
      expect(rival.creation.teams).toEqual([{ teamId: flow.away, blockedReason: null }]);
      expect(rival.creation.scopes[0]).toEqual({
        scope: { type: "entire_encounter" },
        currentStartAt: D0,
        blockedReason: "active_request_exists",
      });

      expect(capabilitiesOf(await listAs(flow.actors.homeCaptain))).toEqual([
        {
          id: created.id,
          allowedActions: [],
          respondAs: null,
          blockedActions: every("own_proposal"),
        },
      ]);

      const player = await listAs(flow.actors.awayPlayer);
      expect(capabilitiesOf(player)).toEqual([
        {
          id: created.id,
          allowedActions: [],
          respondAs: null,
          blockedActions: every("permission"),
        },
      ]);
      expect(player.creation).toMatchObject({ blockedReason: "permission", teams: [] });
    },
  );

  it.skipIf(skip)(
    "returns notice anchors through HTTP and preserves state until an exact-boundary retry",
    async () => {
      const flow = await seed();
      const createBody = {
        requestingTeamId: flow.home,
        scope: { type: "entire_encounter" },
        proposedWallTime: limaSix(15),
        reason: "Home travel conflict",
        idempotencyKey: "notice-create",
      };
      flow.setNow("2099-01-10T11:00:00.001Z");
      const denied = await flow.send(
        flow.actors.homeCaptain,
        "POST",
        flow.requestsPath,
        createBody,
      );
      expect(denied.status).toBe(409);
      expect(apiErrorSchema.parse(await denied.json())).toMatchObject({
        code: "scheduling.reschedule_notice_not_met",
        messageKey: "errors.scheduling.reschedule_notice_not_met",
        details: { anchor: "current" },
      });
      expect(
        listScheduleChangeRequestsResponseSchema.parse(
          await (await flow.send(flow.actors.homeCaptain, "GET", flow.requestsPath)).json(),
        ).requests,
      ).toEqual([]);
      expect((await flow.snapshot()).scheduledStartAt).toBe("2099-01-10T23:00:00.000Z");

      flow.setNow("2099-01-10T11:00:00.000Z");
      const createdResponse = await flow.send(
        flow.actors.homeCaptain,
        "POST",
        flow.requestsPath,
        createBody,
      );
      expect(createdResponse.status).toBe(200);
      const created = await requestOf(createdResponse);
      const acceptBody = {
        expectedVersion: 1,
        commandKey: "notice-accept",
        responder: { authority: "rival_team", teamId: flow.away },
      };
      flow.setNow("2099-01-10T11:00:00.001Z");
      const rejectedConsent = await flow.command(
        flow.actors.awayCaptain,
        created,
        created.currentProposalId,
        "accept",
        acceptBody,
      );
      expect(rejectedConsent.status).toBe(409);
      expect(apiErrorSchema.parse(await rejectedConsent.json())).toMatchObject({
        code: "scheduling.reschedule_notice_not_met",
        details: { anchor: "current" },
      });
      expect(
        stateOf(
          await requestOf(
            await flow.send(flow.actors.homeCaptain, "GET", `${flow.requestsPath}/${created.id}`),
          ),
        ),
      ).toEqual(created);
      expect((await flow.snapshot()).scheduledStartAt).toBe("2099-01-10T23:00:00.000Z");

      flow.setNow("2099-01-10T11:00:00.000Z");
      const acceptedResponse = await flow.command(
        flow.actors.awayCaptain,
        created,
        created.currentProposalId,
        "accept",
        acceptBody,
      );
      expect(acceptedResponse.status).toBe(200);
      const accepted = await commandOf(acceptedResponse);
      expect(accepted.request).toMatchObject({ status: "accepted", version: 2 });
      expect((await flow.snapshot()).scheduledStartAt).toBe("2099-01-15T23:00:00.000Z");
      flow.setNow("2099-01-15T23:00:00.000Z");
      const replayResponse = await flow.command(
        flow.actors.awayCaptain,
        created,
        created.currentProposalId,
        "accept",
        acceptBody,
      );
      expect(replayResponse.status).toBe(200);
      expect(await commandOf(replayResponse)).toEqual({ ...accepted, replayed: true });
    },
  );

  it.skipIf(skip)(
    "returns a proposed notice error to the captain and accepts the twelve-hour neighbor",
    async () => {
      const flow = await seed();
      flow.setNow("2099-01-09T12:00:00.000Z");
      const created = await flow.create(15);
      flow.setNow("2099-01-09T12:00:00.001Z");
      const body = {
        expectedVersion: 1,
        commandKey: "notice-counter",
        teamId: flow.away,
        proposedWallTime: { year: 2099, month: 1, day: 9, hour: 19, minute: 0, second: 0 },
        reason: "Away travel conflict",
      };
      const denied = await flow.command(
        flow.actors.awayCaptain,
        created,
        created.currentProposalId,
        "counter",
        body,
      );
      expect(denied.status).toBe(409);
      expect(apiErrorSchema.parse(await denied.json())).toMatchObject({
        code: "scheduling.reschedule_notice_not_met",
        details: { anchor: "proposed" },
      });
      expect(
        stateOf(
          await requestOf(
            await flow.send(flow.actors.homeCaptain, "GET", `${flow.requestsPath}/${created.id}`),
          ),
        ),
      ).toEqual(created);
      flow.setNow("2099-01-09T12:00:00.000Z");
      const counterResponse = await flow.command(
        flow.actors.awayCaptain,
        created,
        created.currentProposalId,
        "counter",
        body,
      );
      expect(counterResponse.status).toBe(200);
      expect((await commandOf(counterResponse)).request).toMatchObject({
        status: "open",
        version: 2,
        proposals: [
          { proposedStartAt: "2099-01-15T23:00:00.000Z" },
          { proposedStartAt: "2099-01-10T00:00:00.000Z" },
        ],
      });
      expect((await flow.snapshot()).scheduledStartAt).toBe("2099-01-10T23:00:00.000Z");
    },
  );

  it.skipIf(skip)(
    "late responses fail without waiting for the runner; organizer resolves with real scoped authority",
    async () => {
      const {
        actors,
        home,
        away,
        modules,
        send,
        requestsPath,
        create,
        command,
        snapshot,
        setTime,
      } = await seed();
      const created = await create(15);
      expect(created.proposals[0]?.responseDeadline).toBe("2026-10-02T00:00:00.000Z");
      setTime("2026-10-02T00:00:00.000Z");
      expect(
        await failureOf(
          await command(actors.awayCaptain, created, created.currentProposalId, "accept", {
            expectedVersion: 1,
            commandKey: "late-accept",
            responder: { authority: "rival_team", teamId: away },
          }),
        ),
      ).toEqual({ status: 409, code: "scheduling.schedule_change_response_window_closed" });
      expect((await snapshot()).scheduledStartAt).toBe(D0);
      const expired = await modules.scheduling.expireScheduleChangeProposal.execute({
        actorId: asActorId(actors.organizer),
        organizationId: asOrganizationId(created.organizationId),
        encounterId: asEncounterId(created.encounterId),
        requestId: created.id,
      });
      if (expired.isErr()) throw expired.error;
      expect(expired.value).toEqual({ status: "escalated" });
      const organizerView = await requestOf(
        await send(actors.organizer, "GET", `${requestsPath}/${created.id}`),
      );
      const captainView = await requestOf(
        await send(actors.awayCaptain, "GET", `${requestsPath}/${created.id}`),
      );
      expect({
        status: organizerView.status,
        version: organizerView.version,
        actions: organizerView.allowedActions,
      }).toEqual({ status: "escalated", version: 2, actions: ["resolve"] });
      expect(captainView.allowedActions).toEqual([]);
      expect(organizerView.actions).toMatchObject([
        {
          kind: "schedule_change_expired",
          authority: "system",
          proposalId: created.currentProposalId,
          fromVersion: 1,
          toVersion: 2,
          responseDeadline: "2026-10-02T00:00:00.000Z",
          processedAt: "2026-10-02T00:00:00.000Z",
          resolution: null,
        },
      ]);
      const body = {
        proposalId: created.currentProposalId,
        expectedVersion: 2,
        commandKey: "organizer-keep",
        resolution: { outcome: "schedule_kept", reason: "Keep the agreed fixture" },
      };
      expect(
        await failureOf(
          await send(actors.awayCaptain, "POST", `${requestsPath}/${created.id}/resolve`, {
            ...body,
            actorId: actors.organizer,
          }),
        ),
      ).toEqual({ status: 403, code: "authorization.forbidden" });
      const resolved = await commandOf(
        await send(actors.organizer, "POST", `${requestsPath}/${created.id}/resolve`, body),
      );
      expect({
        status: resolved.request.status,
        version: resolved.request.version,
        allowedActions: resolved.request.allowedActions,
        replayed: resolved.replayed,
      }).toEqual({
        status: "resolved_by_organizer",
        version: 3,
        allowedActions: [],
        replayed: false,
      });
      expect(resolved.request.actions[1]).toMatchObject({
        authority: "organizer",
        actorId: actors.organizer,
        fromVersion: 2,
        toVersion: 3,
        resolution: { outcome: "schedule_kept", reason: "Keep the agreed fixture" },
      });
      expect(
        await commandOf(
          await send(actors.organizer, "POST", `${requestsPath}/${created.id}/resolve`, body),
        ),
      ).toEqual({ request: resolved.request, replayed: true });
      expect((await snapshot()).scheduledStartAt).toBe(D0);
      const reopened = await create(16);
      expect({ status: reopened.status, team: reopened.requestingTeamId }).toEqual({
        status: "open",
        team: home,
      });
    },
  );

  it.skipIf(skip)(
    "organizer schedule_set applies every scoped slot; walkover remains intent without an official result",
    async () => {
      for (const outcome of ["schedule_set", "walkover_intended"] as const) {
        const { actors, home, modules, send, requestsPath, create, snapshot, setTime } =
          await seed("knockout");
        const created = await create(15);
        setTime("2026-10-02T00:00:00.000Z");
        const expired = await modules.scheduling.expireScheduleChangeProposal.execute({
          actorId: asActorId(actors.organizer),
          organizationId: asOrganizationId(created.organizationId),
          encounterId: asEncounterId(created.encounterId),
          requestId: created.id,
        });
        if (expired.isErr()) throw expired.error;
        const resolution =
          outcome === "schedule_set"
            ? {
                outcome,
                reason: "Organizer emergency slot",
                proposedStartAt: "2026-10-02T01:00:00.000Z",
              }
            : { outcome, reason: "Opponent absent", winningTeamId: home };
        const body = {
          proposalId: created.currentProposalId,
          expectedVersion: 2,
          commandKey: `organizer-${outcome}`,
          resolution,
        };
        const resolved = await commandOf(
          await send(actors.organizer, "POST", `${requestsPath}/${created.id}/resolve`, body),
        );
        expect({
          status: resolved.request.status,
          version: resolved.request.version,
          replayed: resolved.replayed,
        }).toEqual({ status: "resolved_by_organizer", version: 3, replayed: false });
        expect(resolved.request.actions[1]?.resolution).toEqual(resolution);
        const expectedDate = outcome === "schedule_set" ? "2026-10-02T01:00:00.000Z" : D0;
        expect(await snapshot()).toMatchObject({
          scheduledStartAt: expectedDate,
          officialMatches: [
            { officialSlot: 1, scheduledStartAt: expectedDate },
            { officialSlot: 2, scheduledStartAt: expectedDate },
          ],
        });
        expect(resolved.request.application?.slots ?? null).toEqual(
          outcome === "schedule_set"
            ? [
                { officialSlot: 1, previousStartAt: D0, appliedStartAt: expectedDate },
                { officialSlot: 2, previousStartAt: D0, appliedStartAt: expectedDate },
              ]
            : null,
        );
        expect(
          await commandOf(
            await send(actors.organizer, "POST", `${requestsPath}/${created.id}/resolve`, body),
          ),
        ).toEqual({ request: resolved.request, replayed: true });
        expect(
          await modules.results.results.findLatestByEncounter(asEncounterId(created.encounterId)),
        ).toBeNull();
      }
    },
  );

  it.skipIf(skip)(
    "create D1, counter D2 and accept moves the Encounter to D2 once, with both proposals in history",
    async () => {
      const { actors, home, away, command, create, requestsPath, send, snapshot } = await seed();
      const created = await create(15);
      expect(created).toMatchObject({ status: "open", version: 1, decisions: [] });

      const countered = await commandOf(
        await command(actors.awayCaptain, created, created.currentProposalId, "counter", {
          expectedVersion: 1,
          commandKey: "away-counter",
          teamId: away,
          proposedWallTime: limaSix(16),
          reason: "Away cup final",
          timeZone: "America/Lima",
        }),
      );
      expect(countered.request.status).toBe("open");
      expect(countered.request.version).toBe(2);
      expect(countered.request.proposals.map((proposal) => proposal.proposedStartAt)).toEqual([
        D1,
        D2,
      ]);
      expect((await snapshot()).scheduledStartAt).toBe(D0);

      const acceptBody = {
        expectedVersion: 2,
        commandKey: "home-accept",
        responder: { authority: "rival_team", teamId: home },
      };
      const accepted = await commandOf(
        await command(
          actors.homeCaptain,
          created,
          countered.request.currentProposalId,
          "accept",
          acceptBody,
        ),
      );
      expect(accepted.replayed).toBe(false);
      expect(accepted.request).toMatchObject({ status: "accepted", version: 3 });
      expect(accepted.request.application).toMatchObject({
        proposalId: countered.request.currentProposalId,
        requestVersion: 3,
        appliedByActorId: actors.homeCaptain,
        previousEncounterStartAt: D0,
        appliedEncounterStartAt: D2,
        slots: [{ officialSlot: 1, previousStartAt: D0, appliedStartAt: D2 }],
      });
      expect(await snapshot()).toMatchObject({
        scheduledStartAt: D2,
        officialMatches: [{ officialSlot: 1, scheduledStartAt: D2 }],
      });

      // A player of the rival Team reads the persisted history.
      const read = await requestOf(
        await send(actors.awayPlayer, "GET", `${requestsPath}/${created.id}`),
      );
      expect(read.status).toBe("accepted");
      expect(
        read.proposals.map((proposal) => [proposal.proposedByTeamId, proposal.proposedStartAt]),
      ).toEqual([
        [home, D1],
        [away, D2],
      ]);
      expect(read.decisions).toMatchObject([
        {
          proposalId: countered.request.currentProposalId,
          kind: "consent",
          responder: { authority: "rival_team", teamId: home },
          actorId: actors.homeCaptain,
        },
      ]);
      expect(read.application?.id).toBe(accepted.request.application?.id);

      // Replaying the same key returns the same outcome without a second effect.
      const replay = await commandOf(
        await command(
          actors.homeCaptain,
          created,
          countered.request.currentProposalId,
          "accept",
          acceptBody,
        ),
      );
      expect(replay).toEqual({ request: accepted.request, replayed: true });
      const afterReplay = await requestOf(
        await send(actors.organizer, "GET", `${requestsPath}/${created.id}`),
      );
      expect({ version: afterReplay.version, decisions: afterReplay.decisions.length }).toEqual({
        version: 3,
        decisions: 1,
      });
      expect((await snapshot()).scheduledStartAt).toBe(D2);

      // The same key with another payload is refused instead of executing.
      expect(
        await failureOf(
          await command(
            actors.homeCaptain,
            created,
            countered.request.currentProposalId,
            "accept",
            {
              ...acceptBody,
              expectedVersion: 3,
            },
          ),
        ),
      ).toEqual({ status: 409, code: "scheduling.schedule_change_idempotency_conflict" });
    },
  );

  it.skipIf(skip)("rejecting closes the request and keeps D0", async () => {
    const { actors, away, command, create, requestsPath, send, snapshot } = await seed();
    const created = await create(15);

    const rejected = await commandOf(
      await command(actors.awayCaptain, created, created.currentProposalId, "reject", {
        expectedVersion: 1,
        commandKey: "away-reject",
        responder: { authority: "rival_team", teamId: away },
        reason: "No date works for us",
      }),
    );

    expect(rejected.request).toMatchObject({ status: "rejected", version: 2, application: null });
    expect(await snapshot()).toMatchObject({
      scheduledStartAt: D0,
      officialMatches: [{ officialSlot: 1, scheduledStartAt: D0 }],
    });
    const read = await requestOf(
      await send(actors.homeCaptain, "GET", `${requestsPath}/${created.id}`),
    );
    expect(read.decisions).toMatchObject([
      { kind: "rejection", actorId: actors.awayCaptain, reason: "No date works for us" },
    ]);
    expect(
      await failureOf(
        await command(actors.awayCaptain, created, created.currentProposalId, "accept", {
          expectedVersion: 2,
          commandKey: "away-late-accept",
          responder: { authority: "rival_team", teamId: away },
        }),
      ),
    ).toEqual({ status: 409, code: "scheduling.schedule_change_request_closed" });
  });

  it.skipIf(skip)(
    "grants nothing for a claimed role, hides the request from outsiders and refuses stale input",
    async () => {
      const { actors, home, away, command, create, requestsPath, send, snapshot } = await seed();
      const created = await create(15);
      const proposalId = created.currentProposalId;
      const accept = (actorId: string, body: unknown) =>
        command(actorId, created, proposalId, "accept", body);

      // Claiming the organizer capacity (and stuffing a role or actor in the body) is refused.
      expect(
        await failureOf(
          await accept(actors.awayCaptain, {
            expectedVersion: 1,
            commandKey: "forged-organizer",
            responder: { authority: "organizer" },
            role: "organizer",
            actorId: actors.organizer,
          }),
        ),
      ).toEqual({ status: 403, code: "authorization.forbidden" });
      // A player of the rival Team reads but cannot answer for it.
      expect(
        await failureOf(
          await accept(actors.awayPlayer, {
            expectedVersion: 1,
            commandKey: "player-accept",
            responder: { authority: "rival_team", teamId: away },
          }),
        ),
      ).toEqual({ status: 403, code: "authorization.forbidden" });
      // The requesting Team cannot consent to its own proposal.
      expect(
        await failureOf(
          await accept(actors.homeCaptain, {
            expectedVersion: 1,
            commandKey: "self-accept",
            responder: { authority: "rival_team", teamId: home },
          }),
        ),
      ).toEqual({ status: 403, code: "scheduling.schedule_change_self_response_forbidden" });

      expect(
        await failureOf(await send(actors.stranger, "GET", `${requestsPath}/${created.id}`)),
      ).toEqual({ status: 404, code: "scheduling.schedule_change_encounter_not_found" });
      expect(
        await failureOf(await send(actors.homeCaptain, "GET", `${requestsPath}/request-unknown`)),
      ).toEqual({ status: 404, code: "scheduling.schedule_change_request_not_found" });

      for (const invalid of [
        { expectedVersion: 1, responder: { authority: "rival_team", teamId: away } },
        {
          expectedVersion: "1",
          commandKey: "k",
          responder: { authority: "rival_team", teamId: away },
        },
        { expectedVersion: 1, commandKey: "k", responder: { authority: "captain" } },
      ]) {
        expect(await failureOf(await accept(actors.awayCaptain, invalid))).toEqual({
          status: 400,
          code: "api.validation_error",
        });
      }
      expect(
        await failureOf(
          await command(actors.awayCaptain, created, proposalId, "counter", {
            expectedVersion: 1,
            commandKey: "away-counter-ny",
            teamId: away,
            proposedWallTime: limaSix(16),
            reason: "Away cup final",
            timeZone: "America/New_York",
          }),
        ),
      ).toEqual({ status: 400, code: "scheduling.invalid_schedule_change_date" });
      expect(
        await failureOf(
          await accept(actors.awayCaptain, {
            expectedVersion: 7,
            commandKey: "away-stale",
            responder: { authority: "rival_team", teamId: away },
          }),
        ),
      ).toEqual({ status: 409, code: "scheduling.schedule_change_version_conflict" });

      const unchanged = await requestOf(
        await send(actors.awayCaptain, "GET", `${requestsPath}/${created.id}`),
      );
      expect(unchanged).toMatchObject({ status: "open", version: 1, decisions: [] });
      expect((await snapshot()).scheduledStartAt).toBe(D0);

      // The rival captain, in the capacity it really holds, completes the same answer.
      const accepted = await commandOf(
        await accept(actors.awayCaptain, {
          expectedVersion: 1,
          commandKey: "away-accept",
          responder: { authority: "rival_team", teamId: away },
        }),
      );
      expect(accepted.request.status).toBe("accepted");
      expect((await snapshot()).scheduledStartAt).toBe(D1);
    },
  );

  it.skipIf(skip)("answers a superseded proposal with a stale-proposal conflict", async () => {
    const { actors, home, away, command, create } = await seed();
    const created = await create(15);
    await commandOf(
      await command(actors.awayCaptain, created, created.currentProposalId, "counter", {
        expectedVersion: 1,
        commandKey: "away-counter",
        teamId: away,
        proposedWallTime: limaSix(16),
        reason: "Away cup final",
      }),
    );

    expect(
      await failureOf(
        await command(actors.homeCaptain, created, created.currentProposalId, "accept", {
          expectedVersion: 2,
          commandKey: "home-accept-old",
          responder: { authority: "rival_team", teamId: home },
        }),
      ),
    ).toEqual({ status: 409, code: "scheduling.schedule_change_proposal_stale" });
  });

  it.skipIf(skip)("moving official match 2 keeps slot 1 at D0", async () => {
    const { actors, away, command, create, snapshot } = await seed("knockout");
    expect((await snapshot()).officialMatches).toEqual([
      { officialSlot: 1, scheduledStartAt: D0 },
      { officialSlot: 2, scheduledStartAt: D0 },
    ]);
    const created = await create(15, { type: "official_match", officialSlot: 2 });

    const accepted = await commandOf(
      await command(actors.awayCaptain, created, created.currentProposalId, "accept", {
        expectedVersion: 1,
        commandKey: "away-accept-slot-2",
        responder: { authority: "rival_team", teamId: away },
      }),
    );

    expect(accepted.request.application?.slots).toEqual([
      { officialSlot: 2, previousStartAt: D0, appliedStartAt: D1 },
    ]);
    expect(await snapshot()).toMatchObject({
      scheduledStartAt: D0,
      officialMatches: [
        { officialSlot: 1, scheduledStartAt: D0 },
        { officialSlot: 2, scheduledStartAt: D1 },
      ],
    });
  });

  it.skipIf(skip)(
    "a snapshot read while an accept commits reports one coherent schedule",
    async () => {
      const { actors, away, command, create, modules, snapshot } = await seed();
      const created = await create(15);
      const matches = modules.scheduling.officialMatches;
      const listByEncounter = matches.listByEncounter.bind(matches);
      let interleaved = false;
      // The snapshot GET has already read the Encounter (still D0) when the accept commits.
      matches.listByEncounter = async (encounterId) => {
        if (!interleaved) {
          interleaved = true;
          const accepted = await commandOf(
            await command(actors.awayCaptain, created, created.currentProposalId, "accept", {
              expectedVersion: 1,
              commandKey: "away-accept-mid-read",
              responder: { authority: "rival_team", teamId: away },
            }),
          );
          expect(accepted.request.status).toBe("accepted");
        }
        return listByEncounter(encounterId);
      };

      const read = await snapshot();

      expect(interleaved).toBe(true);
      expect(read).toMatchObject({
        scheduledStartAt: D1,
        officialMatches: [{ officialSlot: 1, scheduledStartAt: D1 }],
      });
    },
  );
  it.skipIf(skip)(
    "projects the negotiation onto the activity feed: counter, escalation and the organizer decision",
    async () => {
      const { actors, away, home, modules, send, create, command, setTime } = await seed();
      const feedOf = async (path: string, actorId: string) =>
        parseResponse(listActivitiesResponseSchema, await send(actorId, "GET", path));
      const negotiation = async (actorId: string, organizationId: string, scope: "org" | "me") => {
        const path =
          scope === "org"
            ? `/organizations/${organizationId}/activities`
            : "/players/me/activities";
        const { activities } = await feedOf(path, actorId);
        return activities
          .filter((row) => row.kind === "schedule_change" || row.kind === "organizer_decision")
          .map((row) => ({
            kind: row.kind,
            audience: row.audience,
            status: row.status,
            requiresAction: row.requiresAction,
            outcome: row.subject.outcome,
          }));
      };

      const created = await create(15);
      const orgId = created.organizationId;
      expect(await negotiation(actors.awayCaptain, orgId, "me")).toEqual([
        {
          kind: "schedule_change",
          audience: "team",
          status: "open",
          requiresAction: true,
          outcome: null,
        },
      ]);
      expect(await negotiation(actors.homeCaptain, orgId, "me")).toEqual([]);
      expect(await negotiation(actors.organizer, orgId, "org")).toEqual([
        {
          kind: "schedule_change",
          audience: "organization",
          status: "open",
          requiresAction: false,
          outcome: null,
        },
      ]);

      // A counter moves the question to the other Team and closes the first proposal.
      const countered = await command(
        actors.awayCaptain,
        created,
        created.currentProposalId,
        "counter",
        {
          expectedVersion: 1,
          commandKey: "feed-counter",
          teamId: away,
          proposedWallTime: limaSix(16),
          reason: "Away travel conflict",
        },
      );
      expect(countered.status).toBe(200);
      const proposalId = (await commandOf(countered)).request.currentProposalId;
      expect(await negotiation(actors.awayCaptain, orgId, "me")).toMatchObject([
        { status: "closed", requiresAction: true },
      ]);
      expect(await negotiation(actors.homeCaptain, orgId, "me")).toMatchObject([
        { status: "open", requiresAction: true },
      ]);

      // Nobody answered in time: the organizer must decide, and the Teams are told.
      setTime("2026-10-02T12:00:01.000Z");
      const expired = await modules.activityCommands.expireScheduleChangeProposal.execute({
        actorId: asActorId(actors.organizer),
        organizationId: asOrganizationId(orgId),
        encounterId: asEncounterId(created.encounterId),
        requestId: created.id,
      });
      expect(expired.isOk() && expired.value.status).toBe("escalated");
      expect(await negotiation(actors.homeCaptain, orgId, "me")).toMatchObject([
        { status: "closed" },
      ]);
      const escalated = await negotiation(actors.organizer, orgId, "org");
      expect(escalated.filter((row) => row.status === "open")).toEqual([
        {
          kind: "schedule_change",
          audience: "organization",
          status: "open",
          requiresAction: true,
          outcome: null,
        },
      ]);
      const pendingForOrganizer = await feedOf(
        `/organizations/${orgId}/activities?status=open&requiresAction=true`,
        actors.organizer,
      );
      expect(pendingForOrganizer.activities.map((row) => row.kind)).toEqual(["schedule_change"]);

      const resolve = (commandKey: string) =>
        send(
          actors.organizer,
          "POST",
          `/encounters/${created.encounterId}/schedule-change-requests/${created.id}/resolve`,
          {
            proposalId,
            expectedVersion: 3,
            commandKey,
            resolution: { outcome: "schedule_kept", reason: "Keep the agreed fixture" },
          },
        );
      expect((await resolve("feed-resolve")).status).toBe(200);
      expect((await resolve("feed-resolve")).status).toBe(200);

      const decided = {
        kind: "organizer_decision",
        status: "closed",
        requiresAction: false,
        outcome: "schedule_kept",
      };
      expect(await negotiation(actors.homeCaptain, orgId, "me")).toContainEqual({
        ...decided,
        audience: "team",
      });
      expect(await negotiation(actors.awayCaptain, orgId, "me")).toContainEqual({
        ...decided,
        audience: "team",
      });
      const closed = await negotiation(actors.organizer, orgId, "org");
      expect(closed.filter((row) => row.kind === "organizer_decision")).toEqual([
        { ...decided, audience: "organization" },
      ]);
      expect(closed.filter((row) => row.status === "open")).toEqual([]);
      expect(home).not.toBe(away);
    },
  );
});
