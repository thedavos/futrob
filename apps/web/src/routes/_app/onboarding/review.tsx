import { createFileRoute } from "@tanstack/react-router";
import { OnboardingReview } from "@/modules/identity/presentation/onboarding/steps/review-step.tsx";
import { getUiLocale } from "@/shared/presentation/i18n/locale.functions.ts";
import { onboardingHead } from "@/shared/presentation/i18n/onboarding-head.ts";

export const Route = createFileRoute("/_app/onboarding/review")({
  loader: () => getUiLocale(),
  head: ({ loaderData }) => onboardingHead(loaderData, "onboarding.review.title"),
  component: OnboardingReview,
});
