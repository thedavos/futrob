import {
  effectiveAccessSchema,
  accessGrantSchema,
  upsertAccessGrantRequestSchema,
  changeOrganizationRoleRequestSchema,
  changeCompetitionRoleRequestSchema,
  competitionRoleAssignmentSchema,
  organizationRoleAssignmentSchema,
  manageSuperuserRequestSchema,
} from "@futrob/api-contracts";
import { namedSchema } from "@/http/openapi/named-schema.ts";

export const EffectiveAccess = namedSchema("EffectiveAccess", effectiveAccessSchema);
export const AccessGrant = namedSchema("AccessGrant", accessGrantSchema);
export const UpsertAccessGrantRequest = namedSchema(
  "UpsertAccessGrantRequest",
  upsertAccessGrantRequestSchema,
);
export const ChangeOrganizationRoleRequest = namedSchema(
  "ChangeOrganizationRoleRequest",
  changeOrganizationRoleRequestSchema,
);
export const OrganizationRoleAssignment = namedSchema(
  "OrganizationRoleAssignment",
  organizationRoleAssignmentSchema,
);
export const ChangeCompetitionRoleRequest = namedSchema(
  "ChangeCompetitionRoleRequest",
  changeCompetitionRoleRequestSchema,
);
export const CompetitionRoleAssignment = namedSchema(
  "CompetitionRoleAssignment",
  competitionRoleAssignmentSchema,
);
export const ManageSuperuserRequest = namedSchema(
  "ManageSuperuserRequest",
  manageSuperuserRequestSchema,
);
