import { createFileRoute } from "@tanstack/react-router";
import { CompetitionStep } from "@/modules/identity/presentation/onboarding/steps/competition-step.tsx";

export const Route = createFileRoute("/_app/onboarding/competition")({
  head: () => ({ meta: [{ title: "Configura tu competición | Futrob" }] }),
  component: CompetitionStep,
});
