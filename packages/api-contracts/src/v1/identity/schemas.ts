import { z } from "zod";

export const onboardingPathSchema = z.enum(["player", "organization", "invitation"]);

export type OnboardingPathDto = z.infer<typeof onboardingPathSchema>;

export const onboardingStatusSchema = z.object({
  completed: z.boolean(),
  completedAt: z.string().datetime().nullable(),
  version: z.number().int().positive().nullable(),
  path: onboardingPathSchema.nullable(),
});

export type OnboardingStatusDto = z.infer<typeof onboardingStatusSchema>;

export const getOnboardingStatusResponseSchema = onboardingStatusSchema;

export type GetOnboardingStatusResponse = z.infer<typeof getOnboardingStatusResponseSchema>;

export const completeOnboardingRequestSchema = z.object({
  path: onboardingPathSchema,
  version: z.literal(1).optional(),
});

export type CompleteOnboardingRequest = z.infer<typeof completeOnboardingRequestSchema>;

export const completeOnboardingResponseSchema = onboardingStatusSchema;

export type CompleteOnboardingResponse = z.infer<typeof completeOnboardingResponseSchema>;
