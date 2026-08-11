import { TaggedError, type CompetitionId, type Permission } from "@futrob/shared-kernel";

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

export type GenerateCompetitionFixtureError =
  | FixtureAuthorizationForbidden
  | FixtureSourceNotFound
  | FixtureSourceNotPublished
  | InvalidFixtureConfiguration;
