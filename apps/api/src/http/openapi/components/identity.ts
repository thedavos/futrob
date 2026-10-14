import {
  onboardingStatusSchema,
  completeOrganizationOnboardingResponseSchema,
  completeInvitationOnboardingResponseSchema,
  inspectCompetitionInvitationResponseSchema,
  completePlayerOnboardingResponseSchema,
} from "@futrob/api-contracts";
import { namedSchema } from "@/http/openapi/named-schema.ts";

export const OnboardingStatus = namedSchema("OnboardingStatus", onboardingStatusSchema);
export const CompleteOrganizationOnboardingResponse = namedSchema(
  "CompleteOrganizationOnboardingResponse",
  completeOrganizationOnboardingResponseSchema,
);
export const CompleteInvitationOnboardingResponse = namedSchema(
  "CompleteInvitationOnboardingResponse",
  completeInvitationOnboardingResponseSchema,
);
export const InspectCompetitionInvitationResponse = namedSchema(
  "InspectCompetitionInvitationResponse",
  inspectCompetitionInvitationResponseSchema,
);
export const CompletePlayerOnboardingResponse = namedSchema(
  "CompletePlayerOnboardingResponse",
  completePlayerOnboardingResponseSchema,
);
