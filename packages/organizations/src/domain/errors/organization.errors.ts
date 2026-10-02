import { TaggedError } from "@futrob/shared-kernel";

export class InvalidOrganizationName extends TaggedError("InvalidOrganizationName")<{
  code: "organizations.invalid_name";
  message: string;
}> {}

export class OrganizationNameConflict extends TaggedError("OrganizationNameConflict")<{
  code: "organizations.name_conflict";
  message: string;
}> {}

export class InvalidOrganizationSlug extends TaggedError("InvalidOrganizationSlug")<{
  code: "organizations.invalid_slug";
  message: string;
}> {}

export class OrganizationSlugConflict extends TaggedError("OrganizationSlugConflict")<{
  code: "organizations.slug_conflict";
  message: string;
}> {}

export class InvalidOrganizationTimeZone extends TaggedError("InvalidOrganizationTimeZone")<{
  code: "organizations.invalid_time_zone";
  message: string;
}> {}

export class InvalidOrganizationLogo extends TaggedError("InvalidOrganizationLogo")<{
  code: "organizations.invalid_logo";
  message: string;
}> {}

export type CreateOrganizationError =
  | InvalidOrganizationName
  | OrganizationNameConflict
  | InvalidOrganizationSlug
  | OrganizationSlugConflict
  | InvalidOrganizationTimeZone;
