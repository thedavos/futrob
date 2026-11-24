import { onboardingHandoffHref } from "@/modules/identity/presentation/onboarding/onboarding-handoff.ts";

/**
 * `/signup` search of every landing «Crear competición»: whoever chooses to create a competition
 * signs up and lands on the organization step, skipping the intention question.
 */
export const ORGANIZER_SIGNUP_SEARCH = {
  redirectTo: onboardingHandoffHref({ kind: "organizer" }),
} as const;
