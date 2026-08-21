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
] satisfies readonly Permission[];

export function contextualOrganizationRolePermissions(
  role: keyof typeof ORGANIZATION_ROLE_PERMISSIONS,
): readonly Permission[] {
  if (role === "organizer") {
    return ALL_PERMISSIONS.filter(
      (permission) => permission !== ORGANIZATION_PERMISSION.superusersManage,
    );
  }
  if (role === "staff") {
    return [
      ...ORGANIZATION_ROLE_PERMISSIONS.staff,
      ...COMPETITION_PERMISSIONS,
      ...TEAM_PERMISSIONS,
      ...ENCOUNTER_PERMISSIONS,
      ...RESULT_PERMISSIONS,
      ...STATISTICS_PERMISSIONS,
    ];
  }
  return ORGANIZATION_ROLE_PERMISSIONS.member;
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
