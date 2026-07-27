import { createFileRoute } from "@tanstack/react-router";
import { OnboardingPage } from "@/modules/organizations/presentation/onboarding-page.tsx";

export const Route = createFileRoute("/_app/onboarding")({
  component: OnboardingPage,
});
