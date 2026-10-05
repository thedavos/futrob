import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  type ActorId,
  type AuthorizationPort,
  type EncounterId,
  type OrganizationId,
  type Permission,
  type Result,
  type TeamId,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import {
  AcceptScheduleChangeProposalUseCase,
  CounterScheduleChangeProposalUseCase,
  CreateScheduleChangeRequestUseCase,
  ENCOUNTER_PERMISSION,
  ListScheduleChangeRequestsUseCase,
  RejectScheduleChangeProposalUseCase,
  asFixtureStageId,
  type CompetitionRescheduleRules,
  type EncounterScheduleSnapshot,
  type ScheduleChangeCommandOutput,
  type ScheduleChangeCommandReceipt,
  type ScheduleChangeCommitOutcome,
  type ScheduleChangeRequest,
  type ScheduleChangeRequestRepository,
  type ScheduleChangeResponder,
  type ScheduleChangeTransition,
} from "../index.ts";

const organizationId = asOrganizationId("org-1");
const otherOrganizationId = asOrganizationId("org-2");
const competitionId = asCompetitionId("competition-1");
const encounterId = asEncounterId("encounter-1");
const teamA = asTeamId("team-a");
const teamB = asTeamId("team-b");
const captainA = asActorId("captain-a");
const captainB = asActorId("captain-b");
const organizer = asActorId("organizer-1");

// Competition zone America/Lima is UTC-5 all year; 15:00 local is 20:00Z.
const D0 = "2026-10-10T20:00:00.000Z";
const D1 = "2026-10-11T20:00:00.000Z";
const D2 = "2026-10-12T20:00:00.000Z";
const limaThreePm = (day: number) => ({
  year: 2026,
  month: 10,
  day,
  hour: 15,
  minute: 0,
  second: 0,
});

const encounter: EncounterScheduleSnapshot = {
  encounterId,
  organizationId,
  competitionId,
  stageId: asFixtureStageId("stage-1"),
  homeTeamId: teamA,
  awayTeamId: teamB,
  scheduledStartAt: new Date(D0),
  officialMatchCount: 2,
};

type Approvals = Pick<
  CompetitionRescheduleRules,
  "requiresOpponentApproval" | "requiresOrganizerApproval"
>;
const OPPONENT_ONLY: Approvals = {
  requiresOpponentApproval: true,
  requiresOrganizerApproval: false,
};

class MemoryRequests implements ScheduleChangeRequestRepository {
  readonly rows = new Map<string, ScheduleChangeRequest>();
  readonly receipts: ScheduleChangeCommandReceipt[] = [];

  async findById(orgId: OrganizationId, requestId: string) {
    const row = this.rows.get(requestId);
    return row && row.organizationId === orgId ? row : null;
  }

  async findByIdempotencyKey(orgId: OrganizationId, key: string) {
    return (
      [...this.rows.values()].find(
        (row) => row.organizationId === orgId && row.idempotencyKey === key,
      ) ?? null
    );
  }

  async listActiveByEncounter(orgId: OrganizationId, id: EncounterId) {
    return (await this.listByEncounter(orgId, id)).filter((row) => row.status === "open");
  }

  async listByEncounter(orgId: OrganizationId, id: EncounterId) {
    return [...this.rows.values()].filter(
      (row) => row.organizationId === orgId && row.encounterId === id,
    );
  }

  async findCommandReceipt(orgId: OrganizationId, actorId: ActorId, commandKey: string) {
    return (
      this.receipts.find(
        (receipt) =>
          receipt.organizationId === orgId &&
          receipt.actorId === actorId &&
          receipt.commandKey === commandKey,
      ) ?? null
    );
  }

  async save(request: ScheduleChangeRequest) {
    this.rows.set(request.id, request);
    return request;
  }

  async commit(
    transition: ScheduleChangeTransition,
    receipt: ScheduleChangeCommandReceipt,
  ): Promise<ScheduleChangeCommitOutcome> {
    const stored = this.rows.get(transition.request.id);
    if (!stored || stored.version !== transition.expectedVersion) {
      return { kind: "version_conflict", currentVersion: stored?.version ?? 0 };
    }
    this.rows.set(transition.request.id, transition.request);
    this.receipts.push(receipt);
    return { kind: "committed" };
  }
}

/** Grants are `actor|permission|team`; `*` matches any Team scope. */
class Grants implements AuthorizationPort {
  private readonly grants = new Set<string>();

  allow(actorId: ActorId, permission: Permission, teamId: TeamId | "*" = "*") {
    this.grants.add(`${actorId}|${permission}|${teamId}`);
  }

  revoke(actorId: ActorId, permission: Permission, teamId: TeamId | "*" = "*") {
    this.grants.delete(`${actorId}|${permission}|${teamId}`);
  }

  async decide(request: Parameters<AuthorizationPort["decide"]>[0]) {
    const team = request.scope.teamId ?? "*";
    const allowed =
      this.grants.has(`${request.actorId}|${request.permission}|${team}`) ||
      this.grants.has(`${request.actorId}|${request.permission}|*`);
    return { ...request, allowed, reason: allowed ? ("allowed" as const) : ("denied" as const) };
  }

  async getEffectiveAccess(input: Parameters<AuthorizationPort["getEffectiveAccess"]>[0]) {
    return { ...input, roles: [], permissions: [] };
  }
}

function negotiation(approvals: Approvals = OPPONENT_ONLY) {
  const requests = new MemoryRequests();
  const grants = new Grants();
  for (const [actor, team] of [
    [captainA, teamA],
    [captainB, teamB],
  ] as const) {
    grants.allow(actor, ENCOUNTER_PERMISSION.read);
    grants.allow(actor, ENCOUNTER_PERMISSION.rescheduleRequest, team);
  }
  grants.allow(organizer, ENCOUNTER_PERMISSION.read);
  grants.allow(organizer, ENCOUNTER_PERMISSION.rescheduleRequest);
  grants.allow(organizer, ENCOUNTER_PERMISSION.rescheduleResolve);

  let sequence = 0;
  let now = new Date("2026-10-01T12:00:00.000Z");
  const encounters = {
    findById: async (id: EncounterId) => (id === encounterId ? encounter : null),
    upsert: async (snapshot: EncounterScheduleSnapshot) => snapshot,
    deleteByEncounterIds: async () => undefined,
    findNextUpcomingByTeamIds: async () => null,
  };
  const deps = {
    authorization: grants,
    clock: { now: () => new Date(now) },
    editGuard: { canRequestScheduleChange: async () => true },
    encounters,
    ids: { generate: () => `id-${++sequence}` },
    mutationLock: { runExclusive: <T>(_id: EncounterId, run: () => Promise<T>) => run() },
    requests,
    rules: {
      getRules: async () => ({
        allowRescheduling: true,
        maxReschedulesPerTeam: 2,
        minimumNoticeHours: 12,
        ...approvals,
      }),
      countAppliedReschedules: async () => 0,
    },
    timeZones: { getTimeZone: async () => "America/Lima" },
    transaction: { runInTransaction: <T>(run: () => Promise<T>) => run() },
  };
  const create = new CreateScheduleChangeRequestUseCase({
    ...deps,
    eventPublisher: { publish: async () => undefined, publishMany: async () => undefined },
  });
  const accept = new AcceptScheduleChangeProposalUseCase(deps);
  const reject = new RejectScheduleChangeProposalUseCase(deps);
  const counter = new CounterScheduleChangeProposalUseCase(deps);
  const list = new ListScheduleChangeRequestsUseCase(deps);
  const target = { organizationId, competitionId, encounterId };

  return {
    grants,
    advanceClock(ms: number) {
      now = new Date(now.getTime() + ms);
    },
    async propose(day = 11): Promise<ScheduleChangeRequest> {
      const created = await create.execute({
        ...target,
        actorId: captainA,
        requestingTeamId: teamA,
        scope: { type: "entire_encounter" },
        proposedWallTime: limaThreePm(day),
        timeZone: "America/Lima",
        reason: "Travel conflict",
        idempotencyKey: "create-1",
      });
      return unwrap(created);
    },
    accept(
      actorId: ActorId,
      responder: ScheduleChangeResponder,
      at: { proposalId: string; version: number },
      commandKey = `accept-${actorId}-${at.proposalId}`,
    ) {
      return accept.execute({
        ...target,
        actorId,
        responder,
        requestId: "id-1",
        proposalId: at.proposalId,
        expectedVersion: at.version,
        commandKey,
      });
    },
    reject(
      actorId: ActorId,
      responder: ScheduleChangeResponder,
      at: { proposalId: string; version: number },
      reason?: string,
    ) {
      return reject.execute({
        ...target,
        actorId,
        responder,
        requestId: "id-1",
        proposalId: at.proposalId,
        expectedVersion: at.version,
        commandKey: `reject-${actorId}`,
        reason,
      });
    },
    counter(
      actorId: ActorId,
      teamId: TeamId,
      at: { proposalId: string; version: number },
      day: number,
      commandKey = `counter-${actorId}`,
      overrides: { organizationId?: OrganizationId } = {},
    ) {
      return counter.execute({
        ...target,
        ...overrides,
        actorId,
        teamId,
        requestId: "id-1",
        proposalId: at.proposalId,
        expectedVersion: at.version,
        commandKey,
        timeZone: "America/Lima",
        proposedWallTime: limaThreePm(day),
        reason: "Stadium unavailable",
      });
    },
    async stored(): Promise<ScheduleChangeRequest> {
      const listed = unwrap(await list.execute({ ...target, actorId: organizer }));
      const [request] = listed;
      if (!request) throw new Error("request missing");
      return request;
    },
    receipts: () => requests.receipts,
    encounterStart: async () =>
      (await encounters.findById(encounterId))?.scheduledStartAt.toISOString(),
  };
}

function unwrap<T, E>(result: Result<T, E>): T {
  if (result.isErr()) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`);
  return result.value;
}

function errorCode<T>(result: Result<T, { code: string }>): string {
  if (result.isOk()) throw new Error("expected an error");
  return result.error.code;
}

const asRival = (teamId: TeamId): ScheduleChangeResponder => ({ authority: "rival_team", teamId });
const asOrganizer: ScheduleChangeResponder = { authority: "organizer" };

function history(request: ScheduleChangeRequest) {
  return {
    status: request.status,
    version: request.version,
    proposals: request.proposals.map((proposal) => ({
      id: proposal.id,
      at: proposal.proposedStartAt.toISOString(),
      team: proposal.proposedByTeamId,
      reason: proposal.reason,
    })),
    decisions: request.decisions.map((decision) => ({
      proposalId: decision.proposalId,
      requestVersion: decision.requestVersion,
      kind: decision.kind,
      authority: decision.responder.authority,
      actorId: decision.actorId,
    })),
  };
}

describe("schedule change negotiation", () => {
  it("keeps D1 and D2 in history and does not approve D2 through a consent to stale D1", async () => {
    const flow = negotiation();
    const created = await flow.propose(11);
    const d1 = created.proposals[0].id;

    const countered = unwrap(
      await flow.counter(captainB, teamB, { proposalId: d1, version: 1 }, 12),
    );
    const d2 = countered.request.proposals[1]?.id ?? "missing";

    const stale = await flow.accept(captainB, asRival(teamB), { proposalId: d1, version: 2 });
    expect(errorCode(stale)).toBe("scheduling.schedule_change_proposal_stale");

    expect(history(await flow.stored())).toEqual({
      status: "open",
      version: 2,
      proposals: [
        { id: d1, at: D1, team: teamA, reason: "Travel conflict" },
        { id: d2, at: D2, team: teamB, reason: "Stadium unavailable" },
      ],
      decisions: [],
    });

    const accepted = unwrap(
      await flow.accept(captainA, asRival(teamA), { proposalId: d2, version: 2 }),
    );
    expect(history(accepted.request)).toMatchObject({
      status: "accepted",
      version: 3,
      decisions: [
        {
          proposalId: d2,
          requestVersion: 2,
          kind: "consent",
          authority: "rival_team",
          actorId: captainA,
        },
      ],
    });
  });

  it("rejects the current proposal without touching the Encounter schedule", async () => {
    const flow = negotiation();
    const created = await flow.propose(11);

    const rejected = unwrap(
      await flow.reject(
        captainB,
        asRival(teamB),
        { proposalId: created.proposals[0].id, version: 1 },
        "  Cannot play that day ",
      ),
    );

    expect(rejected.request.status).toBe("rejected");
    expect(rejected.request.decisions[0]?.reason).toBe("Cannot play that day");
    expect((await flow.stored()).status).toBe("rejected");
    expect(await flow.encounterStart()).toBe(D0);

    const afterClose = await flow.accept(captainB, asRival(teamB), {
      proposalId: created.proposals[0].id,
      version: 2,
    });
    expect(errorCode(afterClose)).toBe("scheduling.schedule_change_request_closed");
  });

  it("refuses the proposing Team as its own rival and accepts the actual rival", async () => {
    const flow = negotiation();
    const created = await flow.propose(11);
    const at = { proposalId: created.proposals[0].id, version: 1 };

    const self = await flow.accept(captainA, asRival(teamA), at);
    expect(errorCode(self)).toBe("scheduling.schedule_change_self_response_forbidden");
    expect((await flow.stored()).decisions).toEqual([]);

    const rival = unwrap(await flow.accept(captainB, asRival(teamB), at));
    expect(rival.request.status).toBe("accepted");
  });

  it("binds consents to the proposal and version they answered", async () => {
    const flow = negotiation({ requiresOpponentApproval: true, requiresOrganizerApproval: true });
    const created = await flow.propose(11);
    const d1 = created.proposals[0].id;

    unwrap(await flow.accept(organizer, asOrganizer, { proposalId: d1, version: 1 }));
    const countered = unwrap(
      await flow.counter(captainB, teamB, { proposalId: d1, version: 2 }, 12),
    );
    const d2 = countered.request.proposals[1]?.id ?? "missing";
    const rivalConsent = unwrap(
      await flow.accept(captainA, asRival(teamA), { proposalId: d2, version: 3 }),
    );
    // The organizer consented to D1 only, so D2 still lacks the organizer.
    expect(rivalConsent.request.status).toBe("open");

    const organizerConsent = unwrap(
      await flow.accept(organizer, asOrganizer, { proposalId: d2, version: 4 }),
    );
    expect(history(organizerConsent.request).decisions).toEqual([
      {
        proposalId: d1,
        requestVersion: 1,
        kind: "consent",
        authority: "organizer",
        actorId: organizer,
      },
      {
        proposalId: d2,
        requestVersion: 3,
        kind: "consent",
        authority: "rival_team",
        actorId: captainA,
      },
      {
        proposalId: d2,
        requestVersion: 4,
        kind: "consent",
        authority: "organizer",
        actorId: organizer,
      },
    ]);
    expect(organizerConsent.request.status).toBe("accepted");
  });

  describe("approval matrix", () => {
    const cases: readonly {
      readonly name: string;
      readonly approvals: Approvals;
      readonly afterRival: string;
      readonly afterOrganizer: string;
    }[] = [
      {
        name: "opponent only",
        approvals: { requiresOpponentApproval: true, requiresOrganizerApproval: false },
        afterRival: "accepted",
        afterOrganizer: "scheduling.schedule_change_authority_not_required",
      },
      {
        name: "organizer only",
        approvals: { requiresOpponentApproval: false, requiresOrganizerApproval: true },
        afterRival: "scheduling.schedule_change_authority_not_required",
        afterOrganizer: "accepted",
      },
      {
        name: "opponent and organizer",
        approvals: { requiresOpponentApproval: true, requiresOrganizerApproval: true },
        afterRival: "open",
        afterOrganizer: "open",
      },
      {
        name: "neither (undecided policy)",
        approvals: { requiresOpponentApproval: false, requiresOrganizerApproval: false },
        afterRival: "scheduling.schedule_change_approval_not_configured",
        afterOrganizer: "scheduling.schedule_change_approval_not_configured",
      },
    ];

    const outcome = (result: Result<ScheduleChangeCommandOutput, { code: string }>) =>
      result.isOk() ? result.value.request.status : result.error.code;

    it.each(cases)("$name: a single consent yields the configured outcome", async (row) => {
      const rivalFlow = negotiation(row.approvals);
      const first = await rivalFlow.propose(11);
      const at = { proposalId: first.proposals[0].id, version: 1 };
      expect(outcome(await rivalFlow.accept(captainB, asRival(teamB), at))).toBe(row.afterRival);

      const organizerFlow = negotiation(row.approvals);
      const second = await organizerFlow.propose(11);
      expect(
        outcome(
          await organizerFlow.accept(organizer, asOrganizer, {
            proposalId: second.proposals[0].id,
            version: 1,
          }),
        ),
      ).toBe(row.afterOrganizer);
    });

    it("opponent and organizer: both consents, in either order, accept the proposal", async () => {
      const both = { requiresOpponentApproval: true, requiresOrganizerApproval: true };
      for (const order of [
        [captainB, organizer],
        [organizer, captainB],
      ] as const) {
        const flow = negotiation(both);
        const created = await flow.propose(11);
        const proposalId = created.proposals[0].id;
        const responder = (actor: ActorId) => (actor === organizer ? asOrganizer : asRival(teamB));
        unwrap(await flow.accept(order[0], responder(order[0]), { proposalId, version: 1 }));
        const last = unwrap(
          await flow.accept(order[1], responder(order[1]), { proposalId, version: 2 }),
        );
        expect(last.request.status).toBe("accepted");
      }
    });

    it("one actor cannot fill both required authorities", async () => {
      const flow = negotiation({ requiresOpponentApproval: true, requiresOrganizerApproval: true });
      const created = await flow.propose(11);
      const proposalId = created.proposals[0].id;
      unwrap(await flow.accept(organizer, asOrganizer, { proposalId, version: 1 }));

      const sameActor = await flow.accept(
        organizer,
        asRival(teamB),
        { proposalId, version: 2 },
        "organizer-as-rival",
      );
      expect(errorCode(sameActor)).toBe("scheduling.schedule_change_consent_already_recorded");
      expect((await flow.stored()).status).toBe("open");
    });
  });

  it("replays an identical command without appending and rejects a reused key with new input", async () => {
    const flow = negotiation();
    const created = await flow.propose(11);
    const at = { proposalId: created.proposals[0].id, version: 1 };

    const first = unwrap(await flow.counter(captainB, teamB, at, 12, "key-1"));
    flow.advanceClock(60_000);
    const replay = unwrap(await flow.counter(captainB, teamB, at, 12, "key-1"));

    expect(replay.replayed).toBe(true);
    expect(replay.receipt.id).toBe(first.receipt.id);
    expect(history(replay.request)).toEqual(history(first.request));
    expect((await flow.stored()).proposals).toHaveLength(2);
    expect(flow.receipts()).toHaveLength(1);

    const reused = await flow.counter(captainB, teamB, at, 13, "key-1");
    expect(errorCode(reused)).toBe("scheduling.schedule_change_idempotency_conflict");
    expect((await flow.stored()).proposals.map((p) => p.proposedStartAt.toISOString())).toEqual([
      D1,
      D2,
    ]);
  });

  it("re-authorizes a replay, so a revoked permission blocks it", async () => {
    const flow = negotiation();
    const created = await flow.propose(11);
    const at = { proposalId: created.proposals[0].id, version: 1 };
    unwrap(await flow.counter(captainB, teamB, at, 12, "key-1"));

    flow.grants.revoke(captainB, ENCOUNTER_PERMISSION.rescheduleRequest, teamB);
    const replay = await flow.counter(captainB, teamB, at, 12, "key-1");

    expect(errorCode(replay)).toBe("authorization.forbidden");
  });

  it("rejects a command against an outdated version or another organization", async () => {
    const flow = negotiation();
    const created = await flow.propose(11);
    const proposalId = created.proposals[0].id;

    const outdated = await flow.counter(captainB, teamB, { proposalId, version: 7 }, 12);
    expect(errorCode(outdated)).toBe("scheduling.schedule_change_version_conflict");

    const foreign = await flow.counter(captainB, teamB, { proposalId, version: 1 }, 12, "k", {
      organizationId: otherOrganizationId,
    });
    expect(errorCode(foreign)).toBe("scheduling.schedule_change_encounter_not_found");
    expect((await flow.stored()).version).toBe(1);
  });
});
