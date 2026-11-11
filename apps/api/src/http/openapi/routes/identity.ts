import { defineRoute, PLAN_GATED_DESCRIPTION } from "@/http/openapi/define-route.ts";
import {
  AccountDeletionStatus,
  ActorPreferences,
  RunAccountDeletionResponse,
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
  requestAccountDeletionRequestSchema,
  saveActorPreferencesRequestSchema,
  saveOnboardingProgressRequestSchema,
} from "@futrob/api-contracts";

export const getActorPreferencesRoute = defineRoute({
  method: "get",
  path: "/identity/preferences",
  operationId: "getActorPreferences",
  tags: ["identity"],
  summary: "Get the authenticated actor interface preferences",
  success: { status: 200, description: "Current preferences", schema: ActorPreferences },
  errors: [401],
});

export const saveActorPreferencesRoute = defineRoute({
  method: "put",
  path: "/identity/preferences",
  operationId: "saveActorPreferences",
  tags: ["identity"],
  summary: "Replace the authenticated actor interface preferences",
  body: saveActorPreferencesRequestSchema,
  success: { status: 200, description: "Saved preferences", schema: ActorPreferences },
  errors: [400, 401],
});

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
    description:
      "Completed player onboarding. The optional club association is best-effort: when the game-data provider is unavailable the path still completes and `externalClubAssociation` is `failed`.",
    schema: CompletePlayerOnboardingResponse,
  },
  errors: [400, 401, 404, 409],
  errorDescriptions: { 404: "The provider does not know the requested external club" },
});

export const getAccountDeletionRoute = defineRoute({
  method: "get",
  path: "/identity/account/deletion",
  operationId: "getAccountDeletion",
  tags: ["identity"],
  summary: "Get whether the authenticated account is scheduled for deletion and what blocks it",
  success: {
    status: 200,
    description: "Deletion state and blockers",
    schema: AccountDeletionStatus,
  },
  errors: [401, 404],
  errorDescriptions: { 404: "The account was deleted (`identity.account_deleted`)" },
});

export const requestAccountDeletionRoute = defineRoute({
  method: "post",
  path: "/identity/account/deletion",
  operationId: "requestAccountDeletion",
  tags: ["identity"],
  summary: "Schedule deletion of the authenticated account and sign it out everywhere",
  description:
    "Requires the current password. Deletion runs after the grace period by anonymizing the account (ADR-0028). Repeating the request keeps the original date and signs out again.",
  body: requestAccountDeletionRequestSchema,
  success: { status: 200, description: "Scheduled deletion", schema: AccountDeletionStatus },
  errors: [400, 401, 403, 409],
  errorDescriptions: {
    403: "The password does not match this account (`identity.reauthentication_failed`)",
    409: "The account holds responsibilities listed in `details.blockers` (`identity.account_deletion_blocked`)",
  },
});

export const cancelAccountDeletionRoute = defineRoute({
  method: "delete",
  path: "/identity/account/deletion",
  operationId: "cancelAccountDeletion",
  tags: ["identity"],
  summary: "Cancel a scheduled deletion of the authenticated account",
  description:
    "Leaves the account as it was. Cancelling an account that is not scheduled changes nothing.",
  success: { status: 200, description: "Account is active", schema: AccountDeletionStatus },
  errors: [401, 404],
  errorDescriptions: { 404: "The account was deleted (`identity.account_deleted`)" },
});

export const runAccountDeletionRoute = defineRoute({
  method: "post",
  path: "/internal/identity/account-deletion/run",
  operationId: "runAccountDeletion",
  tags: ["identity"],
  summary: "Anonymize up to 25 accounts whose deletion grace period has ended",
  description:
    "Service-only Cron target authenticated with the internal bearer secret. Uses the API clock. Each account is anonymized with every context's cleanup in one transaction; accounts with a blocker stay scheduled. Re-running finds no work twice.",
  success: {
    status: 200,
    description: "Deleted and postponed accounts in this batch",
    schema: RunAccountDeletionResponse,
  },
  errors: [401],
});
