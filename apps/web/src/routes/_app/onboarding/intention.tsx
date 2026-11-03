import { createFileRoute } from "@tanstack/react-router";
import { IntentChoiceStep } from "@/modules/identity/presentation/onboarding/steps/intention-step.tsx";
import { localizedHead } from "@/shared/presentation/i18n/localized-head.ts";

export const Route = createFileRoute("/_app/onboarding/intention")({
  head: localizedHead("onboarding.intention.title"),
  component: IntentChoiceStep,
});
