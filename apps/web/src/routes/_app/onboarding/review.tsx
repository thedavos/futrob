import { createFileRoute } from "@tanstack/react-router";
import { OnboardingReview } from "@/modules/identity/presentation/onboarding/steps/review-step.tsx";
import { localizedHead } from "@/shared/presentation/i18n/localized-head.ts";

export const Route = createFileRoute("/_app/onboarding/review")({
  head: localizedHead("onboarding.review.title"),
  component: OnboardingReview,
});
