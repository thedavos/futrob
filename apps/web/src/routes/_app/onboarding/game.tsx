import { createFileRoute } from "@tanstack/react-router";
import { GamePreferencesStep } from "@/modules/identity/presentation/onboarding/onboarding-steps.tsx";

export const Route = createFileRoute("/_app/onboarding/game")({
  component: GamePreferencesStep,
});
