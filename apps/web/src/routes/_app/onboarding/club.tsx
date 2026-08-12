import { createFileRoute } from "@tanstack/react-router";
import { ClubStep } from "@/modules/identity/presentation/onboarding/steps/club-step.tsx";

export const Route = createFileRoute("/_app/onboarding/club")({
  head: () => ({ meta: [{ title: "Asocia tu club EA | Futrob" }] }),
  component: ClubStep,
});
