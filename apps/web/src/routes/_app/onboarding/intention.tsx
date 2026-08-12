import { createFileRoute } from "@tanstack/react-router";
import { IntentChoiceStep } from "@/modules/identity/presentation/onboarding/steps/intention-step.tsx";

export const Route = createFileRoute("/_app/onboarding/intention")({
  component: IntentChoiceStep,
});
