import { TaggedError, type Permission } from "@futrob/shared-kernel";

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

export type UpsertEncounterScheduleError =
  | EncounterScheduleAuthorizationForbidden
  | InvalidEncounterSchedule;
