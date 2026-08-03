import { TaggedError } from "@futrob/shared-kernel";

export class InvalidOrganizationName extends TaggedError("InvalidOrganizationName")<{
  code: "organizations.invalid_name";
  message: string;
}> {}

export class OrganizationNameConflict extends TaggedError("OrganizationNameConflict")<{
  code: "organizations.name_conflict";
  message: string;
}> {}

export type CreateOrganizationError = InvalidOrganizationName | OrganizationNameConflict;
