import { createFileRoute } from "@tanstack/react-router";
import { CompetitionStep } from "@/modules/identity/presentation/onboarding/steps/competition-step.tsx";
import { localizedHead } from "@/shared/presentation/i18n/localized-head.ts";

export const Route = createFileRoute("/_app/onboarding/competition")({
  head: localizedHead("onboarding.competition.title"),
  component: CompetitionStep,
});
