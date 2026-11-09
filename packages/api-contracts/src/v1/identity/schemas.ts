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

export const sidebarLayoutSchema = z.enum(["navigation", "pending-queue"]);
export type SidebarLayoutDto = z.infer<typeof sidebarLayoutSchema>;

export const actorPreferencesSchema = z.object({
  sidebarLayout: sidebarLayoutSchema,
});
export type ActorPreferencesDto = z.infer<typeof actorPreferencesSchema>;

export const getActorPreferencesResponseSchema = actorPreferencesSchema;
export type GetActorPreferencesResponse = z.infer<typeof getActorPreferencesResponseSchema>;

export const saveActorPreferencesRequestSchema = actorPreferencesSchema;
export type SaveActorPreferencesRequest = z.infer<typeof saveActorPreferencesRequestSchema>;

export const saveActorPreferencesResponseSchema = actorPreferencesSchema;
export type SaveActorPreferencesResponse = z.infer<typeof saveActorPreferencesResponseSchema>;

export const onboardingPathSchema = z.enum(["player", "organization", "invitation"]);
export const onboardingStepSchema = z.enum([
  "intention",
  "organization",
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

/** Ordered steps per path. Clients derive routing, stepper order and next/previous from this. */
export const ONBOARDING_STEPS_BY_PATH = {
  organization: ["intention", "organization", "review"],
  invitation: ["intention", "invitation", "game-account", "review"],
  player: ["intention", "game-account", "club", "review"],
} as const satisfies Record<OnboardingPathDto, readonly OnboardingStepDto[]>;

export function onboardingStepsForPath(
  path: OnboardingPathDto,
  includeAccount = false,
): readonly OnboardingStepDto[] {
  return path === "organization" && includeAccount
    ? ["intention", "organization", "game-account", "review"]
    : ONBOARDING_STEPS_BY_PATH[path];
}

export function isOnboardingStepAllowed(
  path: OnboardingPathDto | null,
  step: OnboardingStepDto,
): boolean {
  if (path === null) return step === "intention";
  return (
    (path === "organization" && step === "game-account") ||
    ONBOARDING_STEPS_BY_PATH[path].some((allowed) => allowed === step)
  );
}

function adjacentOnboardingStep(
  path: OnboardingPathDto,
  step: OnboardingStepDto,
  offset: 1 | -1,
): OnboardingStepDto | null {
  const steps: readonly OnboardingStepDto[] = ONBOARDING_STEPS_BY_PATH[path];
  const index = steps.indexOf(step);
  if (index === -1) return null;
  return steps[index + offset] ?? null;
}

export function nextOnboardingStep(
  path: OnboardingPathDto,
  step: OnboardingStepDto,
): OnboardingStepDto | null {
  return adjacentOnboardingStep(path, step, 1);
}

export function previousOnboardingStep(
  path: OnboardingPathDto,
  step: OnboardingStepDto,
): OnboardingStepDto | null {
  return adjacentOnboardingStep(path, step, -1);
}

export const saveOnboardingProgressRequestSchema = z
  .object({
    path: onboardingPathSchema.nullable(),
    currentStep: onboardingStepSchema,
  })
  .superRefine((input, context) => {
    if (!isOnboardingStepAllowed(input.path, input.currentStep)) {
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
  timeZone: z.string().trim().min(1).max(100),
  gameAccount: playerGameAccountInputSchema.nullable().optional(),
});
export type CompleteOrganizationOnboardingRequest = z.infer<
  typeof completeOrganizationOnboardingRequestSchema
>;

export const completeOrganizationOnboardingResponseSchema = createOrganizationResponseSchema.extend(
  {
    profile: playerProfileSchema,
    gameAccount: playerGameAccountSchema.nullable(),
    destination: z.object({
      kind: z.literal("organization"),
      organizationId: z.string().min(1),
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

/**
 * Outcome of the optional, declarative club association requested at the end of the player
 * path. `skipped`: no club was requested. `failed`: the game-data provider was unavailable
 * (timeout, rate limit, outage), so onboarding completed without the club and the player can
 * add it later. Invalid locators still fail the request.
 */
export const externalClubAssociationOutcomeSchema = z.enum(["associated", "skipped", "failed"]);
export type ExternalClubAssociationOutcomeDto = z.infer<
  typeof externalClubAssociationOutcomeSchema
>;

export const completePlayerOnboardingResponseSchema = z.object({
  profile: playerProfileSchema,
  gameAccount: playerGameAccountSchema.nullable(),
  externalClubs: z.array(playerExternalClubAssociationSchema),
  externalClubAssociation: externalClubAssociationOutcomeSchema,
  destination: z.literal("personal"),
});
export type CompletePlayerOnboardingResponse = z.infer<
  typeof completePlayerOnboardingResponseSchema
>;
