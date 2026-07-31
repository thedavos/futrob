import { createFileRoute } from "@tanstack/react-router";
import { InvitationStep } from "@/modules/identity/presentation/onboarding/onboarding-steps.tsx";

export const Route = createFileRoute("/_app/onboarding/invitation")({
  component: InvitationStep,
});
