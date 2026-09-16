import {
  ActiveScheduleChangeRequestExists,
  ScheduleChangeRequestIdempotencyConflict,
  ScheduleChangeRequestNotFound,
  type ScheduleChangeRequest,
} from "@futrob/scheduling";
import type { EncounterId } from "@futrob/shared-kernel";
import { z } from "zod";

const postgresDatabaseErrorSchema = z.object({
  code: z.string(),
  constraint: z.string().nullish(),
  message: z.string(),
});

const IDEMPOTENCY_CONSTRAINT = "schedule_change_requests_idempotency_uidx";
const ENCOUNTER_SNAPSHOT_FK = "schedule_change_requests_encounter_snapshot_fkey";
const ACTIVE_SLOT_CONSTRAINTS = new Set([
  "schedule_change_requests_active_slot_1_uidx",
  "schedule_change_requests_active_slot_2_uidx",
]);

export function idempotencyConflict(): ScheduleChangeRequestIdempotencyConflict {
  return new ScheduleChangeRequestIdempotencyConflict({
    code: "scheduling.schedule_change_idempotency_conflict",
    message: "The idempotency key was already used with a different request",
  });
}

export function activeScopeConflict(
  encounterId: EncounterId,
  activeRequestId: string,
): ActiveScheduleChangeRequestExists {
  return new ActiveScheduleChangeRequestExists({
    code: "scheduling.active_schedule_change_request_exists",
    message: "This schedule scope already has an active change request",
    encounterId,
    activeRequestId,
  });
}

export function mapScheduleChangeRequestWriteError(
  error: Error,
  request: ScheduleChangeRequest,
): never {
  if (
    error instanceof ScheduleChangeRequestIdempotencyConflict ||
    error instanceof ActiveScheduleChangeRequestExists ||
    error instanceof ScheduleChangeRequestNotFound
  ) {
    throw error;
  }

  const parsed = postgresDatabaseErrorSchema.safeParse(error);
  if (parsed.success) {
    const mapped = mappedPostgresWriteError(parsed.data, request);
    if (mapped) throw mapped;
  }
  throw error;
}

function mappedPostgresWriteError(
  pg: z.infer<typeof postgresDatabaseErrorSchema>,
  request: ScheduleChangeRequest,
) {
  const constraint = pg.constraint ?? "";
  const constraintHaystack = `${constraint} ${pg.message}`;
  if (pg.code === "23505") {
    if (
      constraint === IDEMPOTENCY_CONSTRAINT ||
      constraintHaystack.includes("schedule_change_requests_idempotency_uidx")
    ) {
      return idempotencyConflict();
    }
    if (
      ACTIVE_SLOT_CONSTRAINTS.has(constraint) ||
      constraintHaystack.includes("schedule_change_requests_active_slot_")
    ) {
      return activeScopeConflict(request.encounterId, "unknown");
    }
  }
  if (
    pg.code === "23503" &&
    (constraint === ENCOUNTER_SNAPSHOT_FK ||
      constraintHaystack.includes("schedule_change_requests_encounter_snapshot_fkey"))
  ) {
    return new ScheduleChangeRequestNotFound({
      code: "scheduling.schedule_change_encounter_not_found",
      message: "Encounter not found",
      encounterId: request.encounterId,
    });
  }
  return null;
}
