import { z } from "zod";

export const orgMembershipRoleSchema = z.enum(["organizer", "staff", "captain", "player"]);

export type OrgMembershipRoleDto = z.infer<typeof orgMembershipRoleSchema>;

export const inviteRoleSchema = z.enum(["staff", "captain", "player"]);

export type InviteRoleDto = z.infer<typeof inviteRoleSchema>;

export const membershipSummarySchema = z.object({
  organizationId: z.string().min(1),
  organizationName: z.string().min(1),
  role: orgMembershipRoleSchema,
});

export type MembershipSummaryDto = z.infer<typeof membershipSummarySchema>;

export const listMyMembershipsResponseSchema = z.object({
  memberships: z.array(membershipSummarySchema),
});

export type ListMyMembershipsResponse = z.infer<typeof listMyMembershipsResponseSchema>;

export const createOrganizationRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export type CreateOrganizationRequest = z.infer<typeof createOrganizationRequestSchema>;

export const createOrganizationResponseSchema = z.object({
  organizationId: z.string().min(1),
  name: z.string().min(1),
  role: z.literal("organizer"),
});

export type CreateOrganizationResponse = z.infer<typeof createOrganizationResponseSchema>;

export const createInvitationRequestSchema = z.object({
  role: inviteRoleSchema,
  email: z.string().email().optional(),
  expiresInMs: z.number().int().positive().optional(),
});

export type CreateInvitationRequest = z.infer<typeof createInvitationRequestSchema>;

export const createInvitationResponseSchema = z.object({
  invitationId: z.string().min(1),
  token: z.string().min(1),
  expiresAt: z.string().datetime(),
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
});

export type AcceptInvitationResponse = z.infer<typeof acceptInvitationResponseSchema>;

export const postAuthDestinationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("onboarding") }),
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
