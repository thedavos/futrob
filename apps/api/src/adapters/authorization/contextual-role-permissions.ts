import { BILLING_PERMISSION, BILLING_PERMISSIONS } from "@futrob/billing";
import { COMPETITION_PERMISSIONS, COMPETITION_ROLE_PERMISSIONS } from "@futrob/competitions";
import {
  ORGANIZATION_PERMISSION,
  ORGANIZATION_PERMISSIONS,
  ORGANIZATION_ROLE_PERMISSIONS,
} from "@futrob/organizations";
import { RESULT_PERMISSIONS } from "@futrob/results";
import { ENCOUNTER_PERMISSIONS } from "@futrob/scheduling";
import { STATISTICS_PERMISSIONS } from "@futrob/statistics";
import type { Permission } from "@futrob/shared-kernel";
import { TEAM_PERMISSIONS } from "@futrob/teams";

export const ALL_PERMISSIONS = [
  ...ORGANIZATION_PERMISSIONS,
  ...COMPETITION_PERMISSIONS,
  ...TEAM_PERMISSIONS,
  ...ENCOUNTER_PERMISSIONS,
  ...RESULT_PERMISSIONS,
  ...STATISTICS_PERMISSIONS,
  ...BILLING_PERMISSIONS,
] satisfies readonly Permission[];

/** Held only through the platform layer (superuser); never part of an organization bundle. */
const PLATFORM_ONLY_PERMISSIONS: ReadonlySet<Permission> = new Set([
  ORGANIZATION_PERMISSION.superusersManage,
  BILLING_PERMISSION.plansAssign,
]);

export function contextualOrganizationRolePermissions(
  role: keyof typeof ORGANIZATION_ROLE_PERMISSIONS,
): readonly Permission[] {
  if (role === "organizer") {
    return ALL_PERMISSIONS.filter((permission) => !PLATFORM_ONLY_PERMISSIONS.has(permission));
  }
  if (role === "staff") {
    return [
      ...ORGANIZATION_ROLE_PERMISSIONS.staff,
      ...COMPETITION_PERMISSIONS,
      ...TEAM_PERMISSIONS,
      ...ENCOUNTER_PERMISSIONS,
      ...RESULT_PERMISSIONS,
      ...STATISTICS_PERMISSIONS,
      BILLING_PERMISSION.read,
      BILLING_PERMISSION.entitlementsRead,
    ];
  }
  return [...ORGANIZATION_ROLE_PERMISSIONS.member, BILLING_PERMISSION.entitlementsRead];
}

export function contextualCompetitionRolePermissions(
  role: keyof typeof COMPETITION_ROLE_PERMISSIONS,
): readonly Permission[] {
  return role === "staff"
    ? [
        ...COMPETITION_ROLE_PERMISSIONS.staff,
        ...TEAM_PERMISSIONS,
        ...ENCOUNTER_PERMISSIONS,
        ...RESULT_PERMISSIONS,
        ...STATISTICS_PERMISSIONS,
      ]
    : COMPETITION_ROLE_PERMISSIONS[role];
}
