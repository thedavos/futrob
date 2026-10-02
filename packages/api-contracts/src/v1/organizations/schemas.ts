import { z } from "zod";

export const orgMembershipRoleSchema = z.enum(["organizer", "staff", "member"]);

export type OrgMembershipRoleDto = z.infer<typeof orgMembershipRoleSchema>;

export const organizationInviteRoleSchema = z.enum(["staff", "member"]);
export const competitionInviteRoleSchema = z.enum(["staff", "captain", "player"]);
export const inviteRoleSchema = z.union([
  organizationInviteRoleSchema,
  competitionInviteRoleSchema,
]);

export type InviteRoleDto = z.infer<typeof inviteRoleSchema>;

export const organizationLogoSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("monogram") }),
  z.object({ kind: z.literal("upload"), key: z.string().min(1).max(300) }),
]);

export type OrganizationLogoDto = z.infer<typeof organizationLogoSchema>;

export const membershipSummarySchema = z.object({
  organizationId: z.string().min(1),
  organizationName: z.string().min(1),
  organizationSlug: z.string().min(1),
  organizationLogo: organizationLogoSchema,
  role: orgMembershipRoleSchema,
});

export type MembershipSummaryDto = z.infer<typeof membershipSummarySchema>;

export const listMyMembershipsResponseSchema = z.object({
  memberships: z.array(membershipSummarySchema),
});

export type ListMyMembershipsResponse = z.infer<typeof listMyMembershipsResponseSchema>;

const organizationNameSchema = z.string().trim().min(1).max(120);

/** Parsed by the domain, which answers `organizations.invalid_slug`. */
const organizationSlugInputSchema = z.string().trim().min(1).max(100);

/** Parsed by the domain, which answers `organizations.invalid_time_zone`. */
const organizationTimeZoneInputSchema = z.string().trim().min(1).max(100);

export const organizationProfileSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  timeZone: z.string().min(1),
  logo: organizationLogoSchema,
});

export type OrganizationProfileDto = z.infer<typeof organizationProfileSchema>;

export const createOrganizationRequestSchema = z.object({
  name: organizationNameSchema,
  timeZone: organizationTimeZoneInputSchema,
  /** Derived from the name when omitted. */
  slug: organizationSlugInputSchema.optional(),
  /** Lets a retried submit return the organization it already created. */
  creationKey: z
    .string()
    .regex(/^[A-Za-z0-9_-]{1,120}$/)
    .optional(),
});

export type CreateOrganizationRequest = z.infer<typeof createOrganizationRequestSchema>;

export const createOrganizationResponseSchema = organizationProfileSchema.extend({
  role: z.literal("organizer"),
});

export type CreateOrganizationResponse = z.infer<typeof createOrganizationResponseSchema>;

export const organizationNameAvailabilityRequestSchema = z.object({ name: organizationNameSchema });
export type OrganizationNameAvailabilityRequest = z.infer<
  typeof organizationNameAvailabilityRequestSchema
>;

export const organizationNameAvailabilityResponseSchema = z.object({ available: z.boolean() });
export type OrganizationNameAvailabilityResponse = z.infer<
  typeof organizationNameAvailabilityResponseSchema
>;

export const organizationSlugAvailabilityRequestSchema = z.object({
  slug: organizationSlugInputSchema,
  /** When editing, the slug this organization already owns counts as available. */
  organizationId: z.string().min(1).optional(),
});
export type OrganizationSlugAvailabilityRequest = z.infer<
  typeof organizationSlugAvailabilityRequestSchema
>;

export const organizationSlugAvailabilityResponseSchema = z.object({
  available: z.boolean(),
  reason: z.enum(["invalid", "taken"]).optional(),
  /** A valid, free slug close to the one asked for. */
  suggestion: z.string().nullable().optional(),
});
export type OrganizationSlugAvailabilityResponse = z.infer<
  typeof organizationSlugAvailabilityResponseSchema
>;

export const updateOrganizationProfileRequestSchema = z
  .object({
    name: organizationNameSchema.optional(),
    slug: organizationSlugInputSchema.optional(),
    timeZone: organizationTimeZoneInputSchema.optional(),
  })
  .refine(
    (value) => value.name !== undefined || value.slug !== undefined || value.timeZone !== undefined,
    { message: "At least one field is required" },
  );
export type UpdateOrganizationProfileRequest = z.infer<
  typeof updateOrganizationProfileRequestSchema
>;

/** Registers a logo already stored by the web (`upload`) or goes back to the monogram. */
export const setOrganizationLogoRequestSchema = z.object({ logo: organizationLogoSchema });
export type SetOrganizationLogoRequest = z.infer<typeof setOrganizationLogoRequestSchema>;

export const redeemPolicySchema = z.enum(["single", "multi"]);

export type RedeemPolicyDto = z.infer<typeof redeemPolicySchema>;

function invitationRequestSchema<Role extends z.ZodType>(role: Role) {
  return z
    .object({
      role,
      email: z.string().email().optional(),
      expiresInMs: z.number().int().positive().optional(),
      redeemPolicy: redeemPolicySchema.optional(),
      maxRedemptions: z.number().int().positive().max(100_000).optional(),
    })
    .refine((value) => value.redeemPolicy !== "multi" || value.maxRedemptions !== undefined, {
      message: "maxRedemptions is required when redeemPolicy is multi",
      path: ["maxRedemptions"],
    })
    .refine((value) => value.maxRedemptions === undefined || value.redeemPolicy === "multi", {
      message: "maxRedemptions requires redeemPolicy multi",
      path: ["redeemPolicy"],
    });
}

export const createOrganizationInvitationRequestSchema = invitationRequestSchema(
  organizationInviteRoleSchema,
);
export const createCompetitionInvitationRequestSchema = invitationRequestSchema(
  competitionInviteRoleSchema,
);
/** @deprecated Prefer the scope-specific invitation request schemas. */
export const createInvitationRequestSchema = invitationRequestSchema(inviteRoleSchema);

export type CreateInvitationRequest = z.infer<typeof createInvitationRequestSchema>;
export type CreateOrganizationInvitationRequest = z.infer<
  typeof createOrganizationInvitationRequestSchema
>;
export type CreateCompetitionInvitationRequest = z.infer<
  typeof createCompetitionInvitationRequestSchema
>;

export const createInvitationResponseSchema = z.object({
  invitationId: z.string().min(1),
  competitionId: z.string().min(1).nullable().optional(),
  token: z.string().min(1),
  expiresAt: z.string().datetime(),
  redeemPolicy: redeemPolicySchema,
  maxRedemptions: z.number().int().positive().nullable(),
});

export type CreateInvitationResponse = z.infer<typeof createInvitationResponseSchema>;

export const acceptInvitationRequestSchema = z.object({
  token: z.string().min(1),
});

export type AcceptInvitationRequest = z.infer<typeof acceptInvitationRequestSchema>;

export const acceptInvitationResponseSchema = z.object({
  organizationId: z.string().min(1),
  organizationName: z.string().min(1),
  role: orgMembershipRoleSchema,
  competitionId: z.string().min(1).nullable().optional(),
  competitionRole: competitionInviteRoleSchema.nullable().optional(),
});

export type AcceptInvitationResponse = z.infer<typeof acceptInvitationResponseSchema>;

export const postAuthDestinationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("onboarding") }),
  z.object({ kind: z.literal("personal") }),
  z.object({
    kind: z.literal("organization"),
    organizationId: z.string().min(1),
  }),
  z.object({
    kind: z.literal("organizationPicker"),
    memberships: z.array(membershipSummarySchema),
  }),
]);

export type PostAuthDestinationDto = z.infer<typeof postAuthDestinationSchema>;

export const resolvePostAuthDestinationResponseSchema = z.object({
  destination: postAuthDestinationSchema,
  memberships: z.array(membershipSummarySchema),
});

export type ResolvePostAuthDestinationResponse = z.infer<
  typeof resolvePostAuthDestinationResponseSchema
>;
