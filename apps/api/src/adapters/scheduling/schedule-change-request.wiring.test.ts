import type { CompetitionDraft } from "@futrob/competitions";
import { asFixtureStageId, ScheduleChangeRequestIdempotencyConflict } from "@futrob/scheduling";
import type { DomainEvent } from "@futrob/shared-kernel";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { InMemoryCompetitionRepository } from "@/adapters/competitions/in-memory.repository.ts";
import { NoopTransactionPort } from "@/adapters/persistence/pg-transaction.ts";
import { InMemoryEncounterMutationLock } from "./encounter-mutation-lock.ts";
import { createSchedulingModule } from "@/di/scheduling.module.ts";

const organizationId = asOrganizationId("org-1");
const otherOrganizationId = asOrganizationId("org-2");
const competitionId = asCompetitionId("competition-1");
const encounterId = asEncounterId("encounter-1");
const secondEncounterId = asEncounterId("encounter-2");
const homeTeamId = asTeamId("team-home");
const awayTeamId = asTeamId("team-away");
const actorId = asActorId("captain-1");
const scheduledStartAt = new Date("2026-09-20T20:00:00.000Z");

function competitionDraft(): CompetitionDraft {
  return {
    competition: {
      id: competitionId,
      organizationId,
      name: "Liga Futrob",
      status: "published",
      modality: "fc-clubs",
      gameEdition: "FC 26",
      platform: "playstation",
      region: "south-america",
      timeZone: "America/Lima",
      format: "league",
      createdByActorId: asActorId("organizer-1"),
      createdAt: new Date("2026-07-31T12:00:00.000Z"),
      updatedAt: new Date("2026-07-31T12:00:00.000Z"),
    },
    rules: {
      competitionId,
      version: 1,
      regularStage: {
        officialMatchesPerEncounter: 2,
        resolutionMode: "independent_matches",
        winPoints: 3,
        drawPoints: 1,
        lossPoints: 0,
        allowRescheduling: true,
        maxReschedulesPerTeam: 2,
        minimumRescheduleNoticeHours: 12,
        rescheduleRequiresOpponentApproval: true,
        rescheduleRequiresOrganizerApproval: false,
      },
      knockoutStage: null,
      awayGoalsEnabled: false,
      maxRosterSize: null,
      createdAt: new Date("2026-07-31T12:00:00.000Z"),
    },
  };
}

describe("createSchedulingModule schedule change requests", () => {
  it("creates an open request against in-memory adapters without mutating the Encounter", async () => {
    const { events, scheduling, snapshot } = await wiredScheduling();
    await scheduling.encounters.upsert(snapshot);

    const created = await scheduling.createScheduleChangeRequest.execute({
      actorId,
      organizationId,
      competitionId,
      encounterId,
      requestingTeamId: homeTeamId,
      scope: { type: "entire_encounter" },
      timeZone: "America/Lima",
      proposedWallTime: { year: 2099, month: 1, day: 15, hour: 18, minute: 0, second: 0 },
      reason: "  Team travel conflict  ",
      idempotencyKey: "idem-1",
    });

    expect(created.isOk()).toBe(true);
    if (created.isErr()) throw created.error;
    expect(created.value.status).toBe("open");
    expect(created.value.proposals[0]?.reason).toBe("Team travel conflict");
    expect(created.value.scope).toEqual({ type: "entire_encounter" });
    await expect(
      scheduling.scheduleChangeRequests.findByIdempotencyKey(organizationId, "idem-1"),
    ).resolves.toEqual(created.value);
    await expect(
      scheduling.scheduleChangeRequests.findByIdempotencyKey(otherOrganizationId, "idem-1"),
    ).resolves.toBeNull();
    await expect(scheduling.encounters.findById(encounterId)).resolves.toEqual(snapshot);
    expect(events).toHaveLength(1);
    expect(events[0]?.eventName).toBe("scheduling.reschedule-requested");

    const replay = await scheduling.createScheduleChangeRequest.execute({
      actorId,
      organizationId,
      competitionId,
      encounterId,
      requestingTeamId: homeTeamId,
      scope: { type: "entire_encounter" },
      timeZone: "America/Lima",
      proposedWallTime: { year: 2099, month: 1, day: 15, hour: 18, minute: 0, second: 0 },
      reason: "Team travel conflict",
      idempotencyKey: "idem-1",
    });
    expect(replay.isOk()).toBe(true);
    if (replay.isErr()) throw replay.error;
    expect(replay.value.id).toBe(created.value.id);
    expect(events).toHaveLength(1);

    const conflict = await scheduling.createScheduleChangeRequest.execute({
      actorId,
      organizationId,
      competitionId,
      encounterId,
      requestingTeamId: homeTeamId,
      scope: { type: "official_match", officialSlot: 1 },
      timeZone: "America/Lima",
      proposedWallTime: { year: 2099, month: 1, day: 16, hour: 18, minute: 0, second: 0 },
      reason: "Different payload",
      idempotencyKey: "idem-2",
    });
    expect(conflict.isErr()).toBe(true);
    if (conflict.isOk()) throw new Error("Expected an active request conflict");
    expect(conflict.error.code).toBe("scheduling.active_schedule_change_request_exists");
    await expect(
      scheduling.scheduleChangeRequests.listActiveByEncounter(organizationId, encounterId),
    ).resolves.toHaveLength(1);
  });

  it("returns an idempotency conflict when the same org key is used on a different Encounter", async () => {
    const { events, scheduling, snapshot } = await wiredScheduling();
    await scheduling.encounters.upsert(snapshot);
    await scheduling.encounters.upsert({
      ...snapshot,
      encounterId: secondEncounterId,
    });

    const created = await scheduling.createScheduleChangeRequest.execute({
      actorId,
      organizationId,
      competitionId,
      encounterId,
      requestingTeamId: homeTeamId,
      scope: { type: "entire_encounter" },
      timeZone: "America/Lima",
      proposedWallTime: { year: 2099, month: 1, day: 15, hour: 18, minute: 0, second: 0 },
      reason: "Team travel conflict",
      idempotencyKey: "idem-shared",
    });
    expect(created.isOk()).toBe(true);
    if (created.isErr()) throw created.error;

    const second = await scheduling.createScheduleChangeRequest.execute({
      actorId,
      organizationId,
      competitionId,
      encounterId: secondEncounterId,
      requestingTeamId: homeTeamId,
      scope: { type: "entire_encounter" },
      timeZone: "America/Lima",
      proposedWallTime: { year: 2099, month: 1, day: 16, hour: 18, minute: 0, second: 0 },
      reason: "Different Encounter",
      idempotencyKey: "idem-shared",
    });
    expect(second.isErr()).toBe(true);
    if (second.isOk()) throw new Error("Expected an idempotency conflict");
    expect(second.error).toBeInstanceOf(ScheduleChangeRequestIdempotencyConflict);
    expect(second.error.code).toBe("scheduling.schedule_change_idempotency_conflict");
    expect(events).toHaveLength(1);
    await expect(
      scheduling.scheduleChangeRequests.listActiveByEncounter(organizationId, encounterId),
    ).resolves.toHaveLength(1);
    await expect(
      scheduling.scheduleChangeRequests.listActiveByEncounter(organizationId, secondEncounterId),
    ).resolves.toEqual([]);
  });
});

async function wiredScheduling() {
  const competitions = new InMemoryCompetitionRepository();
  await competitions.saveDraft(competitionDraft());
  const events: DomainEvent[] = [];
  const scheduling = createSchedulingModule({
    pool: undefined,
    authorization: {
      decide: async (request) => ({ ...request, allowed: true, reason: "allowed" }),
      getEffectiveAccess: async (input) => ({ ...input, roles: [], permissions: [] }),
    },
    participants: { isApprovedParticipant: async () => true },
    fixtureSource: { load: async () => null },
    eventPublisher: {
      publish: async (event) => {
        events.push(event);
      },
      publishMany: async (batch) => {
        events.push(...batch);
      },
    },
    transaction: new NoopTransactionPort(),
    officialResults: { findApprovedByEncounter: async () => null },
    officialSelections: { findLatestByEncounter: async () => null },
    encounterMutationLock: new InMemoryEncounterMutationLock(),
    competitions,
  });
  const snapshot = {
    encounterId,
    organizationId,
    competitionId,
    stageId: asFixtureStageId("stage-1"),
    homeTeamId,
    awayTeamId,
    scheduledStartAt,
    officialMatchCount: 2 as const,
  };
  return { events, scheduling, snapshot };
}
