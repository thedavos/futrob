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
export type {
  CompetitionRankingEligibility,
  CompetitionRules,
} from "./domain/entities/competition-rules.ts";
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
  ACTIVE_COMPETITION_STATUSES,
  isActiveCompetitionStatus,
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
  CompetitionFormatNotInPlan,
  CompetitionPlanLimitReached,
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
export type {
  CompetitionPlanLimits,
  CompetitionPlanLimitsPort,
} from "./domain/ports/competition-plan-limits.port.ts";
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

export {
  DIRECTED_ENTRY_INVITATION_TTL_DAYS,
  ENTRY_INVITATION_CHANNEL,
  ENTRY_INVITATION_MESSAGE_MAX_LENGTH,
  ENTRY_INVITATION_STATUS,
  type EntryInvitation,
  type EntryInvitationChannel,
  type EntryInvitationStatus,
} from "./domain/entities/entry-invitation.ts";
export {
  EntryInvitationAlreadyDecided,
  EntryInvitationExpired,
  EntryInvitationForbidden,
  EntryInvitationNotFound,
  EntryInvitationPendingConflict,
  EntryInvitationRevoked,
  InvalidEntryInvitationMessage,
  type DeclineEntryInvitationError,
  type EntryInvitationEligibilityError,
  type InviteTeamCaptainError,
  type ManageEntryInvitationsError,
  type PublicEntryInvitationLinkError,
  type ResolveEntryInvitationError,
  type RevokeEntryInvitationError,
} from "./domain/errors/entry-invitation.errors.ts";
export type { EntryInvitationRepository } from "./domain/ports/entry-invitation.repository.ts";
export type { EntryInvitationCodePort } from "./domain/ports/entry-invitation-code.port.ts";
export {
  InviteTeamCaptainUseCase,
  type InviteTeamCaptainInput,
} from "./application/entry-invitations/invite-team-captain.use-case.ts";
export {
  EnsureEntryInvitationLinkUseCase,
  RegenerateEntryInvitationLinkUseCase,
  ResolvePublicEntryInvitationLinkUseCase,
} from "./application/entry-invitations/entry-invitation-link.use-cases.ts";
export {
  RevokeEntryInvitationUseCase,
  type RevokeEntryInvitationInput,
} from "./application/entry-invitations/revoke-entry-invitation.use-case.ts";
export {
  ListCompetitionEntryInvitationsUseCase,
  ListMyEntryInvitationsUseCase,
} from "./application/entry-invitations/list-entry-invitations.use-cases.ts";
export {
  DeclineEntryInvitationUseCase,
  RecordEntryInvitationAcceptanceUseCase,
  ResolveEntryInvitationUseCase,
  type EntryInvitationReference,
  type ResolvedEntryInvitation,
} from "./application/entry-invitations/respond-to-entry-invitation.use-cases.ts";
export type { EntryInvitationScope } from "./application/entry-invitations/manage-entry-invitations.guard.ts";
export {
  RegisterInvitedEntryUseCase,
  type RegisterInvitedEntryError,
} from "./application/entry-invitations/register-invited-entry.use-case.ts";
