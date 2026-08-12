export type { Encounter, OfficialMatchSlot } from "./domain/entities/encounter.ts";
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
export type {
  EncounterParticipantValidationPort,
  EncounterScheduleRepository,
} from "./domain/ports/encounter-schedule.repository.ts";
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
export type { EncounterCreatedEvent } from "./domain/events/encounter-created.event.ts";
export {
  fixtureGenerationFingerprint,
  fixtureGenerationKey,
  generateFixturePlan,
} from "./domain/policies/generate-fixture-plan.ts";
export { replaceEncounter } from "./domain/policies/edit-fixture-encounter.ts";
export type { RescheduleScope } from "./domain/value-objects/reschedule-scope.ts";
export type { EncounterRescheduledEvent } from "./domain/events/encounter-rescheduled.event.ts";
export {
  ENCOUNTER_PERMISSION,
  ENCOUNTER_PERMISSIONS,
} from "./domain/policies/encounter-permissions.ts";
