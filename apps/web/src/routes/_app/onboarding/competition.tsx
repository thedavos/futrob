import { createFileRoute } from "@tanstack/react-router";
import { CompetitionStep } from "@/modules/identity/presentation/onboarding/steps/competition-step.tsx";

export const Route = createFileRoute("/_app/onboarding/competition")({
  component: CompetitionStep,
});
