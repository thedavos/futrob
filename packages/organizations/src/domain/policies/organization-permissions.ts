import type { Permission } from "@futrob/shared-kernel";
import type { OrgMembershipRole } from "../value-objects/organization-membership-role.ts";

export const ORGANIZATION_PERMISSION = {
  read: "organizations.read",
  update: "organizations.update",
  membershipsRead: "organizations.memberships.read",
  membershipsManage: "organizations.memberships.manage",
  invitationsManage: "organizations.invitations.manage",
  grantsManage: "authorization.grants.manage",
  rolesManage: "authorization.roles.manage",
  auditRead: "authorization.audit.read",
  superusersManage: "authorization.superusers.manage",
} as const satisfies Record<string, Permission>;

export const ORGANIZATION_PERMISSIONS = Object.values(ORGANIZATION_PERMISSION);

export const ORGANIZATION_ROLE_PERMISSIONS: Readonly<
  Record<OrgMembershipRole, readonly Permission[]>
> = {
  organizer: ORGANIZATION_PERMISSIONS.filter(
    (permission) => permission !== ORGANIZATION_PERMISSION.superusersManage,
  ),
  staff: [
    ORGANIZATION_PERMISSION.read,
    ORGANIZATION_PERMISSION.membershipsRead,
    ORGANIZATION_PERMISSION.invitationsManage,
  ],
  member: [ORGANIZATION_PERMISSION.read],
};
