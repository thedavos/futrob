import {
  TaggedError,
  type CompetitionId,
  type EncounterId,
  type Permission,
} from "@futrob/shared-kernel";

export class FixtureAuthorizationForbidden extends TaggedError("FixtureAuthorizationForbidden")<{
  code: "authorization.forbidden";
  message: string;
  permission: Permission;
}> {}

export class FixtureSourceNotFound extends TaggedError("FixtureSourceNotFound")<{
  code: "scheduling.fixture_source_not_found";
  message: string;
  competitionId: CompetitionId;
}> {}

export class FixtureSourceNotPublished extends TaggedError("FixtureSourceNotPublished")<{
  code: "scheduling.fixture_source_not_published";
  message: string;
  competitionId: CompetitionId;
}> {}

export class InvalidFixtureConfiguration extends TaggedError("InvalidFixtureConfiguration")<{
  code: "scheduling.invalid_fixture_configuration";
  message: string;
}> {}

export class FixturePlanNotFound extends TaggedError("FixturePlanNotFound")<{
  code: "scheduling.fixture_plan_not_found";
  message: string;
  competitionId: CompetitionId;
}> {}

export class FixtureEncounterNotFound extends TaggedError("FixtureEncounterNotFound")<{
  code: "scheduling.fixture_encounter_not_found";
  message: string;
  encounterId: EncounterId;
}> {}

export class FixtureEncounterNotEditable extends TaggedError("FixtureEncounterNotEditable")<{
  code: "scheduling.fixture_encounter_not_editable";
  message: string;
  encounterId: EncounterId;
}> {}

export class FixtureUpdateConflict extends TaggedError("FixtureUpdateConflict")<{
  code: "scheduling.fixture_update_conflict";
  message: string;
}> {}

export type GenerateCompetitionFixtureError =
  | FixtureAuthorizationForbidden
  | FixtureSourceNotFound
  | FixtureSourceNotPublished
  | InvalidFixtureConfiguration;

export type EditFixtureEncounterError =
  | FixtureAuthorizationForbidden
  | FixturePlanNotFound
  | FixtureEncounterNotFound
  | FixtureEncounterNotEditable
  | InvalidFixtureConfiguration
  | FixtureUpdateConflict;
