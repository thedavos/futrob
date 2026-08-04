import { createFileRoute } from "@tanstack/react-router";
import { TeamStep } from "@/modules/identity/presentation/onboarding/steps/team-step.tsx";

export const Route = createFileRoute("/_app/onboarding/team")({
  head: () => ({ meta: [{ title: "Asocia tu club EA | Futrob" }] }),
  component: TeamStep,
});
