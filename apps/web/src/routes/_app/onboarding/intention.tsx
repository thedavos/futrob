import { createFileRoute } from "@tanstack/react-router";
import { IntentChoiceStep } from "@/modules/identity/presentation/onboarding/onboarding-steps.tsx";

export const Route = createFileRoute("/_app/onboarding/intention")({
  head: () => ({ meta: [{ title: "Elige tu intención | Futrob" }] }),
  component: IntentChoiceStep,
});
