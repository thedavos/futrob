import { TaggedError, type EncounterId, type Permission, type TeamId } from "@futrob/shared-kernel";
import type { ScheduleChangeAuthority } from "../entities/schedule-change-decision.ts";
import type { ScheduleChangeRequestStatus } from "../entities/schedule-change-request.ts";
import type { FixtureUpdateConflict } from "./fixture.errors.ts";

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

export class UnknownScheduleChangeRequest extends TaggedError("UnknownScheduleChangeRequest")<{
  code: "scheduling.schedule_change_request_not_found";
  message: string;
  requestId: string;
}> {}

export class ScheduleChangeRequestClosed extends TaggedError("ScheduleChangeRequestClosed")<{
  code: "scheduling.schedule_change_request_closed";
  message: string;
  status: ScheduleChangeRequestStatus;
}> {}

export class ScheduleChangeVersionConflict extends TaggedError("ScheduleChangeVersionConflict")<{
  code: "scheduling.schedule_change_version_conflict";
  message: string;
  expectedVersion: number;
  currentVersion: number;
}> {}

export class ScheduleChangeProposalStale extends TaggedError("ScheduleChangeProposalStale")<{
  code: "scheduling.schedule_change_proposal_stale";
  message: string;
  proposalId: string;
  currentProposalId: string;
}> {}

export class ScheduleChangeSelfResponseForbidden extends TaggedError(
  "ScheduleChangeSelfResponseForbidden",
)<{
  code: "scheduling.schedule_change_self_response_forbidden";
  message: string;
}> {}

export class ScheduleChangeAuthorityNotRequired extends TaggedError(
  "ScheduleChangeAuthorityNotRequired",
)<{
  code: "scheduling.schedule_change_authority_not_required";
  message: string;
  authority: ScheduleChangeAuthority;
}> {}

export class ScheduleChangeConsentAlreadyRecorded extends TaggedError(
  "ScheduleChangeConsentAlreadyRecorded",
)<{
  code: "scheduling.schedule_change_consent_already_recorded";
  message: string;
  proposalId: string;
}> {}

export class ScheduleChangeApprovalNotConfigured extends TaggedError(
  "ScheduleChangeApprovalNotConfigured",
)<{
  code: "scheduling.schedule_change_approval_not_configured";
  message: string;
}> {}

export type ScheduleChangeResponseError =
  | ScheduleChangeRequestNotFound
  | UnknownScheduleChangeRequest
  | ScheduleChangeRequestForbidden
  | InvalidScheduleChangeRequest
  | ScheduleChangeRequestIdempotencyConflict
  | ScheduleChangeRequestClosed
  | ScheduleChangeVersionConflict
  | ScheduleChangeProposalStale
  | ScheduleChangeSelfResponseForbidden
  | ScheduleChangeAuthorityNotRequired
  | ScheduleChangeConsentAlreadyRecorded
  | ScheduleChangeApprovalNotConfigured
  | ReschedulingDisabled
  | EncounterNotEditableForScheduleChange;

export type AcceptScheduleChangeProposalError =
  | ScheduleChangeResponseError
  | RescheduleLimitReached
  | InvalidScheduleChangeDate
  | InvalidScheduleChangeScope
  | FixtureUpdateConflict;

export type CounterScheduleChangeProposalError =
  | ScheduleChangeResponseError
  | InvalidScheduleChangeDate
  | InvalidScheduleChangeReason;
