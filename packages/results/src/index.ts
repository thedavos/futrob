export type {
  OfficialMatchSelection,
  OfficialSlotSelection,
} from "./domain/entities/official-match-selection.ts";
export type {
  OfficialResult,
  OfficialResultSlotSnapshot,
  OfficialResultStatus,
} from "./domain/entities/official-result.ts";
export type { OfficialSelectionProposal } from "./domain/entities/official-match-selection.ts";
export type {
  ConfirmationAction,
  ConfirmationActionDetails,
  ConfirmationActionType,
  ConfirmationCapacity,
} from "./domain/entities/confirmation-action.ts";
export type {
  MatchDispute,
  MatchDisputeResolution,
  MatchDisputeStatus,
} from "./domain/entities/match-dispute.ts";
export type { OfficialResultApprovalBasis } from "./domain/entities/official-result.ts";
export type { SelectionStatus } from "./domain/value-objects/selection-status.ts";
export {
  canApplySelectionCommand,
  isUnderDispute,
  selectionCommandsFor,
  type SelectionCommand,
} from "./domain/policies/selection-transitions.ts";
export {
  equivalentSlotSelections,
  normalizeSlotSelection,
  slotSelectionKey,
} from "./domain/policies/slot-selection.ts";
export {
  integrityFlagsFor,
  type IntegrityFlag,
  type IntegrityFlagCode,
} from "./domain/policies/integrity-flags.ts";
export type {
  TeamRepresentation,
  TeamRepresentationPort,
} from "./domain/ports/team-representation.port.ts";
export {
  asEncounterStageId,
  type EncounterReaderPort,
  type EncounterScheduleSnapshot,
  type EncounterStageId,
} from "./domain/ports/encounter-reader.port.ts";
export type {
  CandidateMatchQuery,
  CandidateMatchReadResult,
  ProviderMatchReaderPort,
} from "./domain/ports/provider-match-reader.port.ts";
export type { EncounterCandidateAssociation } from "./domain/entities/encounter-candidate-association.ts";
export type {
  EncounterCandidateAssociationRepository,
  EncounterCandidateSetSnapshot,
  ReplaceEncounterCandidatesResult,
  WriteIfEligibleResult,
} from "./domain/ports/encounter-candidate-association.repository.ts";
export type {
  CommitSelectionTransitionResult,
  OfficialMatchSelectionRepository,
  OfficialResultRepository,
  SelectionReferenceClaims,
  SelectionTransition,
} from "./domain/ports/official-result.repository.ts";
export type { OfficialResultReaderPort } from "./domain/ports/official-result-reader.port.ts";
export type { OfficialResultApprovedEvent } from "./domain/events/official-result-approved.event.ts";
export type { OfficialResultVoidedEvent } from "./domain/events/official-result-voided.event.ts";
export { RESULT_PERMISSION, RESULT_PERMISSIONS } from "./domain/policies/result-permissions.ts";
export {
  CANDIDATE_WINDOW_HALF_HOURS,
  candidateWindowFor,
  type CandidateWindow,
} from "./domain/policies/candidate-window.ts";
export {
  EncounterNotFound,
  InvalidSelection,
  OfficialSelectionForbidden,
  DuplicateProviderMatch,
  CandidateNotAssociated,
  type SelectOfficialMatchesError,
} from "./domain/errors/select-official-matches.errors.ts";
export {
  CandidateDataUnavailable,
  type ListEncounterCandidatesError,
} from "./domain/errors/encounter-candidates.errors.ts";
export {
  CommandKeyReused,
  IntegrityFlagsNotAcknowledged,
  ProposalNotFound,
  ReasonRequired,
  ReferenceAlreadyClaimed,
  SelectionAlreadyApproved,
  SelectionProposalStale,
  SelectionStateConflict,
  SelectionVersionConflict,
  SelfConfirmationForbidden,
  type GetOfficialSelectionError,
  type OpenMatchDisputeError,
  type ProposeAlternativeOfficialSelectionError,
  type ProposeOfficialSelectionError,
  type RejectOfficialSelectionError,
  type ResolveMatchDisputeError,
  type ReviewMatchDisputeError,
} from "./domain/errors/official-selection.errors.ts";
export {
  SelectionNotFound,
  SelectionNotConfirmable,
  OfficialResultForbidden,
  OfficialResultNotFound,
  ProviderMatchSnapshotMissing,
  type ConfirmOfficialSelectionError,
  type ApproveOfficialResultError,
  type VoidOfficialResultError,
} from "./domain/errors/official-result.errors.ts";
export {
  AssociateEncounterCandidatesUseCase,
  type AssociateEncounterCandidatesError,
  type AssociateEncounterCandidatesInput,
  type AssociateEncounterCandidatesOutput,
} from "./application/associate-encounter-candidates/associate-encounter-candidates.use-case.ts";
export {
  RecalculateEncounterCandidatesUseCase,
  type RecalculateEncounterCandidatesInput,
} from "./application/recalculate-encounter-candidates/recalculate-encounter-candidates.use-case.ts";
export {
  ListEncounterCandidatesUseCase,
  type EncounterCandidateSummary,
  type EncounterCandidateTeam,
  type ListEncounterCandidatesInput,
  type ListEncounterCandidatesOutput,
} from "./application/list-encounter-candidates/list-encounter-candidates.use-case.ts";
export type {
  OfficialSelectionAllowedAction,
  OfficialSelectionCommandOutput,
  OfficialSelectionView,
} from "./application/official-selection-output.ts";
export {
  SelectOfficialMatchesUseCase,
  type SelectOfficialMatchesInput,
} from "./application/select-official-matches/select-official-matches.use-case.ts";
export {
  RejectOfficialSelectionUseCase,
  type RejectOfficialSelectionInput,
} from "./application/reject-official-selection/reject-official-selection.use-case.ts";
export {
  ProposeAlternativeOfficialSelectionUseCase,
  type ProposeAlternativeOfficialSelectionInput,
} from "./application/propose-alternative-official-selection/propose-alternative-official-selection.use-case.ts";
export {
  OpenMatchDisputeUseCase,
  type OpenMatchDisputeInput,
} from "./application/open-match-dispute/open-match-dispute.use-case.ts";
export {
  ReviewMatchDisputeUseCase,
  type ReviewMatchDisputeInput,
} from "./application/review-match-dispute/review-match-dispute.use-case.ts";
export {
  ResolveMatchDisputeUseCase,
  type MatchDisputeDecision,
  type ResolveMatchDisputeInput,
} from "./application/resolve-match-dispute/resolve-match-dispute.use-case.ts";
export {
  GetOfficialSelectionUseCase,
  type GetOfficialSelectionInput,
} from "./application/get-official-selection/get-official-selection.use-case.ts";
export {
  ConfirmOfficialSelectionUseCase,
  type ConfirmOfficialSelectionInput,
} from "./application/confirm-official-selection/confirm-official-selection.use-case.ts";
export {
  VoidOfficialResultUseCase,
  type VoidOfficialResultDependencies,
  type VoidOfficialResultInput,
} from "./application/void-official-result/void-official-result.use-case.ts";
