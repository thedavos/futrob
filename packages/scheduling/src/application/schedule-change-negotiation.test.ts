import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asOfficialMatchSlotId,
  asTeamId,
  type ActorId,
  type DomainEvent,
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
  ExpireScheduleChangeProposalUseCase,
  GetScheduleChangeRequestUseCase,
  ListScheduleChangeRequestsUseCase,
  RejectScheduleChangeProposalUseCase,
  ResolveScheduleChangeRequestUseCase,
  asFixtureStageId,
  createInitialScheduleChangeRequest,
  type CompetitionRescheduleRules,
  type EncounterScheduleSnapshot,
  type OfficialMatch,
  type RescheduleScope,
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
const limaThreePm = (day: number, hour = 15) => ({
  year: 2026,
  month: 10,
  day,
  hour,
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

function negotiation(
  approvals: Approvals = OPPONENT_ONLY,
  options: {
    readonly slots?: readonly [string, string];
    readonly maxReschedulesPerTeam?: number;
    readonly proposalExpiryHours?: number;
    readonly allowRescheduling?: boolean;
  } = {},
) {
  const requests = new MemoryRequests();
  const [slot1, slot2] = options.slots ?? [D0, D0];
  let snapshot: EncounterScheduleSnapshot = { ...encounter, scheduledStartAt: new Date(slot1) };
  let slots: OfficialMatch[] = [slot1, slot2].map((at, index) => ({
    id: asOfficialMatchSlotId(`official-match-${index + 1}`),
    encounterId,
    organizationId,
    competitionId,
    slot: index === 0 ? 1 : 2,
    status: "scheduled",
    scheduledStartAt: new Date(at),
    createdAt: new Date(D0),
  }));
  const events: DomainEvent[] = [];
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

  let minimumNoticeHours = 12;
  const protectedScopes: RescheduleScope[] = [];
  let allowRescheduling = options.allowRescheduling ?? true;
  let sequence = 0;
  let now = new Date("2026-10-01T12:00:00.000Z");
  const encounters = {
    findById: async (id: EncounterId) => (id === encounterId ? snapshot : null),
    upsert: async (next: EncounterScheduleSnapshot) => {
      snapshot = next;
      return next;
    },
    deleteByEncounterIds: async () => undefined,
    findNextUpcomingByTeamIds: async () => null,
  };
  const deps = {
    authorization: grants,
    clock: { now: () => new Date(now) },
    editGuard: {
      canRequestScheduleChange: async (input: { readonly scope: RescheduleScope }) =>
        !protectedScopes.some((scope) => JSON.stringify(scope) === JSON.stringify(input.scope)),
    },
    encounters,
    ids: { generate: () => `id-${++sequence}` },
    matches: {
      listByEncounter: async () => slots,
      saveSchedules: async (saved: readonly OfficialMatch[]) => {
        slots = slots.map((row) => saved.find((match) => match.slot === row.slot) ?? row);
      },
    },
    fixtures: { listActive: async () => [], updateEncounter: async () => null },
    eventPublisher: {
      publish: async (event: DomainEvent) => {
        events.push(event);
      },
      publishMany: async () => undefined,
    },
    mutationLock: { runExclusive: <T>(_id: EncounterId, run: () => Promise<T>) => run() },
    requests,
    rules: {
      getRules: async () => ({
        allowRescheduling,
        maxReschedulesPerTeam: options.maxReschedulesPerTeam ?? 2,
        minimumNoticeHours,
        proposalExpiryHours: options.proposalExpiryHours ?? 12,
        ...approvals,
      }),
      countAppliedReschedules: async (input: { readonly teamId: TeamId }) =>
        [...requests.rows.values()].filter(
          (row) => row.application !== null && row.requestingTeamId === input.teamId,
        ).length,
    },
    timeZones: { getTimeZone: async () => "America/Lima" },
    transaction: { runInTransaction: <T>(run: () => Promise<T>) => run() },
  };
  const create = new CreateScheduleChangeRequestUseCase(deps);
  const accept = new AcceptScheduleChangeProposalUseCase(deps);
  const reject = new RejectScheduleChangeProposalUseCase(deps);
  const counter = new CounterScheduleChangeProposalUseCase(deps);
  const list = new ListScheduleChangeRequestsUseCase(deps);
  const get = new GetScheduleChangeRequestUseCase(deps);
  const expire = new ExpireScheduleChangeProposalUseCase(deps);
  const resolve = new ResolveScheduleChangeRequestUseCase(deps);
  const target = { organizationId, competitionId, encounterId };

  return {
    grants,
    setClock(instant: string) {
      now = new Date(instant);
    },
    setNotice(hours: number) {
      minimumNoticeHours = hours;
    },
    createAt(instant: string, scope: RescheduleScope = { type: "entire_encounter" }) {
      return create.execute({
        ...target,
        actorId: captainA,
        requestingTeamId: teamA,
        scope,
        proposedWallTime: limaWallTime(instant),
        timeZone: "America/Lima",
        reason: "Travel conflict",
        idempotencyKey: "create-1",
      });
    },
    async counterAt(
      instant: string,
      at: { proposalId: string; version: number },
      commandKey = "counter-notice",
    ) {
      return counter.execute({
        ...target,
        actorId: captainB,
        teamId: teamB,
        requestId:
          (await requests.findByIdempotencyKey(organizationId, "create-1"))?.id ?? "missing",
        ...at,
        expectedVersion: at.version,
        commandKey,
        proposedWallTime: limaWallTime(instant),
        timeZone: "America/Lima",
        reason: "Stadium unavailable",
      });
    },
    allRequests: async () =>
      unwrap(await list.execute({ ...target, actorId: organizer })).requests.map(
        (view) => view.request,
      ),
    listAs: async (actorId: ActorId) => unwrap(await list.execute({ ...target, actorId })),
    getAs: async (actorId: ActorId, requestId = "id-1") =>
      unwrap(await get.execute({ ...target, actorId, requestId })),
    expire: () =>
      expire.execute({ organizationId, encounterId, requestId: "id-1", actorId: organizer }),
    keepSchedule(actorId: ActorId, at: { proposalId: string; version: number }) {
      return resolve.execute({
        ...target,
        actorId,
        requestId: "id-1",
        proposalId: at.proposalId,
        expectedVersion: at.version,
        commandKey: `resolve-${actorId}`,
        resolution: { outcome: "schedule_kept", reason: "Keep the fixture" },
      });
    },
    setRescheduling(allowed: boolean) {
      allowRescheduling = allowed;
    },
    protectScope(scope: RescheduleScope) {
      protectedScopes.push(scope);
    },
    appliedCount: () => deps.rules.countAppliedReschedules({ teamId: teamA }),
    allEvents: () => events,
    advanceClock(ms: number) {
      now = new Date(now.getTime() + ms);
    },
    async propose(
      day = 11,
      at: { readonly hour?: number; readonly scope?: RescheduleScope; readonly key?: string } = {},
    ): Promise<ScheduleChangeRequest> {
      const created = await create.execute({
        ...target,
        actorId: captainA,
        requestingTeamId: teamA,
        scope: at.scope ?? { type: "entire_encounter" },
        proposedWallTime: limaThreePm(day, at.hour),
        timeZone: "America/Lima",
        reason: "Travel conflict",
        idempotencyKey: at.key ?? "create-1",
      });
      return unwrap(created);
    },
    accept(
      actorId: ActorId,
      responder: ScheduleChangeResponder,
      at: { proposalId: string; version: number },
      commandKey = `accept-${actorId}-${at.proposalId}`,
      requestId = "id-1",
    ) {
      return accept.execute({
        ...target,
        actorId,
        responder,
        requestId,
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
      const [view] = listed.requests;
      if (!view) throw new Error("request missing");
      return view.request;
    },
    receipts: () => requests.receipts,
    encounterStart: async () =>
      (await encounters.findById(encounterId))?.scheduledStartAt.toISOString(),
    slotStarts: () =>
      slots.map((row) => ({
        slot: row.slot,
        at: row.scheduledStartAt.toISOString(),
        status: row.status,
      })),
    rescheduled: () =>
      events.filter((event) => event.eventName === "scheduling.encounter-rescheduled"),
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

  it("replays the outcome the command produced, not a later transition", async () => {
    const flow = negotiation({ requiresOpponentApproval: true, requiresOrganizerApproval: true });
    const created = await flow.propose(11);
    const d1 = created.proposals[0].id;
    const organizerConsent = unwrap(
      await flow.accept(organizer, asOrganizer, { proposalId: d1, version: 1 }, "organizer-1"),
    );
    const countered = unwrap(
      await flow.counter(captainB, teamB, { proposalId: d1, version: 2 }, 12, "counter-1"),
    );
    const d2 = countered.request.proposals[1]?.id ?? "missing";
    unwrap(await flow.accept(captainA, asRival(teamA), { proposalId: d2, version: 3 }));
    unwrap(await flow.accept(organizer, asOrganizer, { proposalId: d2, version: 4 }));
    expect((await flow.stored()).status).toBe("accepted");

    const consentReplay = unwrap(
      await flow.accept(organizer, asOrganizer, { proposalId: d1, version: 1 }, "organizer-1"),
    );
    expect(consentReplay.replayed).toBe(true);
    expect(history(consentReplay.request)).toEqual(history(organizerConsent.request));
    expect(history(consentReplay.request)).toMatchObject({ status: "open", version: 2 });

    const counterReplay = unwrap(
      await flow.counter(captainB, teamB, { proposalId: d1, version: 2 }, 12, "counter-1"),
    );
    expect(history(counterReplay.request)).toEqual(history(countered.request));
    expect(counterReplay.request.updatedAt).toEqual(countered.request.updatedAt);
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
  describe("applying the accepted schedule", () => {
    const slot2At = "2026-10-10T21:00:00.000Z";
    const slot2Moved = "2026-10-11T21:00:00.000Z";

    it("moves D0 to D1 once with the consent that completes the approvals; replay keeps the counts", async () => {
      const flow = negotiation();
      const created = await flow.propose(11);
      const proposalId = created.proposals[0].id;

      const accepted = unwrap(
        await flow.accept(captainB, asRival(teamB), { proposalId, version: 1 }),
      );

      expect(await flow.encounterStart()).toBe(D1);
      expect(flow.slotStarts()).toEqual([
        { slot: 1, at: D1, status: "scheduled" },
        { slot: 2, at: D1, status: "scheduled" },
      ]);
      expect((await flow.stored()).application).toEqual({
        id: accepted.request.application?.id,
        proposalId,
        requestVersion: 2,
        appliedByActorId: captainB,
        previousEncounterStartAt: new Date(D0),
        appliedEncounterStartAt: new Date(D1),
        slots: [
          { slot: 1, previousStartAt: new Date(D0), appliedStartAt: new Date(D1) },
          { slot: 2, previousStartAt: new Date(D0), appliedStartAt: new Date(D1) },
        ],
        appliedAt: new Date("2026-10-01T12:00:00.000Z"),
      });
      expect(flow.rescheduled().map((event) => event.payload)).toEqual([
        {
          encounterId,
          previousStartAt: D0,
          newStartAt: D1,
          scope: { type: "entire_encounter" },
          approvedBy: captainB,
        },
      ]);

      flow.advanceClock(60_000);
      const replay = unwrap(
        await flow.accept(captainB, asRival(teamB), { proposalId, version: 1 }),
      );
      expect(replay.replayed).toBe(true);
      expect(replay.request.application).toEqual(accepted.request.application);
      expect(flow.receipts()).toHaveLength(1);
      expect(flow.rescheduled()).toHaveLength(1);
      expect(await flow.encounterStart()).toBe(D1);
    });

    it("moves only slot 2 for an official_match request on slot 2", async () => {
      const flow = negotiation(OPPONENT_ONLY, { slots: [D0, slot2At] });
      const created = await flow.propose(11, {
        hour: 16,
        scope: { type: "official_match", officialSlot: 2 },
      });

      unwrap(
        await flow.accept(captainB, asRival(teamB), {
          proposalId: created.proposals[0].id,
          version: 1,
        }),
      );

      expect(flow.slotStarts()).toEqual([
        { slot: 1, at: D0, status: "scheduled" },
        { slot: 2, at: slot2Moved, status: "scheduled" },
      ]);
      expect(await flow.encounterStart()).toBe(D0);
      expect((await flow.stored()).application?.slots).toEqual([
        { slot: 2, previousStartAt: new Date(slot2At), appliedStartAt: new Date(slot2Moved) },
      ]);
    });

    it("moves every slot by the same delta for an entire_encounter request", async () => {
      const flow = negotiation(OPPONENT_ONLY, { slots: [D0, slot2At] });
      const created = await flow.propose(11);

      unwrap(
        await flow.accept(captainB, asRival(teamB), {
          proposalId: created.proposals[0].id,
          version: 1,
        }),
      );

      expect(flow.slotStarts()).toEqual([
        { slot: 1, at: D1, status: "scheduled" },
        { slot: 2, at: slot2Moved, status: "scheduled" },
      ]);
      expect(await flow.encounterStart()).toBe(D1);
    });

    it("keeps D0 until every required authority consents to the current proposal", async () => {
      const flow = negotiation({ requiresOpponentApproval: true, requiresOrganizerApproval: true });
      const created = await flow.propose(11);
      const d1 = created.proposals[0].id;

      unwrap(await flow.accept(organizer, asOrganizer, { proposalId: d1, version: 1 }));
      expect(await flow.encounterStart()).toBe(D0);

      const countered = unwrap(
        await flow.counter(captainB, teamB, { proposalId: d1, version: 2 }, 12),
      );
      const d2 = countered.request.proposals[1]?.id ?? "missing";
      // The organizer consented to D1 only, so the rival's consent to D2 is not enough.
      unwrap(await flow.accept(captainA, asRival(teamA), { proposalId: d2, version: 3 }));
      expect(await flow.encounterStart()).toBe(D0);
      expect((await flow.stored()).application).toBeNull();

      unwrap(await flow.accept(organizer, asOrganizer, { proposalId: d2, version: 4 }));
      expect(await flow.encounterStart()).toBe(D2);
      expect((await flow.stored()).application?.proposalId).toBe(d2);
    });

    it("refuses the consent that would exceed the quota and leaves that request open", async () => {
      const flow = negotiation(OPPONENT_ONLY, { maxReschedulesPerTeam: 1 });
      const slot1 = await flow.propose(11, {
        scope: { type: "official_match", officialSlot: 1 },
        key: "slot-1",
      });
      const slot2 = await flow.propose(12, {
        scope: { type: "official_match", officialSlot: 2 },
        key: "slot-2",
      });

      const first = await flow.accept(
        captainB,
        asRival(teamB),
        { proposalId: slot1.proposals[0].id, version: 1 },
        "accept-slot-1",
        slot1.id,
      );
      const second = await flow.accept(
        captainB,
        asRival(teamB),
        { proposalId: slot2.proposals[0].id, version: 1 },
        "accept-slot-2",
        slot2.id,
      );

      expect(first.isOk()).toBe(true);
      expect(errorCode(second)).toBe("scheduling.reschedule_limit_reached");
      expect(flow.slotStarts().map((row) => row.at)).toEqual([D1, D0]);
      expect(flow.receipts().map((receipt) => receipt.commandKey)).toEqual(["accept-slot-1"]);
    });

    it("does not apply a proposal whose start has already passed", async () => {
      const flow = negotiation();
      flow.setNotice(0);
      flow.advanceClock(
        Date.parse("2026-10-11T19:00:00.000Z") - Date.parse("2026-10-01T12:00:00.000Z"),
      );
      const created = await flow.propose(11);
      flow.advanceClock(3_600_000);

      const late = await flow.accept(captainB, asRival(teamB), {
        proposalId: created.proposals[0].id,
        version: 1,
      });

      expect(errorCode(late)).toBe("scheduling.invalid_schedule_change_date");
      expect(await flow.encounterStart()).toBe(D0);
      expect((await flow.stored()).status).toBe("open");
    });
  });
});

function limaWallTime(instant: string) {
  const local = new Date(Date.parse(instant) - 5 * 3_600_000);
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth() + 1,
    day: local.getUTCDate(),
    hour: local.getUTCHours(),
    minute: local.getUTCMinutes(),
    second: local.getUTCSeconds(),
  };
}

describe("minimum reschedule notice — validated V6 behavior", () => {
  const boundary = "2026-10-13T08:00:00.000Z";
  const before = "2026-10-13T07:59:59.999Z";
  const after = "2026-10-13T08:00:00.001Z";
  const current = "2026-10-13T20:00:00.000Z";
  const currentFar = "2026-10-20T20:00:00.000Z";
  const proposedFar = "2026-10-20T21:00:00.000Z";
  const near = "2026-10-13T09:00:00.000Z";
  const past = "2026-10-13T07:00:00.000Z";
  const flowAt = (currentAt: string, now = boundary, approvals = OPPONENT_ONLY) => {
    const flow = negotiation(approvals, { slots: [currentAt, currentAt], proposalExpiryHours: 72 });
    flow.setClock(now);
    return flow;
  };
  const targetOf = (request: ScheduleChangeRequest) => ({
    proposalId: request.proposals.at(-1)!.id,
    version: request.version,
  });
  const observe = async (flow: ReturnType<typeof negotiation>) => ({
    requests: await flow.allRequests(),
    slots: flow.slotStarts(),
    encounter: await flow.encounterStart(),
    receipts: [...flow.receipts()],
    events: [...flow.allEvents()],
    quota: await flow.appliedCount(),
  });
  const noticeError = <T>(result: Result<T, { code: string }>, anchor: string) => {
    expect(result.isErr() ? result.error : null).toMatchObject({
      code: "scheduling.reschedule_notice_not_met",
      anchor,
    });
  };

  it.each([
    ["V6-01", before, current, proposedFar, 12, null],
    ["V6-02", boundary, current, proposedFar, 12, null],
    ["V6-03", after, current, proposedFar, 12, "current"],
    ["V6-04", before, currentFar, current, 12, null],
    ["V6-05", boundary, currentFar, current, 12, null],
    ["V6-06", after, currentFar, current, 12, "proposed"],
    ["V6-07", boundary, currentFar, near, 12, "proposed"],
    ["V6-08", boundary, near, proposedFar, 12, "current"],
    ["V6-09", boundary, near, "2026-10-13T09:30:00.000Z", 12, "current"],
    ["V6-10", boundary, near, proposedFar, 0, null],
    ["V6-24", boundary, past, "2026-10-13T21:00:00.000Z", 12, null],
    ["V6-25", boundary, past, near, 12, "proposed"],
    ["C2 current equals now", boundary, boundary, current, 12, null],
  ] as const)(
    "%s creates only when both applicable anchors meet notice",
    async (_id, now, actual, proposed, hours, anchor) => {
      const flow = flowAt(actual, now);
      flow.setNotice(hours);
      const prior = await observe(flow);
      const result = await flow.createAt(proposed);
      if (anchor) {
        noticeError(result, anchor);
        expect(await observe(flow)).toEqual(prior);
        expect(await flow.allRequests()).toEqual([]);
      } else {
        const request = unwrap(result);
        expect(history(request)).toMatchObject({
          status: "open",
          version: 1,
          proposals: [{ at: proposed, team: "team-a", reason: "Travel conflict" }],
          decisions: [],
        });
        expect((await flow.stored()).proposals[0].proposedStartAt.toISOString()).toBe(proposed);
        expect(flow.slotStarts()).toEqual([
          { slot: 1, at: actual, status: "scheduled" },
          { slot: 2, at: actual, status: "scheduled" },
        ]);
        expect(await flow.encounterStart()).toBe(actual);
        expect(await flow.appliedCount()).toBe(0);
      }
    },
  );

  it("V6-11 preserves the one-millisecond future boundary with notice disabled", async () => {
    const request = unwrap(
      createInitialScheduleChangeRequest({
        requestId: "request-ms",
        proposalId: "proposal-ms",
        organizationId,
        competitionId,
        encounterId,
        homeTeamId: teamA,
        awayTeamId: teamB,
        officialMatchCount: 2,
        currentStartAt: new Date(currentFar),
        requestingTeamId: teamA,
        initiatedByActorId: captainA,
        scope: { type: "entire_encounter" },
        proposedStartAt: new Date("2026-10-13T08:00:00.001Z"),
        reason: "Travel conflict",
        idempotencyKey: "ms",
        now: new Date(boundary),
      }),
    );
    expect(request.status).toBe("open");
    expect(request.proposals[0].proposedStartAt.toISOString()).toBe("2026-10-13T08:00:00.001Z");
    // Wall-time input has whole-second precision; shift both instants 1 ms for the use-case neighbor.
    const flow = flowAt(currentFar, before);
    flow.setNotice(0);
    unwrap(await flow.createAt(boundary));
    expect((await flow.stored()).proposals[0].proposedStartAt.toISOString()).toBe(boundary);
    expect(await flow.encounterStart()).toBe(currentFar);
  });

  it("V6-12 keeps strict future validation when notice is disabled", async () => {
    const flow = flowAt(currentFar);
    flow.setNotice(0);
    const prior = await observe(flow);
    expect(errorCode(await flow.createAt(boundary))).toBe(
      "scheduling.invalid_schedule_change_date",
    );
    expect(await observe(flow)).toEqual(prior);
  });

  it("V6-13 replaces the current proposal at the inclusive limit and requires fresh consents", async () => {
    const flow = flowAt(current, before, {
      requiresOpponentApproval: true,
      requiresOrganizerApproval: true,
    });
    const created = unwrap(await flow.createAt("2026-10-19T20:00:00.000Z"));
    const consent = unwrap(await flow.accept(organizer, asOrganizer, targetOf(created)));
    flow.setClock(boundary);
    const countered = unwrap(await flow.counterAt(proposedFar, targetOf(consent.request)));
    expect(history(countered.request)).toMatchObject({
      status: "open",
      version: 3,
      proposals: [{ at: "2026-10-19T20:00:00.000Z" }, { at: proposedFar }],
      decisions: [{ authority: "organizer", requestVersion: 1, kind: "consent" }],
    });
    const rival = unwrap(await flow.accept(captainA, asRival(teamA), targetOf(countered.request)));
    expect(rival.request.status).toBe("open");
    expect(await flow.encounterStart()).toBe(current);
    const completed = unwrap(await flow.accept(organizer, asOrganizer, targetOf(rival.request)));
    expect(completed.request.status).toBe("accepted");
    expect(await flow.encounterStart()).toBe(proposedFar);
  });

  it.each([
    ["V6-14", currentFar, near, "proposed"],
    ["V6-15", near, proposedFar, "current"],
  ] as const)(
    "%s preserves the prior proposal and all effects on denied counter",
    async (_id, actual, proposed, anchor) => {
      const flow = flowAt(actual, "2026-10-12T08:00:00.000Z");
      const created = unwrap(await flow.createAt("2026-10-19T20:00:00.000Z"));
      flow.setClock(boundary);
      const prior = await observe(flow);
      noticeError(await flow.counterAt(proposed, targetOf(created)), anchor);
      expect(await observe(flow)).toEqual(prior);
      expect(history(await flow.stored())).toMatchObject({
        status: "open",
        version: 1,
        proposals: [{ at: "2026-10-19T20:00:00.000Z" }],
        decisions: [],
      });
    },
  );

  it.each([
    ["V6-16", current, proposedFar, before, 12, null],
    ["V6-17", current, proposedFar, boundary, 12, null],
    ["V6-18", current, proposedFar, after, 12, "current"],
    ["V6-19", currentFar, current, after, 12, "proposed"],
    ["V6-26", "2026-10-14T02:00:00.000Z", proposedFar, boundary, 24, "current"],
    ["V6-27", "2026-10-14T02:00:00.000Z", proposedFar, boundary, 0, null],
  ] as const)(
    "%s revalidates current clock and rules before the last consent",
    async (_id, actual, proposed, now, hours, anchor) => {
      const flow = flowAt(actual, before);
      const created = unwrap(await flow.createAt(proposed));
      flow.setClock(now);
      flow.setNotice(hours);
      const prior = await observe(flow);
      const result = await flow.accept(captainB, asRival(teamB), targetOf(created));
      if (anchor) {
        noticeError(result, anchor);
        expect(await observe(flow)).toEqual(prior);
        expect(history(await flow.stored())).toMatchObject({
          status: "open",
          version: 1,
          decisions: [],
        });
      } else {
        expect(unwrap(result).request.status).toBe("accepted");
        expect((await flow.stored()).status).toBe("accepted");
        expect(await flow.encounterStart()).toBe(proposed);
        expect(flow.slotStarts()).toEqual([
          { slot: 1, at: proposed, status: "scheduled" },
          { slot: 2, at: proposed, status: "scheduled" },
        ]);
        expect(await flow.appliedCount()).toBe(1);
        expect(flow.rescheduled().map((e) => e.payload)).toEqual([
          {
            encounterId: "encounter-1",
            previousStartAt: actual,
            newStartAt: proposed,
            scope: { type: "entire_encounter" },
            approvedBy: "captain-b",
          },
        ]);
      }
    },
  );

  it("V6-20 rejects inside the notice window without applying or consuming quota", async () => {
    const flow = flowAt(near, "2026-10-12T08:00:00.000Z");
    const created = unwrap(await flow.createAt(proposedFar));
    flow.setClock(boundary);
    expect(
      unwrap(await flow.reject(captainB, asRival(teamB), targetOf(created))).request.status,
    ).toBe("rejected");
    expect((await flow.stored()).status).toBe("rejected");
    expect(await flow.encounterStart()).toBe(near);
    expect(await flow.appliedCount()).toBe(0);
    expect(flow.rescheduled()).toEqual([]);
  });

  it.each([
    ["V6-21", { type: "official_match", officialSlot: 2 }, null],
    ["V6-22", { type: "entire_encounter" }, "current"],
    ["V6-23", { type: "official_match", officialSlot: 1 }, "current"],
  ] as const)("%s checks exactly the slots affected by the scope", async (_id, scope, anchor) => {
    const flow = negotiation(OPPONENT_ONLY, { slots: [near, current] });
    flow.setClock(boundary);
    const prior = await observe(flow);
    const result = await flow.createAt(proposedFar, scope);
    if (anchor) {
      noticeError(result, anchor);
      expect(await observe(flow)).toEqual(prior);
    } else {
      const created = unwrap(result);
      expect(created.status).toBe("open");
      unwrap(await flow.accept(captainB, asRival(teamB), targetOf(created)));
      expect(flow.slotStarts()).toEqual([
        { slot: 1, at: near, status: "scheduled" },
        { slot: 2, at: proposedFar, status: "scheduled" },
      ]);
      expect(await flow.encounterStart()).toBe(near);
    }
  });

  it("V6-28 reports invalid date before notice when the accepted proposal equals now", async () => {
    const flow = flowAt(currentFar, before);
    const created = unwrap(await flow.createAt(current));
    flow.setClock(current);
    const prior = await observe(flow);
    expect(errorCode(await flow.accept(captainB, asRival(teamB), targetOf(created)))).toBe(
      "scheduling.invalid_schedule_change_date",
    );
    expect(await observe(flow)).toEqual(prior);
  });

  it.each([captainB, organizer])(
    "revalidates even the first consent by %s and never bypasses organizer notice",
    async (actor) => {
      const flow = flowAt(current, before, {
        requiresOpponentApproval: true,
        requiresOrganizerApproval: true,
      });
      const created = unwrap(await flow.createAt(proposedFar));
      flow.setClock(after);
      const prior = await observe(flow);
      const responder = actor === organizer ? asOrganizer : asRival(teamB);
      noticeError(await flow.accept(actor, responder, targetOf(created)), "current");
      expect(await observe(flow)).toEqual(prior);
      flow.setNotice(0);
      expect(unwrap(await flow.accept(actor, responder, targetOf(created))).request.status).toBe(
        "open",
      );
      expect(history(await flow.stored()).decisions).toEqual([
        {
          proposalId: created.proposals[0].id,
          requestVersion: 1,
          kind: "consent",
          authority: responder.authority,
          actorId: actor,
        },
      ]);
    },
  );

  it("retries denied creation and counter with the newly read notice rule", async () => {
    const flow = flowAt(near);
    const prior = await observe(flow);
    noticeError(await flow.createAt(proposedFar), "current");
    expect(await observe(flow)).toEqual(prior);
    flow.setNotice(0);
    const created = unwrap(await flow.createAt(proposedFar));
    expect(created.status).toBe("open");
    flow.setNotice(12);
    const beforeCounter = await observe(flow);
    noticeError(await flow.counterAt("2026-10-21T21:00:00.000Z", targetOf(created)), "current");
    expect(await observe(flow)).toEqual(beforeCounter);
    flow.setNotice(0);
    const countered = unwrap(await flow.counterAt("2026-10-21T21:00:00.000Z", targetOf(created)));
    expect(history(countered.request)).toMatchObject({
      status: "open",
      version: 2,
      proposals: [{ at: "2026-10-20T21:00:00.000Z" }, { at: "2026-10-21T21:00:00.000Z" }],
      decisions: [],
    });
    expect(await flow.encounterStart()).toBe("2026-10-13T09:00:00.000Z");
    expect(await flow.appliedCount()).toBe(0);
  });

  it("checks every future slot when the Encounter's earliest slot is already past", async () => {
    const blocked = negotiation(OPPONENT_ONLY, { slots: [past, near] });
    blocked.setClock(boundary);
    const prior = await observe(blocked);
    noticeError(await blocked.createAt(proposedFar), "current");
    expect(await observe(blocked)).toEqual(prior);
    const allowed = negotiation(OPPONENT_ONLY, { slots: [past, current] });
    allowed.setClock(boundary);
    const created = unwrap(await allowed.createAt(proposedFar));
    expect(created.status).toBe("open");
    expect(
      unwrap(await allowed.accept(captainB, asRival(teamB), targetOf(created))).request.status,
    ).toBe("accepted");
    expect(allowed.slotStarts()).toEqual([
      { slot: 1, at: "2026-10-20T21:00:00.000Z", status: "scheduled" },
      { slot: 2, at: "2026-10-21T10:00:00.000Z", status: "scheduled" },
    ]);
  });

  it("counter checks the new proposal after the old proposal enters the notice window", async () => {
    const flow = flowAt(currentFar, before);
    const created = unwrap(await flow.createAt(current));
    flow.setClock(after);
    const countered = unwrap(await flow.counterAt(proposedFar, targetOf(created)));
    expect(history(countered.request)).toMatchObject({
      status: "open",
      version: 2,
      proposals: [{ at: "2026-10-13T20:00:00.000Z" }, { at: "2026-10-20T21:00:00.000Z" }],
      decisions: [],
    });
    expect(await flow.encounterStart()).toBe("2026-10-20T20:00:00.000Z");
  });

  it("replays saved create, counter and consent after notice closes without new effects", async () => {
    const flow = flowAt(current, before, {
      requiresOpponentApproval: true,
      requiresOrganizerApproval: true,
    });
    const created = unwrap(await flow.createAt("2026-10-19T20:00:00.000Z"));
    const countered = unwrap(await flow.counterAt(proposedFar, targetOf(created)));
    const consent = unwrap(await flow.accept(organizer, asOrganizer, targetOf(countered.request)));
    flow.setClock(after);
    flow.setNotice(24);
    const prior = await observe(flow);
    expect(unwrap(await flow.createAt("2026-10-19T20:00:00.000Z")).id).toBe(created.id);
    const counterReplay = unwrap(await flow.counterAt(proposedFar, targetOf(created)));
    expect(counterReplay.replayed).toBe(true);
    expect(history(counterReplay.request)).toMatchObject({
      status: "open",
      version: 2,
      decisions: [],
      proposals: [{ at: "2026-10-19T20:00:00.000Z" }, { at: proposedFar }],
    });
    const replay = unwrap(await flow.accept(organizer, asOrganizer, targetOf(countered.request)));
    expect(replay.replayed).toBe(true);
    expect(replay.receipt.id).toBe(consent.receipt.id);
    expect(history(replay.request)).toMatchObject({
      status: "open",
      version: 3,
      decisions: [{ kind: "consent", authority: "organizer", requestVersion: 2 }],
    });
    expect(await observe(flow)).toEqual(prior);
  });
});

describe("what each actor may do with a schedule change", () => {
  const spectator = asActorId("spectator-1");
  const staff = asActorId("staff-1");
  const DEADLINE = "2026-10-02T00:00:00.000Z";
  const every = (reason: string) =>
    (["accept", "reject", "counter"] as const).map((action) => ({ action, reason }));
  const firstProposal = (request: ScheduleChangeRequest) => ({
    proposalId: request.proposals[0].id,
    version: request.version,
  });

  /** Staff that resolves and approves for the organizer without speaking for any Team. */
  function withObservers(flow: ReturnType<typeof negotiation>) {
    flow.grants.allow(spectator, ENCOUNTER_PERMISSION.read);
    flow.grants.allow(staff, ENCOUNTER_PERMISSION.read);
    flow.grants.allow(staff, ENCOUNTER_PERMISSION.rescheduleResolve);
    return flow;
  }

  async function capabilitiesOf(flow: ReturnType<typeof negotiation>, actorId: ActorId) {
    const listed = await flow.listAs(actorId);
    const fetched = await flow.getAs(actorId);
    expect(listed.requests.map((view) => view.capabilities)).toEqual([fetched.capabilities]);
    return fetched.capabilities;
  }

  it("offers the rival captain every response until the deadline and none from it", async () => {
    const flow = negotiation();
    const created = await flow.propose(11);
    flow.setClock("2026-10-01T23:59:59.999Z");

    expect(await capabilitiesOf(flow, captainB)).toEqual({
      allowedActions: ["accept", "reject", "counter"],
      respondAs: { authority: "rival_team", teamId: teamB },
      blockedActions: [],
    });

    flow.setClock(DEADLINE);
    expect((await flow.stored()).status).toBe("open");
    expect(await capabilitiesOf(flow, captainB)).toEqual({
      allowedActions: [],
      respondAs: null,
      blockedActions: every("response_window_closed"),
    });
    expect(errorCode(await flow.accept(captainB, asRival(teamB), firstProposal(created)))).toBe(
      "scheduling.schedule_change_response_window_closed",
    );

    flow.setClock("2026-10-01T23:59:59.999Z");
    expect(
      unwrap(await flow.accept(captainB, asRival(teamB), firstProposal(created))).request.status,
    ).toBe("accepted");
  });

  it("blocks the proposing captain as its own rival and a reader as lacking permission", async () => {
    const flow = withObservers(negotiation());
    const created = await flow.propose(11);

    expect(await capabilitiesOf(flow, captainA)).toEqual({
      allowedActions: [],
      respondAs: null,
      blockedActions: every("own_proposal"),
    });
    expect(errorCode(await flow.counter(captainA, teamA, firstProposal(created), 12))).toBe(
      "scheduling.schedule_change_self_response_forbidden",
    );

    expect(await capabilitiesOf(flow, spectator)).toEqual({
      allowedActions: [],
      respondAs: null,
      blockedActions: every("permission"),
    });
    expect(errorCode(await flow.reject(spectator, asRival(teamB), firstProposal(created)))).toBe(
      "authorization.forbidden",
    );
  });

  it("hands the responses to the original requester once the rival counters", async () => {
    const flow = negotiation();
    const created = await flow.propose(11);
    unwrap(await flow.counter(captainB, teamB, firstProposal(created), 12));

    expect(await capabilitiesOf(flow, captainA)).toEqual({
      allowedActions: ["accept", "reject", "counter"],
      respondAs: { authority: "rival_team", teamId: teamA },
      blockedActions: [],
    });
    expect(await capabilitiesOf(flow, captainB)).toEqual({
      allowedActions: [],
      respondAs: null,
      blockedActions: every("own_proposal"),
    });
  });

  it("keeps reject available when an approved result protects the requested scope", async () => {
    const flow = negotiation();
    const created = await flow.propose(11);
    flow.protectScope({ type: "entire_encounter" });

    expect(await capabilitiesOf(flow, captainB)).toEqual({
      allowedActions: ["reject"],
      respondAs: { authority: "rival_team", teamId: teamB },
      blockedActions: [
        { action: "accept", reason: "result_protected" },
        { action: "counter", reason: "result_protected" },
      ],
    });
    expect(errorCode(await flow.accept(captainB, asRival(teamB), firstProposal(created)))).toBe(
      "scheduling.encounter_not_editable_for_schedule_change",
    );
    expect(
      unwrap(await flow.reject(captainB, asRival(teamB), firstProposal(created))).request.status,
    ).toBe("rejected");
  });

  it("blocks accept and counter while rescheduling is disabled, but not reject", async () => {
    const flow = negotiation();
    const created = await flow.propose(11);
    flow.setRescheduling(false);

    expect(await capabilitiesOf(flow, captainB)).toEqual({
      allowedActions: ["reject"],
      respondAs: { authority: "rival_team", teamId: teamB },
      blockedActions: [
        { action: "accept", reason: "rescheduling_disabled" },
        { action: "counter", reason: "rescheduling_disabled" },
      ],
    });
    expect(errorCode(await flow.counter(captainB, teamB, firstProposal(created), 12))).toBe(
      "scheduling.rescheduling_disabled",
    );
    expect(
      unwrap(await flow.reject(captainB, asRival(teamB), firstProposal(created))).request.status,
    ).toBe("rejected");
  });

  it("lets organizer staff approve only when the competition requires it", async () => {
    const opponentOnly = withObservers(negotiation());
    await opponentOnly.propose(11);
    expect(await capabilitiesOf(opponentOnly, staff)).toEqual({
      allowedActions: [],
      respondAs: null,
      blockedActions: every("permission"),
    });

    const organizerOnly = withObservers(
      negotiation({ requiresOpponentApproval: false, requiresOrganizerApproval: true }),
    );
    const created = await organizerOnly.propose(11);
    expect(await capabilitiesOf(organizerOnly, staff)).toEqual({
      allowedActions: ["accept", "reject"],
      respondAs: { authority: "organizer" },
      blockedActions: [{ action: "counter", reason: "permission" }],
    });
    expect(await capabilitiesOf(organizerOnly, captainB)).toEqual({
      allowedActions: ["counter"],
      respondAs: null,
      blockedActions: [
        { action: "accept", reason: "permission" },
        { action: "reject", reason: "permission" },
      ],
    });
    expect(
      unwrap(await organizerOnly.accept(staff, asOrganizer, firstProposal(created))).request.status,
    ).toBe("accepted");
  });

  it("blocks a second consent from the same authority and leaves the other one open", async () => {
    const flow = withObservers(
      negotiation({ requiresOpponentApproval: true, requiresOrganizerApproval: true }),
    );
    const created = await flow.propose(11);
    unwrap(await flow.accept(staff, asOrganizer, firstProposal(created)));
    const at = { proposalId: created.proposals[0].id, version: 2 };

    expect(await capabilitiesOf(flow, staff)).toEqual({
      allowedActions: ["reject"],
      respondAs: { authority: "organizer" },
      blockedActions: [
        { action: "accept", reason: "already_consented" },
        { action: "counter", reason: "permission" },
      ],
    });
    expect(errorCode(await flow.accept(staff, asOrganizer, at, "again"))).toBe(
      "scheduling.schedule_change_consent_already_recorded",
    );
    expect(await capabilitiesOf(flow, captainB)).toMatchObject({
      allowedActions: ["accept", "reject", "counter"],
    });
    expect(unwrap(await flow.accept(captainB, asRival(teamB), at)).request.status).toBe("accepted");
  });

  it("offers resolve to organizer staff once the request escalates, not before", async () => {
    const flow = withObservers(negotiation());
    const created = await flow.propose(11);
    expect((await capabilitiesOf(flow, staff)).allowedActions).toEqual([]);

    flow.setClock(DEADLINE);
    expect(unwrap(await flow.expire())).toEqual({ status: "escalated" });
    expect(await capabilitiesOf(flow, staff)).toEqual({
      allowedActions: ["resolve"],
      respondAs: null,
      blockedActions: every("request_closed"),
    });
    expect(await capabilitiesOf(flow, captainB)).toEqual({
      allowedActions: [],
      respondAs: null,
      blockedActions: every("request_closed"),
    });
    expect(
      unwrap(await flow.keepSchedule(staff, { proposalId: created.proposals[0].id, version: 2 }))
        .request.status,
    ).toBe("resolved_by_organizer");
  });

  describe("creating a request", () => {
    const SLOT_2 = "2026-10-10T21:00:00.000Z";

    it("offers the captain their Team and every scope with its current start", async () => {
      const flow = negotiation(OPPONENT_ONLY, { slots: [D0, SLOT_2] });

      expect((await flow.listAs(captainA)).creation).toEqual({
        blockedReason: null,
        teams: [{ teamId: teamA, blockedReason: null }],
        scopes: [
          {
            scope: { type: "entire_encounter" },
            currentStartAt: new Date(D0),
            blockedReason: null,
          },
          {
            scope: { type: "official_match", officialSlot: 1 },
            currentStartAt: new Date(D0),
            blockedReason: null,
          },
          {
            scope: { type: "official_match", officialSlot: 2 },
            currentStartAt: new Date(SLOT_2),
            blockedReason: null,
          },
        ],
      });
    });

    it("blocks the scopes an active slot-2 request overlaps and keeps slot 1 open", async () => {
      const flow = negotiation(OPPONENT_ONLY, { slots: [D0, SLOT_2] });
      await flow.propose(11, { scope: { type: "official_match", officialSlot: 2 } });

      expect(
        (await flow.listAs(captainB)).creation.scopes.map(({ scope, blockedReason }) => ({
          scope,
          blockedReason,
        })),
      ).toEqual([
        { scope: { type: "entire_encounter" }, blockedReason: "active_request_exists" },
        { scope: { type: "official_match", officialSlot: 1 }, blockedReason: null },
        {
          scope: { type: "official_match", officialSlot: 2 },
          blockedReason: "active_request_exists",
        },
      ]);
      await expect(
        flow.propose(12, { scope: { type: "official_match", officialSlot: 2 }, key: "again" }),
      ).rejects.toThrow("scheduling.active_schedule_change_request_exists");
      expect(
        (
          await flow.propose(12, {
            scope: { type: "official_match", officialSlot: 1 },
            key: "create-slot-1",
          })
        ).status,
      ).toBe("open");
    });

    it("marks a scope with an approved result as protected", async () => {
      const flow = negotiation(OPPONENT_ONLY, { slots: [D0, SLOT_2] });
      flow.protectScope({ type: "official_match", officialSlot: 1 });

      expect(
        (await flow.listAs(captainA)).creation.scopes.map((option) => option.blockedReason),
      ).toEqual([null, "result_protected", null]);
    });

    it("blocks a Team that used its reschedules and leaves the other Team free", async () => {
      const spent = negotiation(OPPONENT_ONLY, { maxReschedulesPerTeam: 0 });
      expect((await spent.listAs(captainA)).creation.teams).toEqual([
        { teamId: teamA, blockedReason: "limit_reached" },
      ]);
      expect(errorCode(await spent.createAt("2026-10-11T20:00:00.000Z"))).toBe(
        "scheduling.reschedule_limit_reached",
      );

      const fresh = negotiation(OPPONENT_ONLY, { maxReschedulesPerTeam: 1 });
      expect((await fresh.listAs(captainA)).creation.teams).toEqual([
        { teamId: teamA, blockedReason: null },
      ]);
    });

    it("blocks the whole form for a reader without a Team and while rescheduling is off", async () => {
      const flow = withObservers(negotiation());
      expect((await flow.listAs(spectator)).creation).toMatchObject({
        blockedReason: "permission",
        teams: [],
      });

      const disabled = negotiation(OPPONENT_ONLY, { allowRescheduling: false });
      expect((await disabled.listAs(captainA)).creation.blockedReason).toBe(
        "rescheduling_disabled",
      );
      expect(errorCode(await disabled.createAt("2026-10-11T20:00:00.000Z"))).toBe(
        "scheduling.rescheduling_disabled",
      );
    });
  });
});
