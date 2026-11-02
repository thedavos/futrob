import { createFileRoute } from "@tanstack/react-router";
import { ClubStep } from "@/modules/identity/presentation/onboarding/steps/club-step.tsx";
import { localizedHead } from "@/shared/presentation/i18n/localized-head.ts";

export const Route = createFileRoute("/_app/onboarding/club")({
  head: localizedHead("onboarding.club.title"),
  component: ClubStep,
});
