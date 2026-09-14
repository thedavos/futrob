import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  type AuthorizationPort,
  type DomainEvent,
  type EncounterId,
  type OrganizationId,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type { EncounterScheduleSnapshot } from "../domain/entities/encounter-schedule-snapshot.ts";
import type { ScheduleChangeRequest } from "../domain/entities/schedule-change-request.ts";
import {
  ActiveScheduleChangeRequestExists,
  EncounterNotEditableForScheduleChange,
  InvalidScheduleChangeDate,
  InvalidScheduleChangeReason,
  InvalidScheduleChangeRequest,
  InvalidScheduleChangeScope,
  RescheduleLimitReached,
  ReschedulingDisabled,
  ScheduleChangeRequestForbidden,
  ScheduleChangeRequestIdempotencyConflict,
  ScheduleChangeRequestNotFound,
} from "../domain/errors/schedule-change-request.errors.ts";
import type { CompetitionRescheduleRulesPort } from "../domain/ports/competition-reschedule-rules.port.ts";
import type { ScheduleChangeRequestRepository } from "../domain/ports/schedule-change-request.repository.ts";
import {
  CreateScheduleChangeRequestUseCase,
  type CreateScheduleChangeRequestInput,
} from "./create-schedule-change-request.use-case.ts";

const now = new Date("2026-09-14T20:00:00.000Z");
const organizationId = asOrganizationId("org-1");
const competitionId = asCompetitionId("competition-1");
const encounterId = asEncounterId("encounter-1");
const secondEncounterId = asEncounterId("encounter-2");
const homeTeamId = asTeamId("team-home");
const awayTeamId = asTeamId("team-away");
const actorId = asActorId("captain-1");

const encounter: EncounterScheduleSnapshot = {
  encounterId,
  organizationId,
  competitionId,
  homeTeamId,
  awayTeamId,
  scheduledStartAt: new Date("2026-09-20T20:00:00.000Z"),
  officialMatchCount: 2,
};

const validInput: CreateScheduleChangeRequestInput = {
  actorId,
  organizationId,
  competitionId,
  encounterId,
  requestingTeamId: homeTeamId,
  scope: { type: "entire_encounter" },
  proposedStartAt: new Date("2026-09-21T21:30:00.000Z"),
  reason: "  Team travel conflict  ",
  idempotencyKey: "idem-1",
};

class FakeEncounterSchedules {
  readonly rows = new Map<EncounterId, EncounterScheduleSnapshot>();

  constructor(initial: EncounterScheduleSnapshot | null = encounter) {
    if (initial) this.rows.set(initial.encounterId, initial);
  }

  async findById(id: EncounterId) {
    return this.rows.get(id) ?? null;
  }

  async upsert(snapshot: EncounterScheduleSnapshot) {
    this.rows.set(snapshot.encounterId, snapshot);
    return snapshot;
  }

  async deleteByEncounterIds(ids: readonly EncounterId[]) {
    for (const id of ids) this.rows.delete(id);
  }

  async findNextUpcomingByTeamIds() {
    return null;
  }
}

class FakeScheduleChangeRequests implements ScheduleChangeRequestRepository {
  readonly rows: ScheduleChangeRequest[] = [];

  async findByIdempotencyKey(orgId: OrganizationId, idempotencyKey: string) {
    return (
      this.rows.find(
        (request) => request.organizationId === orgId && request.idempotencyKey === idempotencyKey,
      ) ?? null
    );
  }

  async listActiveByEncounter(orgId: OrganizationId, targetEncounterId: EncounterId) {
    return this.rows.filter(
      (request) =>
        request.organizationId === orgId &&
        request.encounterId === targetEncounterId &&
        request.status === "open",
    );
  }

  async save(request: ScheduleChangeRequest) {
    this.rows.push(request);
    return request;
  }
}

class SerialEncounterMutationLock {
  private readonly tails = new Map<EncounterId, Promise<void>>();

  constructor(private readonly onAcquired: () => void = () => undefined) {}

  async runExclusive<T>(targetEncounterId: EncounterId, operation: () => Promise<T>): Promise<T> {
    const predecessor = this.tails.get(targetEncounterId) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    const tail = predecessor.then(() => released);
    this.tails.set(targetEncounterId, tail);

    await predecessor;
    try {
      this.onAcquired();
      return await operation();
    } finally {
      release();
      if (this.tails.get(targetEncounterId) === tail) {
        this.tails.delete(targetEncounterId);
      }
    }
  }
}

function authorization(allowed = true): AuthorizationPort {
  return {
    decide: async (request) => ({
      ...request,
      allowed,
      reason: allowed ? "allowed" : "denied",
    }),
    getEffectiveAccess: async (input) => ({ ...input, roles: [], permissions: [] }),
  };
}

function createHarness(
  options: {
    readonly allowed?: boolean;
    readonly canEdit?: boolean;
    readonly encounter?: EncounterScheduleSnapshot | null;
    readonly allowRescheduling?: boolean;
    readonly maxReschedulesPerTeam?: number;
    readonly appliedReschedules?: number;
    readonly appliedReschedulesByEncounter?: ReadonlyMap<EncounterId, number>;
    readonly encounterWhenLocked?: EncounterScheduleSnapshot | null;
    readonly failPublishingOnce?: boolean;
    readonly protectedOfficialSlots?: readonly (1 | 2)[];
  } = {},
) {
  const requests = new FakeScheduleChangeRequests();
  const encounters = new FakeEncounterSchedules(
    options.encounter === undefined ? encounter : options.encounter,
  );
  const events: DomainEvent[] = [];
  const protectedOfficialSlots = options.protectedOfficialSlots ?? [];
  let failPublishing = options.failPublishingOnce ?? false;
  const rules: CompetitionRescheduleRulesPort = {
    getRules: async () => ({
      allowRescheduling: options.allowRescheduling ?? true,
      maxReschedulesPerTeam: options.maxReschedulesPerTeam ?? 2,
    }),
    countAppliedReschedules: async (input) =>
      options.appliedReschedulesByEncounter?.get(input.encounterId) ??
      options.appliedReschedules ??
      0,
  };
  const generatedIds = ["request-1", "proposal-1", "request-2", "proposal-2"];

  return {
    requests,
    encounters,
    events,
    useCase: new CreateScheduleChangeRequestUseCase({
      authorization: authorization(options.allowed),
      clock: { now: () => new Date(now) },
      editGuard: {
        canRequestScheduleChange: async ({ scope }) => {
          if (!(options.canEdit ?? true)) return false;
          if (scope.type === "entire_encounter") return protectedOfficialSlots.length === 0;
          return !protectedOfficialSlots.includes(scope.officialSlot);
        },
      },
      encounters,
      eventPublisher: {
        publish: async (event) => {
          if (failPublishing) {
            failPublishing = false;
            throw new Error("publisher unavailable");
          }
          events.push(event);
        },
        publishMany: async (batch) => void events.push(...batch),
      },
      ids: { generate: () => generatedIds.shift() ?? "unexpected-id" },
      mutationLock: new SerialEncounterMutationLock(() => {
        if (options.encounterWhenLocked === undefined) return;
        if (options.encounterWhenLocked === null) {
          encounters.rows.delete(encounterId);
          return;
        }
        encounters.rows.set(options.encounterWhenLocked.encounterId, options.encounterWhenLocked);
      }),
      requests,
      rules,
      transaction: {
        runInTransaction: async (operation) => {
          const requestSnapshot = [...requests.rows];
          const eventSnapshot = [...events];
          try {
            return await operation();
          } catch (error) {
            requests.rows.splice(0, requests.rows.length, ...requestSnapshot);
            events.splice(0, events.length, ...eventSnapshot);
            throw error;
          }
        },
      },
    }),
  };
}

function expectErrorCode(
  result: Awaited<ReturnType<CreateScheduleChangeRequestUseCase["execute"]>>,
  code: string,
) {
  expect(result.isErr()).toBe(true);
  if (result.isOk()) throw new Error(`Expected ${code}, received a request`);
  expect(result.error.code).toBe(code);
  return result.error;
}

describe("CreateScheduleChangeRequestUseCase", () => {
  it("persists an open request with its normalized initial proposal and emits one event", async () => {
    const harness = createHarness();
    const scheduleBefore = harness.encounters.rows.get(encounterId);

    const result = await harness.useCase.execute(validInput);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value).toEqual({
      id: "request-1",
      organizationId,
      competitionId,
      encounterId,
      requestingTeamId: homeTeamId,
      initiatedByActorId: actorId,
      scope: { type: "entire_encounter" },
      status: "open",
      proposals: [
        {
          id: "proposal-1",
          proposedStartAt: new Date("2026-09-21T21:30:00.000Z"),
          proposedByActorId: actorId,
          proposedByTeamId: homeTeamId,
          reason: "Team travel conflict",
          createdAt: now,
        },
      ],
      idempotencyKey: "idem-1",
      createdAt: now,
      updatedAt: now,
    });
    expect(harness.requests.rows).toEqual([result.value]);
    expect(harness.events).toEqual([
      {
        eventName: "scheduling.reschedule-requested",
        occurredAt: now.toISOString(),
        correlationId: "request-1",
        payload: {
          requestId: "request-1",
          proposalId: "proposal-1",
          organizationId,
          competitionId,
          encounterId,
          requestingTeamId: homeTeamId,
          scope: { type: "entire_encounter" },
          proposedStartAt: "2026-09-21T21:30:00.000Z",
          initiatedByActorId: actorId,
        },
      },
    ]);
    expect(harness.encounters.rows.get(encounterId)).toEqual(scheduleBefore);
  });

  it("accepts an existing OfficialMatch slot without changing the Encounter schedule", async () => {
    const harness = createHarness();
    const scheduleBefore = harness.encounters.rows.get(encounterId);

    const result = await harness.useCase.execute({
      ...validInput,
      scope: { type: "official_match", officialSlot: 2 },
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value.scope).toEqual({ type: "official_match", officialSlot: 2 });
    expect(result.value.proposals[0]?.proposedStartAt.toISOString()).toBe(
      "2026-09-21T21:30:00.000Z",
    );
    expect(harness.encounters.rows.get(encounterId)).toEqual(scheduleBefore);
  });

  it("treats a missing or mismatched-tenant Encounter as not found", async () => {
    const missing = createHarness({ encounter: null });
    const foreign = createHarness({
      encounter: { ...encounter, organizationId: asOrganizationId("org-other") },
    });

    for (const harness of [missing, foreign]) {
      const result = await harness.useCase.execute(validInput);
      const error = expectErrorCode(result, "scheduling.schedule_change_encounter_not_found");
      expect(error).toBeInstanceOf(ScheduleChangeRequestNotFound);
      expect(harness.requests.rows).toHaveLength(0);
      expect(harness.events).toHaveLength(0);
    }
  });

  it("revalidates the Encounter after acquiring the mutation lock", async () => {
    const harness = createHarness({ encounterWhenLocked: null });

    const result = await harness.useCase.execute(validInput);

    const error = expectErrorCode(result, "scheduling.schedule_change_encounter_not_found");
    expect(error).toBeInstanceOf(ScheduleChangeRequestNotFound);
    expect(harness.requests.rows).toHaveLength(0);
    expect(harness.events).toHaveLength(0);
  });

  it("rejects a requesting Team that is not part of the Encounter", async () => {
    const harness = createHarness();

    const result = await harness.useCase.execute({
      ...validInput,
      requestingTeamId: asTeamId("team-outsider"),
    });

    const error = expectErrorCode(result, "scheduling.invalid_schedule_change_request");
    expect(error).toBeInstanceOf(InvalidScheduleChangeRequest);
    expect(harness.requests.rows).toHaveLength(0);
  });

  it("requires the contextual reschedule-request permission", async () => {
    const harness = createHarness({ allowed: false });

    const result = await harness.useCase.execute(validInput);

    const error = expectErrorCode(result, "authorization.forbidden");
    expect(error).toBeInstanceOf(ScheduleChangeRequestForbidden);
    if (!(error instanceof ScheduleChangeRequestForbidden)) throw error;
    expect(error.permission).toBe("encounters.reschedule.request");
    expect(harness.requests.rows).toHaveLength(0);
    expect(harness.events).toHaveLength(0);
  });

  it.each([
    {
      name: "a nonexistent OfficialMatch slot",
      patch: { scope: { type: "official_match", officialSlot: 2 } },
      encounter: { ...encounter, officialMatchCount: 1 as const },
      expectedCode: "scheduling.invalid_schedule_change_scope",
      expectedError: InvalidScheduleChangeScope,
    },
    {
      name: "an invalid date",
      patch: { proposedStartAt: new Date("invalid") },
      expectedCode: "scheduling.invalid_schedule_change_date",
      expectedError: InvalidScheduleChangeDate,
    },
    {
      name: "a past date",
      patch: { proposedStartAt: new Date("2026-09-14T19:59:59.999Z") },
      expectedCode: "scheduling.invalid_schedule_change_date",
      expectedError: InvalidScheduleChangeDate,
    },
    {
      name: "the current Encounter date",
      patch: { proposedStartAt: new Date("2026-09-20T20:00:00.000Z") },
      expectedCode: "scheduling.invalid_schedule_change_date",
      expectedError: InvalidScheduleChangeDate,
    },
    {
      name: "an empty reason",
      patch: { reason: "   " },
      expectedCode: "scheduling.invalid_schedule_change_reason",
      expectedError: InvalidScheduleChangeReason,
    },
    {
      name: "an empty idempotency key",
      patch: { idempotencyKey: "   " },
      expectedCode: "scheduling.invalid_schedule_change_request",
      expectedError: InvalidScheduleChangeRequest,
    },
  ])(
    "rejects $name without persisting or publishing",
    async ({ patch, encounter: row, expectedCode, expectedError }) => {
      const harness = createHarness({ encounter: row });

      const result = await harness.useCase.execute({
        ...validInput,
        ...patch,
      } as CreateScheduleChangeRequestInput);

      const error = expectErrorCode(result, expectedCode);
      expect(error).toBeInstanceOf(expectedError);
      expect(harness.requests.rows).toHaveLength(0);
      expect(harness.events).toHaveLength(0);
    },
  );

  it("blocks requests when competition rescheduling is disabled", async () => {
    const harness = createHarness({ allowRescheduling: false });

    const result = await harness.useCase.execute(validInput);

    const error = expectErrorCode(result, "scheduling.rescheduling_disabled");
    expect(error).toBeInstanceOf(ReschedulingDisabled);
    expect(harness.requests.rows).toHaveLength(0);
  });

  it("blocks a Team that reached the applied-reschedule limit", async () => {
    const harness = createHarness({
      maxReschedulesPerTeam: 2,
      appliedReschedules: 2,
    });

    const result = await harness.useCase.execute(validInput);

    const error = expectErrorCode(result, "scheduling.reschedule_limit_reached");
    expect(error).toBeInstanceOf(RescheduleLimitReached);
    if (!(error instanceof RescheduleLimitReached)) throw error;
    expect(error.limit).toBe(2);
    expect(harness.requests.rows).toHaveLength(0);
  });

  it("counts applied reschedules for the requested Encounter instead of the Team globally", async () => {
    const appliedReschedulesByEncounter = new Map<EncounterId, number>([
      [encounterId, 2],
      [secondEncounterId, 0],
    ]);
    const harness = createHarness({
      maxReschedulesPerTeam: 2,
      appliedReschedulesByEncounter,
    });
    const secondEncounter: EncounterScheduleSnapshot = {
      ...encounter,
      encounterId: secondEncounterId,
      scheduledStartAt: new Date("2026-09-22T20:00:00.000Z"),
    };
    harness.encounters.rows.set(secondEncounterId, secondEncounter);

    const result = await harness.useCase.execute({
      ...validInput,
      encounterId: secondEncounterId,
      proposedStartAt: new Date("2026-09-23T20:00:00.000Z"),
      idempotencyKey: "idem-second-encounter",
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value.encounterId).toBe(secondEncounterId);
    expect(harness.requests.rows).toEqual([result.value]);
  });

  it("blocks an Encounter protected by official-result and selection guards", async () => {
    const harness = createHarness({ canEdit: false });

    const result = await harness.useCase.execute(validInput);

    const error = expectErrorCode(result, "scheduling.encounter_not_editable_for_schedule_change");
    expect(error).toBeInstanceOf(EncounterNotEditableForScheduleChange);
    expect(harness.requests.rows).toHaveLength(0);
    expect(harness.events).toHaveLength(0);
  });

  it("allows an unprotected OfficialMatch slot when the other slot is protected", async () => {
    const harness = createHarness({ protectedOfficialSlots: [2] });

    const unprotected = await harness.useCase.execute({
      ...validInput,
      scope: { type: "official_match", officialSlot: 1 },
    });

    expect(unprotected.isOk()).toBe(true);
    if (unprotected.isErr()) throw unprotected.error;
    expect(unprotected.value.scope).toEqual({ type: "official_match", officialSlot: 1 });
    expect(harness.requests.rows).toEqual([unprotected.value]);
    expect(harness.events).toHaveLength(1);
  });

  it("blocks the protected OfficialMatch slot itself", async () => {
    const harness = createHarness({ protectedOfficialSlots: [2] });

    const result = await harness.useCase.execute({
      ...validInput,
      scope: { type: "official_match", officialSlot: 2 },
    });

    const error = expectErrorCode(result, "scheduling.encounter_not_editable_for_schedule_change");
    expect(error).toBeInstanceOf(EncounterNotEditableForScheduleChange);
    expect(harness.requests.rows).toHaveLength(0);
    expect(harness.events).toHaveLength(0);
  });

  it("blocks an entire-Encounter request when either OfficialMatch slot is protected", async () => {
    const harness = createHarness({ protectedOfficialSlots: [2] });

    const result = await harness.useCase.execute(validInput);

    const error = expectErrorCode(result, "scheduling.encounter_not_editable_for_schedule_change");
    expect(error).toBeInstanceOf(EncounterNotEditableForScheduleChange);
    expect(harness.requests.rows).toHaveLength(0);
    expect(harness.events).toHaveLength(0);
  });

  it("rejects a second active request even when it targets another scope", async () => {
    const harness = createHarness();
    const first = await harness.useCase.execute(validInput);
    expect(first.isOk()).toBe(true);

    const second = await harness.useCase.execute({
      ...validInput,
      scope: { type: "official_match", officialSlot: 1 },
      idempotencyKey: "idem-2",
    });

    const error = expectErrorCode(second, "scheduling.active_schedule_change_request_exists");
    expect(error).toBeInstanceOf(ActiveScheduleChangeRequestExists);
    expect(harness.requests.rows).toHaveLength(1);
    expect(harness.events).toHaveLength(1);
  });

  it("serializes concurrent requests so only one active request is created", async () => {
    const harness = createHarness();

    const results = await Promise.all([
      harness.useCase.execute(validInput),
      harness.useCase.execute({
        ...validInput,
        scope: { type: "official_match", officialSlot: 1 },
        idempotencyKey: "idem-concurrent",
      }),
    ]);

    expect(results.filter((result) => result.isOk())).toHaveLength(1);
    const failure = results.find((result) => result.isErr());
    expect(failure?.isErr()).toBe(true);
    if (!failure || failure.isOk()) throw new Error("Expected one active-request conflict");
    expect(failure.error).toBeInstanceOf(ActiveScheduleChangeRequestExists);
    expect(failure.error.code).toBe("scheduling.active_schedule_change_request_exists");
    expect(harness.requests.rows).toHaveLength(1);
    expect(harness.events).toHaveLength(1);
  });

  it("allows active requests for two different OfficialMatch slots", async () => {
    const harness = createHarness();
    const first = await harness.useCase.execute({
      ...validInput,
      scope: { type: "official_match", officialSlot: 1 },
    });
    const second = await harness.useCase.execute({
      ...validInput,
      scope: { type: "official_match", officialSlot: 2 },
      idempotencyKey: "idem-slot-2",
    });

    expect(first.isOk()).toBe(true);
    expect(second.isOk()).toBe(true);
    if (first.isErr() || second.isErr()) throw new Error("Expected compatible slot requests");
    expect(harness.requests.rows).toEqual([first.value, second.value]);
    expect(harness.events).toHaveLength(2);
  });

  it("rejects another active request for the same OfficialMatch slot", async () => {
    const harness = createHarness();
    const first = await harness.useCase.execute({
      ...validInput,
      scope: { type: "official_match", officialSlot: 1 },
    });
    expect(first.isOk()).toBe(true);

    const second = await harness.useCase.execute({
      ...validInput,
      scope: { type: "official_match", officialSlot: 1 },
      idempotencyKey: "idem-same-slot",
    });

    const error = expectErrorCode(second, "scheduling.active_schedule_change_request_exists");
    expect(error).toBeInstanceOf(ActiveScheduleChangeRequestExists);
    expect(harness.requests.rows).toHaveLength(1);
    expect(harness.events).toHaveLength(1);
  });

  it("rejects an entire-Encounter request when an OfficialMatch slot request is active", async () => {
    const harness = createHarness();
    const first = await harness.useCase.execute({
      ...validInput,
      scope: { type: "official_match", officialSlot: 1 },
    });
    expect(first.isOk()).toBe(true);

    const second = await harness.useCase.execute({
      ...validInput,
      scope: { type: "entire_encounter" },
      idempotencyKey: "idem-entire",
    });

    const error = expectErrorCode(second, "scheduling.active_schedule_change_request_exists");
    expect(error).toBeInstanceOf(ActiveScheduleChangeRequestExists);
    expect(harness.requests.rows).toHaveLength(1);
    expect(harness.events).toHaveLength(1);
  });

  it("returns the original request for an identical idempotent replay without another event", async () => {
    const harness = createHarness();
    const first = await harness.useCase.execute(validInput);
    const replay = await harness.useCase.execute({
      ...validInput,
      reason: "Team travel conflict",
      proposedStartAt: new Date(validInput.proposedStartAt),
    });

    expect(first.isOk()).toBe(true);
    expect(replay.isOk()).toBe(true);
    if (first.isErr() || replay.isErr()) throw new Error("Expected successful replay");
    expect(replay.value).toBe(first.value);
    expect(harness.requests.rows).toHaveLength(1);
    expect(harness.events).toHaveLength(1);
  });

  it("rejects idempotency-key reuse with a different payload", async () => {
    const harness = createHarness();
    const first = await harness.useCase.execute(validInput);
    expect(first.isOk()).toBe(true);

    const replay = await harness.useCase.execute({
      ...validInput,
      proposedStartAt: new Date("2026-09-22T21:30:00.000Z"),
    });

    const error = expectErrorCode(replay, "scheduling.schedule_change_idempotency_conflict");
    expect(error).toBeInstanceOf(ScheduleChangeRequestIdempotencyConflict);
    expect(harness.requests.rows).toHaveLength(1);
    expect(harness.events).toHaveLength(1);
  });

  it("rolls back persistence when publishing fails so an idempotent retry emits the event", async () => {
    const harness = createHarness({ failPublishingOnce: true });

    await expect(harness.useCase.execute(validInput)).rejects.toThrow("publisher unavailable");
    expect(harness.requests.rows).toHaveLength(0);
    expect(harness.events).toHaveLength(0);

    const retry = await harness.useCase.execute(validInput);

    expect(retry.isOk()).toBe(true);
    if (retry.isErr()) throw retry.error;
    expect(harness.requests.rows).toEqual([retry.value]);
    expect(harness.events).toEqual([
      expect.objectContaining({
        eventName: "scheduling.reschedule-requested",
        payload: expect.objectContaining({ requestId: retry.value.id }),
      }),
    ]);
  });
});
