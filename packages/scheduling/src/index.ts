export type { Encounter, OfficialMatchSlot } from "./domain/entities/encounter.ts";
export {
  asFixtureRoundId,
  asFixtureStageId,
  type FixtureEncounter,
  type FixtureFormat,
  type FixtureGenerationSpec,
  type FixtureParticipantSlot,
  type FixturePlan,
  type FixtureRound,
  type FixtureRoundId,
  type FixtureStage,
  type FixtureStageId,
} from "./domain/entities/fixture-plan.ts";
export type { EncounterScheduleSnapshot } from "./domain/entities/encounter-schedule-snapshot.ts";
export type { OfficialMatch, OfficialMatchStatus } from "./domain/entities/official-match.ts";
export type {
  EncounterParticipantValidationPort,
  EncounterScheduleRepository,
} from "./domain/ports/encounter-schedule.repository.ts";
export type { OfficialMatchRepository } from "./domain/ports/official-match.repository.ts";
export type {
  CompetitionFixtureSourcePort,
  CompetitionFixtureSourceSnapshot,
  FixturePlanRepository,
} from "./domain/ports/fixture-plan.repository.ts";
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
  EncounterScheduleAuthorizationForbidden,
  InvalidEncounterSchedule,
  EncounterScheduleNotFound,
  type UpsertEncounterScheduleError,
  type MaterializeOfficialMatchesError,
} from "./domain/errors/encounter-schedule.errors.ts";
export {
  FixtureAuthorizationForbidden,
  FixtureSourceNotFound,
  FixtureSourceNotPublished,
  InvalidFixtureConfiguration,
  type GenerateCompetitionFixtureError,
} from "./domain/errors/fixture.errors.ts";
export type { EncounterCreatedEvent } from "./domain/events/encounter-created.event.ts";
export {
  fixtureGenerationKey,
  generateFixturePlan,
} from "./domain/policies/generate-fixture-plan.ts";
export type { RescheduleScope } from "./domain/value-objects/reschedule-scope.ts";
export type { EncounterRescheduledEvent } from "./domain/events/encounter-rescheduled.event.ts";
export {
  ENCOUNTER_PERMISSION,
  ENCOUNTER_PERMISSIONS,
} from "./domain/policies/encounter-permissions.ts";
