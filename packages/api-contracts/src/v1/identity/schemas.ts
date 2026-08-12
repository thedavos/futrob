import { z } from "zod";
import {
  acceptInvitationResponseSchema,
  createOrganizationResponseSchema,
} from "../organizations/schemas.ts";
import {
  playerExternalClubAssociationSchema,
  playerExternalClubSelectionInputSchema,
  playerGameAccountInputSchema,
  playerGameAccountSchema,
  playerProfileSchema,
} from "../teams/schemas.ts";
import { competitionDraftInputSchema, competitionDraftSchema } from "../competitions/schemas.ts";

export const onboardingPathSchema = z.enum(["player", "organization", "invitation"]);
export const onboardingStepSchema = z.enum([
  "intention",
  "organization",
  "competition",
  "game",
  "invitation",
  "game-account",
  "club",
  "review",
]);

export type OnboardingPathDto = z.infer<typeof onboardingPathSchema>;
export type OnboardingStepDto = z.infer<typeof onboardingStepSchema>;

export const onboardingStatusSchema = z.object({
  completed: z.boolean(),
  completedAt: z.string().datetime().nullable(),
  version: z.number().int().positive().nullable(),
  path: onboardingPathSchema.nullable(),
  currentStep: onboardingStepSchema.nullable(),
});

export type OnboardingStatusDto = z.infer<typeof onboardingStatusSchema>;

export const getOnboardingStatusResponseSchema = onboardingStatusSchema;

export type GetOnboardingStatusResponse = z.infer<typeof getOnboardingStatusResponseSchema>;

const allowedStepsByPath: Record<OnboardingPathDto, readonly OnboardingStepDto[]> = {
  organization: ["intention", "organization", "competition", "game-account", "game", "review"],
  invitation: ["intention", "invitation", "game-account", "review"],
  player: ["intention", "game", "game-account", "club", "review"],
};

const onboardingProgressInputStepSchema = z.union([
  onboardingStepSchema,
  z.literal("team").transform(() => "club" as const),
]);

export const saveOnboardingProgressRequestSchema = z
  .object({
    path: onboardingPathSchema.nullable(),
    currentStep: onboardingProgressInputStepSchema,
  })
  .superRefine((input, context) => {
    const allowed =
      input.path === null
        ? input.currentStep === "intention"
        : allowedStepsByPath[input.path].includes(input.currentStep);
    if (!allowed) {
      context.addIssue({
        code: "custom",
        path: ["currentStep"],
        message: "Step is not valid for the selected onboarding path",
      });
    }
  });

export type SaveOnboardingProgressRequest = z.infer<typeof saveOnboardingProgressRequestSchema>;

export const saveOnboardingProgressResponseSchema = onboardingStatusSchema;
export type SaveOnboardingProgressResponse = z.infer<typeof saveOnboardingProgressResponseSchema>;

export const completeOrganizationOnboardingRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  competition: competitionDraftInputSchema,
  gameAccount: playerGameAccountInputSchema.nullable().optional(),
});
export type CompleteOrganizationOnboardingRequest = z.infer<
  typeof completeOrganizationOnboardingRequestSchema
>;

export const completeOrganizationOnboardingResponseSchema = createOrganizationResponseSchema.extend(
  {
    competition: competitionDraftSchema,
    profile: playerProfileSchema,
    gameAccount: playerGameAccountSchema.nullable(),
    destination: z.object({
      kind: z.literal("competition-setup"),
      organizationId: z.string().min(1),
      competitionId: z.string().min(1),
    }),
  },
);
export type CompleteOrganizationOnboardingResponse = z.infer<
  typeof completeOrganizationOnboardingResponseSchema
>;

export const completeInvitationOnboardingRequestSchema = z.object({
  token: z.string().trim().min(1),
  gameAccount: playerGameAccountInputSchema.nullable().optional(),
});
export type CompleteInvitationOnboardingRequest = z.infer<
  typeof completeInvitationOnboardingRequestSchema
>;

export const inspectCompetitionInvitationRequestSchema = z.object({
  token: z.string().trim().min(1),
});
export type InspectCompetitionInvitationRequest = z.infer<
  typeof inspectCompetitionInvitationRequestSchema
>;

export const inspectCompetitionInvitationResponseSchema = z.object({
  organizationId: z.string().min(1),
  organizationName: z.string().min(1),
  competitionId: z.string().min(1),
  competitionName: z.string().min(1),
  competitionRole: z.enum(["staff", "captain", "player"]),
  expiresAt: z.string().datetime(),
});
export type InspectCompetitionInvitationResponse = z.infer<
  typeof inspectCompetitionInvitationResponseSchema
>;

export const completeInvitationOnboardingResponseSchema = acceptInvitationResponseSchema.extend({
  competitionId: z.string().min(1),
  competitionName: z.string().min(1),
  profile: playerProfileSchema,
  gameAccount: playerGameAccountSchema.nullable(),
  destination: z.object({
    kind: z.literal("competition"),
    organizationId: z.string().min(1),
    competitionId: z.string().min(1),
  }),
});
export type CompleteInvitationOnboardingResponse = z.infer<
  typeof completeInvitationOnboardingResponseSchema
>;

export const completePlayerOnboardingRequestSchema = z.object({
  gameAccount: playerGameAccountInputSchema.nullable().optional(),
  externalClub: playerExternalClubSelectionInputSchema.nullable().optional(),
});
export type CompletePlayerOnboardingRequest = z.infer<typeof completePlayerOnboardingRequestSchema>;

export const completePlayerOnboardingResponseSchema = z.object({
  profile: playerProfileSchema,
  gameAccount: playerGameAccountSchema.nullable(),
  externalClub: playerExternalClubAssociationSchema.nullable(),
  destination: z.literal("personal"),
});
export type CompletePlayerOnboardingResponse = z.infer<
  typeof completePlayerOnboardingResponseSchema
>;
