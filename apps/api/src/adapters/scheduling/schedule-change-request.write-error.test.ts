import {
  ActiveScheduleChangeRequestExists,
  ScheduleChangeRequestIdempotencyConflict,
  ScheduleChangeRequestNotFound,
  type ScheduleChangeRequest,
} from "@futrob/scheduling";
import {
  asActorId,
  asCompetitionId,
  asEncounterId,
  asOrganizationId,
  asTeamId,
} from "@futrob/shared-kernel";
import { describe, expect, it } from "vite-plus/test";
import { mapScheduleChangeRequestWriteError } from "./schedule-change-request.write-error.ts";

const request: ScheduleChangeRequest = {
  id: "req-1",
  organizationId: asOrganizationId("org-a"),
  competitionId: asCompetitionId("competition-1"),
  encounterId: asEncounterId("encounter-1"),
  requestingTeamId: asTeamId("team-home"),
  initiatedByActorId: asActorId("captain-1"),
  scope: { type: "entire_encounter" },
  status: "open",
  proposals: [
    {
      id: "proposal-1",
      proposedStartAt: new Date("2026-09-21T21:30:00.000Z"),
      proposedByActorId: asActorId("captain-1"),
      proposedByTeamId: asTeamId("team-home"),
      reason: "Team travel conflict",
      createdAt: new Date("2026-09-14T20:00:00.000Z"),
    },
  ],
  idempotencyKey: "idem-1",
  createdAt: new Date("2026-09-14T20:00:00.000Z"),
  updatedAt: new Date("2026-09-14T20:00:00.000Z"),
};

function postgresError(code: string, constraint: string, message: string): Error {
  return Object.assign(new Error(message), { code, constraint });
}

describe("mapScheduleChangeRequestWriteError", () => {
  it("maps an idempotency unique violation to a domain conflict", () => {
    expect(() =>
      mapScheduleChangeRequestWriteError(
        postgresError(
          "23505",
          "schedule_change_requests_idempotency_uidx",
          "duplicate key value violates unique constraint",
        ),
        request,
      ),
    ).toThrow(ScheduleChangeRequestIdempotencyConflict);
  });

  it("maps an active-slot unique violation to an active request conflict", () => {
    expect(() =>
      mapScheduleChangeRequestWriteError(
        postgresError(
          "23505",
          "schedule_change_requests_active_slot_1_uidx",
          "duplicate key value violates unique constraint",
        ),
        request,
      ),
    ).toThrow(ActiveScheduleChangeRequestExists);
  });

  it("maps a missing encounter snapshot to not found", () => {
    expect(() =>
      mapScheduleChangeRequestWriteError(
        postgresError(
          "23503",
          "schedule_change_requests_encounter_snapshot_fkey",
          "insert or update on table violates foreign key constraint",
        ),
        request,
      ),
    ).toThrow(ScheduleChangeRequestNotFound);
  });
});
