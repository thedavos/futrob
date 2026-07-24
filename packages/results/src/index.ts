export type {
  OfficialMatchSelection,
  OfficialSlotSelection,
} from "./domain/entities/official-match-selection.ts";
export type { SelectionStatus } from "./domain/value-objects/selection-status.ts";
export type {
  EncounterReaderPort,
  EncounterScheduleSnapshot,
} from "./domain/ports/encounter-reader.port.ts";
export type { ProviderMatchReaderPort } from "./domain/ports/provider-match-reader.port.ts";
export type { OfficialResultApprovedEvent } from "./domain/events/official-result-approved.event.ts";
export {
  SelectOfficialMatchesUseCase,
  type SelectOfficialMatchesInput,
} from "./application/select-official-matches/select-official-matches.use-case.ts";
