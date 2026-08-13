export type {
  OfficialMatchSelection,
  OfficialSlotSelection,
} from "./domain/entities/official-match-selection.ts";
export type {
  OfficialResult,
  OfficialResultSlotSnapshot,
  OfficialResultStatus,
} from "./domain/entities/official-result.ts";
export type { SelectionStatus } from "./domain/value-objects/selection-status.ts";
export type {
  EncounterReaderPort,
  EncounterScheduleSnapshot,
} from "./domain/ports/encounter-reader.port.ts";
export type { ProviderMatchReaderPort } from "./domain/ports/provider-match-reader.port.ts";
export type {
  OfficialMatchSelectionRepository,
  OfficialResultRepository,
} from "./domain/ports/official-result.repository.ts";
export type { OfficialResultReaderPort } from "./domain/ports/official-result-reader.port.ts";
export type { OfficialResultApprovedEvent } from "./domain/events/official-result-approved.event.ts";
export type { OfficialResultVoidedEvent } from "./domain/events/official-result-voided.event.ts";
export { RESULT_PERMISSION, RESULT_PERMISSIONS } from "./domain/policies/result-permissions.ts";
export {
  EncounterNotFound,
  InvalidSelection,
  OfficialSelectionForbidden,
  DuplicateProviderMatch,
  type SelectOfficialMatchesError,
} from "./domain/errors/select-official-matches.errors.ts";
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
  SelectOfficialMatchesUseCase,
  type SelectOfficialMatchesInput,
} from "./application/select-official-matches/select-official-matches.use-case.ts";
export {
  ConfirmOfficialSelectionUseCase,
  type ConfirmOfficialSelectionInput,
} from "./application/confirm-official-selection/confirm-official-selection.use-case.ts";
export {
  VoidOfficialResultUseCase,
  type VoidOfficialResultDependencies,
  type VoidOfficialResultInput,
} from "./application/void-official-result/void-official-result.use-case.ts";
