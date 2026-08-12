import { createFileRoute } from "@tanstack/react-router";
import { GameAccountStep } from "@/modules/identity/presentation/onboarding/steps/game-account-step.tsx";
import { getUiLocale } from "@/shared/presentation/i18n/locale.functions.ts";
import { onboardingHead } from "@/shared/presentation/i18n/onboarding-head.ts";

export const Route = createFileRoute("/_app/onboarding/game-account")({
  loader: () => getUiLocale(),
  head: ({ loaderData }) => onboardingHead(loaderData, "onboarding.account.title"),
  component: GameAccountStep,
});
