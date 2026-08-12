import { createFileRoute } from "@tanstack/react-router";
import { OrganizationStep } from "@/modules/identity/presentation/onboarding/steps/organization-step.tsx";
import { getUiLocale } from "@/shared/presentation/i18n/locale.functions.ts";
import { onboardingHead } from "@/shared/presentation/i18n/onboarding-head.ts";

export const Route = createFileRoute("/_app/onboarding/organization")({
  loader: () => getUiLocale(),
  head: ({ loaderData }) => onboardingHead(loaderData, "onboarding.organization.title"),
  component: OrganizationStep,
});
