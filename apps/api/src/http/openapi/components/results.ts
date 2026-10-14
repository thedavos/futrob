import {
  officialSelectionViewSchema,
  officialSelectionCommandResponseSchema,
  proposeOfficialSelectionRequestSchema,
  confirmOfficialSelectionRequestSchema,
  rejectOfficialSelectionRequestSchema,
  proposeAlternativeOfficialSelectionRequestSchema,
  openMatchDisputeRequestSchema,
  reviewMatchDisputeRequestSchema,
  resolveMatchDisputeRequestSchema,
  runConfirmationExpiryResponseSchema,
  runCandidateRecalculationResponseSchema,
} from "@futrob/api-contracts";
import { namedSchema } from "@/http/openapi/named-schema.ts";

export const OfficialSelectionView = namedSchema(
  "OfficialSelectionView",
  officialSelectionViewSchema,
);
export const OfficialSelectionCommandResponse = namedSchema(
  "OfficialSelectionCommandResponse",
  officialSelectionCommandResponseSchema,
);
export const ProposeOfficialSelectionRequest = namedSchema(
  "ProposeOfficialSelectionRequest",
  proposeOfficialSelectionRequestSchema,
);
export const ConfirmOfficialSelectionRequest = namedSchema(
  "ConfirmOfficialSelectionRequest",
  confirmOfficialSelectionRequestSchema,
);
export const RejectOfficialSelectionRequest = namedSchema(
  "RejectOfficialSelectionRequest",
  rejectOfficialSelectionRequestSchema,
);
export const ProposeAlternativeOfficialSelectionRequest = namedSchema(
  "ProposeAlternativeOfficialSelectionRequest",
  proposeAlternativeOfficialSelectionRequestSchema,
);
export const OpenMatchDisputeRequest = namedSchema(
  "OpenMatchDisputeRequest",
  openMatchDisputeRequestSchema,
);
export const ReviewMatchDisputeRequest = namedSchema(
  "ReviewMatchDisputeRequest",
  reviewMatchDisputeRequestSchema,
);
export const ResolveMatchDisputeRequest = namedSchema(
  "ResolveMatchDisputeRequest",
  resolveMatchDisputeRequestSchema,
);
export const RunConfirmationExpiryResponse = namedSchema(
  "RunConfirmationExpiryResponse",
  runConfirmationExpiryResponseSchema,
);
export const RunCandidateRecalculationResponse = namedSchema(
  "RunCandidateRecalculationResponse",
  runCandidateRecalculationResponseSchema,
);
