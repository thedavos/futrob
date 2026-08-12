import { createFileRoute } from "@tanstack/react-router";
import { OrganizationStep } from "@/modules/identity/presentation/onboarding/steps/organization-step.tsx";

export const Route = createFileRoute("/_app/onboarding/organization")({
  component: OrganizationStep,
});
