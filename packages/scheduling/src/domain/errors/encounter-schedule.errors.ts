import { TaggedError, type EncounterId, type Permission } from "@futrob/shared-kernel";

export class EncounterScheduleAuthorizationForbidden extends TaggedError(
  "EncounterScheduleAuthorizationForbidden",
)<{
  code: "authorization.forbidden";
  message: string;
  permission: Permission;
}> {}

export class InvalidEncounterSchedule extends TaggedError("InvalidEncounterSchedule")<{
  code: "scheduling.invalid_encounter_schedule";
  message: string;
}> {}

export class EncounterScheduleNotFound extends TaggedError("EncounterScheduleNotFound")<{
  code: "scheduling.encounter_schedule_not_found";
  message: string;
  encounterId: EncounterId;
}> {}

export type UpsertEncounterScheduleError =
  | EncounterScheduleAuthorizationForbidden
  | InvalidEncounterSchedule;

export type MaterializeOfficialMatchesError =
  | EncounterScheduleAuthorizationForbidden
  | EncounterScheduleNotFound;
