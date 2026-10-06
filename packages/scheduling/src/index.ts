export type { Encounter, OfficialMatchSlot } from "./domain/entities/encounter.ts";
export {
  createInitialScheduleChangeRequest,
  currentScheduleChangeProposal,
  type CreateInitialScheduleChangeRequestError,
  type CreateInitialScheduleChangeRequestInput,
  type ScheduleChangeRequest,
  type ScheduleChangeRequestStatus,
  type ScheduleChangeTransition,
} from "./domain/entities/schedule-change-request.ts";
export type {
  ScheduleChangeAuthority,
  ScheduleChangeDecision,
  ScheduleChangeDecisionKind,
  ScheduleChangeResponder,
} from "./domain/entities/schedule-change-decision.ts";
export type {
  ScheduleChangeCommandReceipt,
  ScheduleChangeCommandType,
} from "./domain/entities/schedule-change-command-receipt.ts";
export {
  createScheduleChangeProposal,
  type CreateScheduleChangeProposalInput,
  type ScheduleChangeProposal,
} from "./domain/entities/schedule-change-proposal.ts";
export {
  asFixtureRoundId,
  asFixtureStageId,
  type FixtureEncounter,
  type FixtureFormat,
  type FixtureGenerationSpec,
  type FixtureParticipantSlot,
  type FixturePlan,
  type FixturePlanStatus,
  type FixtureRound,
  type FixtureRoundId,
  type FixtureSeries,
  type FixtureStage,
  type FixtureStageId,
  type SeriesResolutionMode,
} from "./domain/entities/fixture-plan.ts";
export type { EncounterScheduleSnapshot } from "./domain/entities/encounter-schedule-snapshot.ts";
export type { OfficialMatch, OfficialMatchStatus } from "./domain/entities/official-match.ts";
export type { ScheduleChangeApplication } from "./domain/entities/schedule-change-application.ts";
export {
  officialMatchSchedules,
  type OfficialMatchSchedule,
  type OfficialMatchScheduleChange,
} from "./domain/policies/official-match-schedule.ts";
export type {
  EncounterParticipantValidationPort,
  EncounterScheduleRepository,
} from "./domain/ports/encounter-schedule.repository.ts";
export type { EncounterWindowReaderPort } from "./domain/ports/encounter-window-reader.port.ts";
export type {
  CompetitionRescheduleRules,
  CompetitionRescheduleRulesPort,
} from "./domain/ports/competition-reschedule-rules.port.ts";
export type {
  ScheduleChangeCommitOutcome,
  ScheduleChangeRequestRepository,
} from "./domain/ports/schedule-change-request.repository.ts";
export type {
  AppliedScheduleChange,
  ScheduleChangeApplicationFeedPort,
} from "./domain/ports/schedule-change-application-feed.port.ts";
export type { CompetitionTimeZonePort } from "./domain/ports/competition-time-zone.port.ts";
export type { OfficialMatchRepository } from "./domain/ports/official-match.repository.ts";
export type { EncounterMutationLockPort } from "./domain/ports/encounter-mutation-lock.port.ts";
export type {
  CompetitionFixtureSourcePort,
  CompetitionFixtureSourceSnapshot,
  FixturePlanRepository,
} from "./domain/ports/fixture-plan.repository.ts";
export type {
  FixtureAuditEntry,
  FixtureAuditPort,
  FixtureEncounterEditGuardPort,
  FixtureOccupancyGuardPort,
  ScheduleChangeRequestEditGuardPort,
} from "./domain/ports/fixture-editing.ports.ts";
export { UpsertEncounterScheduleSnapshotUseCase } from "./application/upsert-encounter-schedule-snapshot.use-case.ts";
export {
  MaterializeOfficialMatchesForEncounterUseCase,
  type MaterializeOfficialMatchesForEncounterInput,
} from "./application/materialize-official-matches-for-encounter.use-case.ts";
export {
  GenerateCompetitionFixtureUseCase,
  type GenerateCompetitionFixtureInput,
} from "./application/generate-competition-fixture.use-case.ts";
export {
  EditFixtureEncounterUseCase,
  type EditFixtureEncounterInput,
} from "./application/edit-fixture-encounter.use-case.ts";
export {
  CreateScheduleChangeRequestUseCase,
  type CreateScheduleChangeRequestInput,
} from "./application/create-schedule-change-request.use-case.ts";
export {
  ListScheduleChangeRequestsUseCase,
  type ListScheduleChangeRequestsError,
  type ListScheduleChangeRequestsInput,
} from "./application/list-schedule-change-requests.use-case.ts";
export {
  AcceptScheduleChangeProposalUseCase,
  type AcceptScheduleChangeProposalDeps,
  type AcceptScheduleChangeProposalInput,
} from "./application/accept-schedule-change-proposal.use-case.ts";
export {
  RejectScheduleChangeProposalUseCase,
  type RejectScheduleChangeProposalInput,
} from "./application/reject-schedule-change-proposal.use-case.ts";
export {
  CounterScheduleChangeProposalUseCase,
  type CounterScheduleChangeProposalInput,
} from "./application/counter-schedule-change-proposal.use-case.ts";
export type {
  ScheduleChangeCommandInput,
  ScheduleChangeCommandOutput,
} from "./application/schedule-change-command.ts";
export { GetCompetitionFixtureUseCase } from "./application/get-competition-fixture.use-case.ts";
export {
  EncounterScheduleAuthorizationForbidden,
  InvalidEncounterSchedule,
  EncounterScheduleNotFound,
  FixtureManagedEncounterConflict,
  type UpsertEncounterScheduleError,
  type MaterializeOfficialMatchesError,
} from "./domain/errors/encounter-schedule.errors.ts";
export {
  FixtureAuthorizationForbidden,
  FixtureSourceNotFound,
  FixtureSourceNotPublished,
  FixturePlanNotFound,
  FixtureEncounterNotFound,
  FixtureEncounterNotEditable,
  FixtureUpdateConflict,
  FixtureGenerationConflict,
  FixtureSupersedeConflict,
  InvalidFixtureConfiguration,
  type EditFixtureEncounterError,
  type GenerateCompetitionFixtureError,
} from "./domain/errors/fixture.errors.ts";
export {
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
  ScheduleChangeApprovalNotConfigured,
  ScheduleChangeAuthorityNotRequired,
  ScheduleChangeConsentAlreadyRecorded,
  ScheduleChangeProposalStale,
  ScheduleChangeRequestClosed,
  ScheduleChangeSelfResponseForbidden,
  ScheduleChangeVersionConflict,
  UnknownScheduleChangeRequest,
  type AcceptScheduleChangeProposalError,
  type CounterScheduleChangeProposalError,
  type CreateScheduleChangeRequestError,
  type ScheduleChangeResponseError,
} from "./domain/errors/schedule-change-request.errors.ts";
export type { EncounterCreatedEvent } from "./domain/events/encounter-created.event.ts";
export {
  fixtureGenerationFingerprint,
  fixtureGenerationKey,
  generateFixturePlan,
} from "./domain/policies/generate-fixture-plan.ts";
export {
  isKnockoutFixtureStageKind,
  selectRescheduleStageRules,
} from "./domain/policies/select-reschedule-stage-rules.ts";
export { requiredScheduleChangeAuthorities } from "./domain/policies/schedule-change-approval.ts";
export type { CompetitionWallTime } from "./domain/policies/interpret-competition-wall-time.ts";
export { replaceEncounter } from "./domain/policies/edit-fixture-encounter.ts";
export {
  rescheduleScopesConflict,
  type RescheduleScope,
} from "./domain/value-objects/reschedule-scope.ts";
export type { EncounterRescheduledEvent } from "./domain/events/encounter-rescheduled.event.ts";
export type { RescheduleRequestedEvent } from "./domain/events/reschedule-requested.event.ts";
export {
  ENCOUNTER_PERMISSION,
  ENCOUNTER_PERMISSIONS,
} from "./domain/policies/encounter-permissions.ts";
