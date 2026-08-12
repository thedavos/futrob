import { createFileRoute } from "@tanstack/react-router";
import { CompetitionStep } from "@/modules/identity/presentation/onboarding/steps/competition-step.tsx";
import { getUiLocale } from "@/shared/presentation/i18n/locale.functions.ts";
import { onboardingHead } from "@/shared/presentation/i18n/onboarding-head.ts";

export const Route = createFileRoute("/_app/onboarding/competition")({
  loader: () => getUiLocale(),
  head: ({ loaderData }) => onboardingHead(loaderData, "onboarding.competition.title"),
  component: CompetitionStep,
});
