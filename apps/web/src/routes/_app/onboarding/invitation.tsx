import { createFileRoute } from "@tanstack/react-router";
import { InvitationStep } from "@/modules/identity/presentation/onboarding/steps/invitation-step.tsx";

export const Route = createFileRoute("/_app/onboarding/invitation")({
  head: () => ({ meta: [{ title: "Únete a una competición | Futrob" }] }),
  component: InvitationStep,
});
