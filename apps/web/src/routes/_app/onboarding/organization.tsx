import { createFileRoute } from "@tanstack/react-router";
import { OrganizationStep } from "@/modules/identity/presentation/onboarding/steps/organization-step.tsx";
import { localizedHead } from "@/shared/presentation/i18n/localized-head.ts";

export const Route = createFileRoute("/_app/onboarding/organization")({
  head: localizedHead("onboarding.organization.title"),
  component: OrganizationStep,
});
