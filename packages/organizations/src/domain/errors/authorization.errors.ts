import { TaggedError, type Permission } from "@futrob/shared-kernel";

export class AuthorizationForbidden extends TaggedError("AuthorizationForbidden")<{
  code: "authorization.forbidden";
  message: string;
  permission: Permission;
}> {}

export class AuthorizationScopeNotFound extends TaggedError("AuthorizationScopeNotFound")<{
  code: "authorization.scope_not_found";
  message: string;
}> {}

export class AccessGrantNotFound extends TaggedError("AccessGrantNotFound")<{
  code: "authorization.grant_not_found";
  message: string;
  grantId: string;
}> {}

export class LastSuperuserProtected extends TaggedError("LastSuperuserProtected")<{
  code: "authorization.last_superuser";
  message: string;
}> {}

export class PlatformRoleNotFound extends TaggedError("PlatformRoleNotFound")<{
  code: "authorization.platform_role_not_found";
  message: string;
}> {}

export class OrganizationMembershipNotFound extends TaggedError("OrganizationMembershipNotFound")<{
  code: "authorization.membership_not_found";
  message: string;
}> {}

export class LastOrganizerProtected extends TaggedError("LastOrganizerProtected")<{
  code: "authorization.last_organizer";
  message: string;
}> {}

export type ManageAccessGrantError =
  | AuthorizationForbidden
  | AuthorizationScopeNotFound
  | AccessGrantNotFound
  | OrganizationMembershipNotFound;

export type ManageSuperuserError =
  | AuthorizationForbidden
  | LastSuperuserProtected
  | PlatformRoleNotFound;
export type ManageOrganizationRoleError =
  | AuthorizationForbidden
  | OrganizationMembershipNotFound
  | LastOrganizerProtected;
