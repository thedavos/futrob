import { TaggedError, type EncounterId, type Permission, type TeamId } from "@futrob/shared-kernel";

export class ScheduleChangeRequestNotFound extends TaggedError("ScheduleChangeRequestNotFound")<{
  code: "scheduling.schedule_change_encounter_not_found";
  message: string;
  encounterId: EncounterId;
}> {}

export class ScheduleChangeRequestForbidden extends TaggedError("ScheduleChangeRequestForbidden")<{
  code: "authorization.forbidden";
  message: string;
  permission: Permission;
}> {}

export class InvalidScheduleChangeRequest extends TaggedError("InvalidScheduleChangeRequest")<{
  code: "scheduling.invalid_schedule_change_request";
  message: string;
}> {}

export class InvalidScheduleChangeScope extends TaggedError("InvalidScheduleChangeScope")<{
  code: "scheduling.invalid_schedule_change_scope";
  message: string;
  encounterId: EncounterId;
}> {}

export class InvalidScheduleChangeDate extends TaggedError("InvalidScheduleChangeDate")<{
  code: "scheduling.invalid_schedule_change_date";
  message: string;
}> {}

export class InvalidScheduleChangeReason extends TaggedError("InvalidScheduleChangeReason")<{
  code: "scheduling.invalid_schedule_change_reason";
  message: string;
}> {}

export class ReschedulingDisabled extends TaggedError("ReschedulingDisabled")<{
  code: "scheduling.rescheduling_disabled";
  message: string;
}> {}

export class RescheduleLimitReached extends TaggedError("RescheduleLimitReached")<{
  code: "scheduling.reschedule_limit_reached";
  message: string;
  teamId: TeamId;
  limit: number;
}> {}

export class EncounterNotEditableForScheduleChange extends TaggedError(
  "EncounterNotEditableForScheduleChange",
)<{
  code: "scheduling.encounter_not_editable_for_schedule_change";
  message: string;
  encounterId: EncounterId;
}> {}

export class ActiveScheduleChangeRequestExists extends TaggedError(
  "ActiveScheduleChangeRequestExists",
)<{
  code: "scheduling.active_schedule_change_request_exists";
  message: string;
  encounterId: EncounterId;
  activeRequestId: string;
}> {}

export class ScheduleChangeRequestIdempotencyConflict extends TaggedError(
  "ScheduleChangeRequestIdempotencyConflict",
)<{
  code: "scheduling.schedule_change_idempotency_conflict";
  message: string;
}> {}

export type CreateScheduleChangeRequestError =
  | ScheduleChangeRequestNotFound
  | ScheduleChangeRequestForbidden
  | InvalidScheduleChangeRequest
  | InvalidScheduleChangeScope
  | InvalidScheduleChangeDate
  | InvalidScheduleChangeReason
  | ReschedulingDisabled
  | RescheduleLimitReached
  | EncounterNotEditableForScheduleChange
  | ActiveScheduleChangeRequestExists
  | ScheduleChangeRequestIdempotencyConflict;
