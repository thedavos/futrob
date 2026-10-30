import { defineRoute, PLAN_GATED_DESCRIPTION } from "@/http/openapi/define-route.ts";
import {
  CompleteInvitationOnboardingResponse,
  CompleteOrganizationOnboardingResponse,
  CompletePlayerOnboardingResponse,
  InspectCompetitionInvitationResponse,
  OnboardingStatus,
} from "@/http/openapi/components.ts";
import {
  completeInvitationOnboardingRequestSchema,
  completeOrganizationOnboardingRequestSchema,
  completePlayerOnboardingRequestSchema,
  inspectCompetitionInvitationRequestSchema,
  saveOnboardingProgressRequestSchema,
} from "@futrob/api-contracts";

export const getOnboardingStatusRoute = defineRoute({
  method: "get",
  path: "/identity/onboarding",
  operationId: "getOnboardingStatus",
  tags: ["onboarding"],
  summary: "Get the authenticated actor onboarding state",
  success: { status: 200, description: "Current onboarding state", schema: OnboardingStatus },
  errors: [401],
});

export const saveOnboardingProgressRoute = defineRoute({
  method: "patch",
  path: "/identity/onboarding",
  operationId: "saveOnboardingProgress",
  tags: ["onboarding"],
  summary: "Persist the current onboarding path and step without draft data",
  body: saveOnboardingProgressRequestSchema,
  success: { status: 200, description: "Saved onboarding state", schema: OnboardingStatus },
  errors: [400, 401],
});

export const completeOrganizationOnboardingRoute = defineRoute({
  method: "post",
  path: "/identity/onboarding/organization",
  operationId: "completeOrganizationOnboarding",
  tags: ["onboarding"],
  summary: "Create an organization and complete the organization onboarding path",
  body: completeOrganizationOnboardingRequestSchema,
  success: {
    status: 200,
    description: "Completed organization onboarding",
    schema: CompleteOrganizationOnboardingResponse,
  },
  errors: [400, 401, 402, 409],
  errorDescriptions: { 402: PLAN_GATED_DESCRIPTION },
});

export const completeInvitationOnboardingRoute = defineRoute({
  method: "post",
  path: "/identity/onboarding/invitation",
  operationId: "completeInvitationOnboarding",
  tags: ["onboarding"],
  summary: "Accept an invitation and complete the invitation onboarding path",
  body: completeInvitationOnboardingRequestSchema,
  success: {
    status: 200,
    description: "Completed invitation onboarding",
    schema: CompleteInvitationOnboardingResponse,
  },
  errors: [400, 401, 402, 404, 409, 429],
  errorDescriptions: { 402: PLAN_GATED_DESCRIPTION },
});

export const inspectCompetitionInvitationRoute = defineRoute({
  method: "post",
  path: "/identity/onboarding/invitation/preview",
  operationId: "inspectCompetitionInvitation",
  tags: ["onboarding"],
  summary: "Inspect a competition invitation without consuming it",
  body: inspectCompetitionInvitationRequestSchema,
  success: {
    status: 200,
    description: "Sanitized competition invitation preview",
    schema: InspectCompetitionInvitationResponse,
  },
  errors: [400, 401, 404, 409, 429],
});

export const completePlayerOnboardingRoute = defineRoute({
  method: "post",
  path: "/identity/onboarding/player",
  operationId: "completePlayerOnboarding",
  tags: ["onboarding"],
  summary: "Create a personal profile and complete the player onboarding path",
  body: completePlayerOnboardingRequestSchema,
  success: {
    status: 200,
    description: "Completed player onboarding",
    schema: CompletePlayerOnboardingResponse,
  },
  errors: [400, 401, 409],
});
