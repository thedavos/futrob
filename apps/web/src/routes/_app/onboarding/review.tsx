import { createFileRoute } from "@tanstack/react-router";
import { OnboardingReview } from "@/modules/identity/presentation/onboarding/steps/review-step.tsx";

export const Route = createFileRoute("/_app/onboarding/review")({
  head: () => ({ meta: [{ title: "Confirma tu configuración | Futrob" }] }),
  component: OnboardingReview,
});
