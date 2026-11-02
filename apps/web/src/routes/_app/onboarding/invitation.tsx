import { createFileRoute } from "@tanstack/react-router";
import { InvitationStep } from "@/modules/identity/presentation/onboarding/steps/invitation-step.tsx";
import { localizedHead } from "@/shared/presentation/i18n/localized-head.ts";

export const Route = createFileRoute("/_app/onboarding/invitation")({
  head: localizedHead("onboarding.invitation.title"),
  component: InvitationStep,
});
