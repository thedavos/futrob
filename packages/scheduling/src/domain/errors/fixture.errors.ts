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

export class FixtureGenerationConflict extends TaggedError("FixtureGenerationConflict")<{
  code: "scheduling.fixture_generation_conflict";
  message: string;
}> {}

export class FixtureSupersedeConflict extends TaggedError("FixtureSupersedeConflict")<{
  code: "scheduling.fixture_supersede_conflict";
  message: string;
}> {}

export type GenerateCompetitionFixtureError =
  | FixtureAuthorizationForbidden
  | FixtureSourceNotFound
  | FixtureSourceNotPublished
  | InvalidFixtureConfiguration
  | FixtureGenerationConflict
  | FixtureSupersedeConflict;

export type EditFixtureEncounterError =
  | FixtureAuthorizationForbidden
  | FixturePlanNotFound
  | FixtureEncounterNotFound
  | FixtureEncounterNotEditable
  | InvalidFixtureConfiguration
  | FixtureUpdateConflict;

/** DEC-017: a tie without configured tie-break data never advances by seed. */
export class TieRequiresOrganizerReview extends TaggedError("TieRequiresOrganizerReview")<{
  code: "scheduling.tie_requires_organizer_review";
  message: string;
  encounterId: EncounterId;
}> {}

/** The destination already has a selection or official result, so its Team cannot change. */
export class AdvancementNotReversible extends TaggedError("AdvancementNotReversible")<{
  code: "scheduling.advancement_not_reversible";
  message: string;
  encounterId: EncounterId;
}> {}

export type AdvanceFixtureFromOfficialResultError =
  | FixtureSourceNotFound
  | TieRequiresOrganizerReview
  | AdvancementNotReversible
  | FixtureUpdateConflict;
