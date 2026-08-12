import { createFileRoute } from "@tanstack/react-router";
import { ClubStep } from "@/modules/identity/presentation/onboarding/steps/club-step.tsx";
import { getUiLocale } from "@/shared/presentation/i18n/locale.functions.ts";
import { onboardingHead } from "@/shared/presentation/i18n/onboarding-head.ts";

export const Route = createFileRoute("/_app/onboarding/club")({
  loader: () => getUiLocale(),
  head: ({ loaderData }) => onboardingHead(loaderData, "onboarding.club.title"),
  component: ClubStep,
});
