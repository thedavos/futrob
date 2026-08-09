import { z } from "zod";

export const permissionSchema = z.string().regex(/^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/);

export const authorizationScopeTypeSchema = z.enum([
  "platform",
  "organization",
  "competition",
  "team",
  "encounter",
]);

export const authorizationScopeSchema = z.object({
  organizationId: z.string().min(1).optional(),
  competitionId: z.string().min(1).optional(),
  teamId: z.string().min(1).optional(),
  encounterId: z.string().min(1).optional(),
});

export const getEffectiveAccessQuerySchema = authorizationScopeSchema.extend({
  permissions: z
    .string()
    .transform((value) => value.split(",").map((permission) => permission.trim()))
    .pipe(z.array(permissionSchema).min(1).max(200))
    .optional(),
});

export const effectiveRoleSchema = z.object({
  scopeType: authorizationScopeTypeSchema,
  scopeId: z.string().min(1),
  role: z.string().min(1),
});

export const effectivePermissionSchema = z.object({
  permission: permissionSchema,
  allowed: z.boolean(),
  decidedAt: authorizationScopeTypeSchema,
});

export const effectiveAccessSchema = z.object({
  actorId: z.string().min(1),
  scope: authorizationScopeSchema,
  roles: z.array(effectiveRoleSchema),
  permissions: z.array(effectivePermissionSchema),
});

export const upsertAccessGrantRequestSchema = authorizationScopeSchema.extend({
  id: z.string().uuid().optional(),
  targetActorId: z.string().min(1),
  organizationId: z.string().min(1).nullable(),
  permission: permissionSchema,
  effect: z.enum(["allow", "deny"]),
  scopeType: authorizationScopeTypeSchema,
  scopeId: z.string().min(1),
  reason: z.string().trim().min(1).max(500).optional(),
});

export const listAccessGrantsQuerySchema = authorizationScopeSchema.extend({
  targetActorId: z.string().min(1).optional(),
  scopeType: authorizationScopeTypeSchema,
  scopeId: z.string().min(1),
});

export const accessGrantSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1).nullable(),
  actorId: z.string().min(1),
  permission: permissionSchema,
  effect: z.enum(["allow", "deny"]),
  scopeType: authorizationScopeTypeSchema,
  scopeId: z.string().min(1),
  grantedByActorId: z.string().min(1),
  reason: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export const listAccessGrantsResponseSchema = z.object({ grants: z.array(accessGrantSchema) });

export const deleteAccessGrantQuerySchema = authorizationScopeSchema.extend({
  reason: z.string().trim().min(1).max(500).optional(),
});

export const changeOrganizationRoleRequestSchema = z.object({
  role: z.enum(["organizer", "staff", "member"]),
  reason: z.string().trim().min(1).max(500).optional(),
});

export const organizationRoleAssignmentSchema = z.object({
  organizationId: z.string().min(1),
  actorId: z.string().min(1),
  role: z.enum(["organizer", "staff", "member"]),
  createdAt: z.string().datetime(),
});

export const changeCompetitionRoleRequestSchema = z.object({
  role: z.enum(["staff", "captain", "player"]),
  reason: z.string().trim().min(1).max(500).optional(),
});

export const competitionRoleAssignmentSchema = z.object({
  organizationId: z.string().min(1),
  competitionId: z.string().min(1),
  actorId: z.string().min(1),
  role: z.enum(["staff", "captain", "player"]),
  createdAt: z.string().datetime(),
});

export const manageSuperuserRequestSchema = z.object({
  reason: z.string().trim().min(1).max(500).optional(),
});

export const platformRoleAssignmentSchema = z.object({
  actorId: z.string().min(1),
  role: z.literal("superuser"),
  assignedByActorId: z.string().min(1),
  createdAt: z.string().datetime(),
});

export type PermissionDto = z.infer<typeof permissionSchema>;
export type AuthorizationScopeDto = z.infer<typeof authorizationScopeSchema>;
export type EffectiveAccessDto = z.infer<typeof effectiveAccessSchema>;
export type UpsertAccessGrantRequest = z.infer<typeof upsertAccessGrantRequestSchema>;
export type AccessGrantDto = z.infer<typeof accessGrantSchema>;
export type ListAccessGrantsQuery = z.infer<typeof listAccessGrantsQuerySchema>;
export type ListAccessGrantsResponse = z.infer<typeof listAccessGrantsResponseSchema>;
export type ChangeOrganizationRoleRequest = z.infer<typeof changeOrganizationRoleRequestSchema>;
export type OrganizationRoleAssignmentDto = z.infer<typeof organizationRoleAssignmentSchema>;
export type ChangeCompetitionRoleRequest = z.infer<typeof changeCompetitionRoleRequestSchema>;
export type CompetitionRoleAssignmentDto = z.infer<typeof competitionRoleAssignmentSchema>;
export type ManageSuperuserRequest = z.infer<typeof manageSuperuserRequestSchema>;
export type PlatformRoleAssignmentDto = z.infer<typeof platformRoleAssignmentSchema>;
