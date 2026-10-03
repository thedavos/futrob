export type {
  CompetitionMatchRules,
  ResolutionMode,
} from "./domain/value-objects/resolution-mode.ts";
export type {
  Competition,
  CompetitionFormat,
  CompetitionPlatform,
  CompetitionRegion,
  CompetitionStatus,
} from "./domain/entities/competition.ts";
export type { CompetitionRules } from "./domain/entities/competition-rules.ts";
export type {
  CompetitionMembership,
  CompetitionMembershipRole,
} from "./domain/entities/competition-membership.ts";
export type { CompetitionMembershipRepository } from "./domain/ports/competition-membership.repository.ts";
export {
  COMPETITION_PERMISSION,
  COMPETITION_PERMISSIONS,
  COMPETITION_ROLE_PERMISSIONS,
} from "./domain/policies/competition-permissions.ts";
export {
  DEFAULT_TEAM_RANGE,
  MAX_COMPETITION_TEAMS,
  MIN_COMPETITION_TEAMS,
  hasCapacityFor,
  parseTeamRange,
  type TeamRange,
} from "./domain/value-objects/team-range.ts";
export {
  EMPTY_SCHEDULE,
  parseCalendarDate,
  parseSchedule,
  type CalendarDate,
  type CompetitionSchedule,
} from "./domain/value-objects/competition-schedule.ts";
export {
  COMPETITION_COVER_PRESETS,
  DEFAULT_COMPETITION_COVER,
  competitionCoverKeyPrefix,
  parseCompetitionCover,
  type CompetitionCover,
  type CompetitionCoverInput,
  type CompetitionCoverPreset,
  type MediaKey,
} from "./domain/value-objects/competition-cover.ts";
export {
  PARTICIPANT_EDITABLE_STATUSES,
  PUBLISHABLE_STATUSES,
  canEditParticipants,
  canPublish,
} from "./domain/policies/competition-lifecycle.ts";
export {
  DISCOVERABLE_COMPETITION_STATUSES,
  isDiscoverableCompetitionStatus,
  type DiscoverableCompetitionStatus,
} from "./domain/policies/discoverable-competition.ts";
export type {
  CompetitionDiscoveryFilter,
  CompetitionDiscoveryReader,
  CompetitionDiscoverySort,
  DiscoverableCompetitionPage,
  DiscoverableCompetitionRecord,
} from "./domain/ports/competition-discovery.reader.ts";
export {
  selectStageMatchRules,
  type CompetitionStageBand,
} from "./domain/policies/select-stage-match-rules.ts";

export type {
  CompetitionDraft,
  CompetitionRepository,
} from "./domain/ports/competition.repository.ts";

export {
  CompetitionNotFound,
  CompetitionNotDiscoverable,
  InvalidCompetitionName,
  InvalidCompetitionGameEdition,
  InvalidCompetitionTimeZone,
  CompetitionCreationKeyConflict,
  EntryCreationKeyConflict,
  EntryNotFound,
  EntryAlreadyDecided,
  CompetitionNotEditable,
  InvalidCompetitionRules,
  CompetitionPublishBlocked,
  CompetitionRegistrationClosed,
  CompetitionCapacityReached,
  InvalidCompetitionTeamRange,
  InvalidCompetitionSchedule,
  InvalidCompetitionCover,
  type CompetitionProfileError,
  type UpdateCompetitionCoverError,
  type ApplyToCompetitionError,
  CompetitionMembershipNotFound,
  CompetitionAuthorizationForbidden,
  type CreateCompetitionDraftError,
  type JoinCompetitionError,
  type RegisterTeamEntryError,
  type ApproveCompetitionEntryError,
  type RejectCompetitionEntryError,
  type UpdateCompetitionDraftError,
  type PublishCompetitionError,
  type OpenCompetitionRegistrationError,
  type CloseCompetitionRegistrationError,
  type RemoveCompetitionParticipantError,
  type ChangeCompetitionMembershipRoleError,
  type GetDiscoverableCompetitionError,
} from "./domain/errors/competition.errors.ts";

export {
  CreateCompetitionDraftUseCase,
  type CreateCompetitionDraftInput,
} from "./application/create-competition-draft/create-competition-draft.use-case.ts";
export { GetCompetitionDraftUseCase } from "./application/get-competition-draft/get-competition-draft.use-case.ts";
export {
  ListOrganizationCompetitionsUseCase,
  type ListOrganizationCompetitionsInput,
} from "./application/list-organization-competitions/list-organization-competitions.use-case.ts";
export {
  JoinCompetitionUseCase,
  type JoinCompetitionInput,
} from "./application/join-competition/join-competition.use-case.ts";
export type {
  CompetitionEntry,
  CompetitionEntryStatus,
} from "./domain/entities/competition-entry.ts";
export type { CompetitionEntryRepository } from "./domain/ports/competition-entry.repository.ts";
export {
  RegisterTeamEntryUseCase,
  type RegisterTeamEntryInput,
} from "./application/register-team-entry/register-team-entry.use-case.ts";
export { GetTeamEntryUseCase } from "./application/get-team-entry/get-team-entry.use-case.ts";
export {
  ApproveCompetitionEntryUseCase,
  type ApproveCompetitionEntryInput,
} from "./application/approve-competition-entry/approve-competition-entry.use-case.ts";
export {
  RejectCompetitionEntryUseCase,
  type RejectCompetitionEntryInput,
} from "./application/reject-competition-entry/reject-competition-entry.use-case.ts";
export {
  UpdateCompetitionDraftUseCase,
  type UpdateCompetitionDraftInput,
} from "./application/update-competition-draft/update-competition-draft.use-case.ts";
export { PublishCompetitionUseCase } from "./application/publish-competition/publish-competition.use-case.ts";
export {
  UpdateCompetitionCoverUseCase,
  type UpdateCompetitionCoverInput,
} from "./application/update-competition-cover/update-competition-cover.use-case.ts";
export {
  ApplyToCompetitionUseCase,
  type ApplyToCompetitionInput,
} from "./application/apply-to-competition/apply-to-competition.use-case.ts";
export {
  OpenCompetitionRegistrationUseCase,
  type OpenCompetitionRegistrationInput,
} from "./application/open-competition-registration/open-competition-registration.use-case.ts";
export {
  CloseCompetitionRegistrationUseCase,
  type CloseCompetitionRegistrationInput,
} from "./application/close-competition-registration/close-competition-registration.use-case.ts";
export { ListCompetitionParticipantsUseCase } from "./application/list-competition-participants/list-competition-participants.use-case.ts";
export { RemoveCompetitionParticipantUseCase } from "./application/remove-competition-participant/remove-competition-participant.use-case.ts";
export { ChangeCompetitionMembershipRoleUseCase } from "./application/change-competition-membership-role/change-competition-membership-role.use-case.ts";
export {
  ListAccessibleCompetitionsUseCase,
  type AccessibleCompetition,
} from "./application/list-accessible-competitions/list-accessible-competitions.use-case.ts";
export { ListDiscoverableCompetitionsUseCase } from "./application/list-discoverable-competitions/list-discoverable-competitions.use-case.ts";
export { GetDiscoverableCompetitionUseCase } from "./application/get-discoverable-competition/get-discoverable-competition.use-case.ts";
