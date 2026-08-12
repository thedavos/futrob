import { createFileRoute } from "@tanstack/react-router";
import { IntentChoiceStep } from "@/modules/identity/presentation/onboarding/steps/intention-step.tsx";
import { getUiLocale } from "@/shared/presentation/i18n/locale.functions.ts";
import { onboardingHead } from "@/shared/presentation/i18n/onboarding-head.ts";

export const Route = createFileRoute("/_app/onboarding/intention")({
  loader: () => getUiLocale(),
  head: ({ loaderData }) => onboardingHead(loaderData, "onboarding.intention.title"),
  component: IntentChoiceStep,
});
