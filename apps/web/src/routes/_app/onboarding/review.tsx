import { createFileRoute } from "@tanstack/react-router";
import { OnboardingReview } from "@/modules/identity/presentation/onboarding/onboarding-steps.tsx";

export const Route = createFileRoute("/_app/onboarding/review")({
  component: OnboardingReview,
});
