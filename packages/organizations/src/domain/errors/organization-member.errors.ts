import { TaggedError } from "@futrob/shared-kernel";

export class OrganizationMemberDirectoryLimitReached extends TaggedError(
  "OrganizationMemberDirectoryLimitReached",
)<{
  code: "organizations.member_directory_limit_reached";
  message: string;
}> {}

export class OrganizationMemberDirectoryCatalogLimitReached extends TaggedError(
  "OrganizationMemberDirectoryCatalogLimitReached",
)<{
  code: "organizations.member_directory_catalog_limit_reached";
  message: string;
}> {}

export type ListOrganizationMembersError =
  | OrganizationMemberDirectoryLimitReached
  | OrganizationMemberDirectoryCatalogLimitReached;
