import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
  compareTime,
  type AuthorizationPort,
  type EncounterId,
  type OrganizationId,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import type { EncounterScheduleSnapshot } from "../domain/entities/encounter-schedule-snapshot.ts";
import { asFixtureStageId } from "../domain/entities/fixture-plan.ts";
import type { ScheduleChangeRequest } from "../domain/entities/schedule-change-request.ts";
import { ScheduleChangeRequestNotFound } from "../domain/errors/schedule-change-request.errors.ts";
import type { ScheduleChangeRequestRepository } from "../domain/ports/schedule-change-request.repository.ts";
import { ListScheduleChangeRequestsUseCase } from "./list-schedule-change-requests.use-case.ts";

const organizationId = asOrganizationId("org-1");
const competitionId = asCompetitionId("competition-1");
const encounterId = asEncounterId("encounter-1");
const homeTeamId = asTeamId("team-home");
const awayTeamId = asTeamId("team-away");
const actorId = asActorId("captain-1");
const now = new Date("2026-09-14T20:00:00.000Z");

const encounter: EncounterScheduleSnapshot = {
  encounterId,
  organizationId,
  competitionId,
  stageId: asFixtureStageId("stage-1"),
  homeTeamId,
  awayTeamId,
  scheduledStartAt: new Date("2026-09-20T20:00:00.000Z"),
  officialMatchCount: 2,
};

function request(
  overrides: Partial<ScheduleChangeRequest> & Pick<ScheduleChangeRequest, "id" | "status">,
): ScheduleChangeRequest {
  return {
    organizationId,
    competitionId,
    encounterId,
    requestingTeamId: homeTeamId,
    initiatedByActorId: actorId,
    scope: { type: "entire_encounter" },
    version: 1,
    decisions: [],
    proposals: [
      {
        id: `${overrides.id}-proposal`,
        proposedStartAt: new Date("2026-09-21T21:30:00.000Z"),
        proposedByActorId: actorId,
        proposedByTeamId: homeTeamId,
        reason: "Team travel conflict",
        createdAt: now,
      },
    ],
    idempotencyKey: overrides.id,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

class FakeEncounters {
  constructor(private readonly row: EncounterScheduleSnapshot | null) {}

  async findById(id: EncounterId) {
    return this.row?.encounterId === id ? this.row : null;
  }

  async upsert() {
    return this.row;
  }

  async deleteByEncounterIds() {}

  async findNextUpcomingByTeamIds() {
    return null;
  }
}

class FakeRequests implements Pick<ScheduleChangeRequestRepository, "listByEncounter"> {
  constructor(readonly rows: ScheduleChangeRequest[]) {}

  async findByIdempotencyKey() {
    return null;
  }

  async listActiveByEncounter(orgId: OrganizationId, targetEncounterId: EncounterId) {
    return this.rows.filter(
      (row) =>
        row.organizationId === orgId &&
        row.encounterId === targetEncounterId &&
        row.status === "open",
    );
  }

  async listByEncounter(orgId: OrganizationId, targetEncounterId: EncounterId) {
    return this.rows
      .filter((row) => row.organizationId === orgId && row.encounterId === targetEncounterId)
      .sort((left, right) => {
        const time = compareTime(left.createdAt, right.createdAt);
        if (time !== 0) return time;
        return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
      });
  }

  async save(row: ScheduleChangeRequest) {
    return row;
  }
}

function authorization(allowed = true): AuthorizationPort {
  return {
    decide: async (request) => ({
      ...request,
      allowed,
      permission: request.permission,
      reason: allowed ? "allowed" : "denied",
    }),
    getEffectiveAccess: async (input) => ({ ...input, roles: [], permissions: [] }),
  };
}

describe("ListScheduleChangeRequestsUseCase", () => {
  it("returns closed history and proposals in deterministic order", async () => {
    const later = new Date("2026-09-15T20:00:00.000Z");
    const closed = request({
      id: "req-closed",
      status: "rejected",
      createdAt: later,
      updatedAt: later,
      proposals: [
        {
          id: "proposal-a",
          proposedStartAt: new Date("2026-09-21T21:30:00.000Z"),
          proposedByActorId: actorId,
          proposedByTeamId: homeTeamId,
          reason: "First proposal",
          createdAt: now,
        },
        {
          id: "proposal-b",
          proposedStartAt: new Date("2026-09-22T21:30:00.000Z"),
          proposedByActorId: actorId,
          proposedByTeamId: awayTeamId,
          reason: "Counter",
          createdAt: later,
        },
      ],
    });
    const open = request({ id: "req-open", status: "open" });
    const otherEncounter = request({
      id: "req-other",
      status: "open",
      encounterId: asEncounterId("encounter-2"),
    });
    const useCase = new ListScheduleChangeRequestsUseCase({
      authorization: authorization(true),
      encounters: new FakeEncounters(encounter),
      requests: new FakeRequests([closed, otherEncounter, open]),
    });

    const result = await useCase.execute({ actorId, encounterId });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) throw result.error;
    expect(result.value.map((row) => row.id)).toEqual(["req-open", "req-closed"]);
    expect(result.value[1]?.status).toBe("rejected");
    expect(result.value[1]?.proposals.map((proposal) => proposal.id)).toEqual([
      "proposal-a",
      "proposal-b",
    ]);
  });

  it("does not leak an Encounter the actor cannot read", async () => {
    const useCase = new ListScheduleChangeRequestsUseCase({
      authorization: authorization(false),
      encounters: new FakeEncounters(encounter),
      requests: new FakeRequests([request({ id: "req-open", status: "open" })]),
    });

    const result = await useCase.execute({ actorId, encounterId });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected not found");
    expect(result.error).toBeInstanceOf(ScheduleChangeRequestNotFound);
    expect(result.error.code).toBe("scheduling.schedule_change_encounter_not_found");
  });

  it("returns not found when the Encounter is missing", async () => {
    const useCase = new ListScheduleChangeRequestsUseCase({
      authorization: authorization(true),
      encounters: new FakeEncounters(null),
      requests: new FakeRequests([]),
    });

    const result = await useCase.execute({ actorId, encounterId });

    expect(result.isErr()).toBe(true);
    if (result.isOk()) throw new Error("Expected not found");
    expect(result.error).toBeInstanceOf(ScheduleChangeRequestNotFound);
  });
});
