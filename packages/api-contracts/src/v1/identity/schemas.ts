import { z } from "zod";

export const onboardingPathSchema = z.enum(["player", "organization", "invitation"]);
export const onboardingStepSchema = z.enum([
  "intention",
  "game",
  "invitation",
  "game-account",
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
  organization: ["intention", "game", "review"],
  invitation: ["intention", "invitation", "review"],
  player: ["intention", "game", "game-account", "review"],
};

export const saveOnboardingProgressRequestSchema = z
  .object({
    path: onboardingPathSchema.nullable(),
    currentStep: onboardingStepSchema,
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

export const completeOnboardingRequestSchema = z.object({
  path: onboardingPathSchema,
  version: z.literal(1).optional(),
});

export type CompleteOnboardingRequest = z.infer<typeof completeOnboardingRequestSchema>;

export const completeOnboardingResponseSchema = onboardingStatusSchema;

export type CompleteOnboardingResponse = z.infer<typeof completeOnboardingResponseSchema>;
