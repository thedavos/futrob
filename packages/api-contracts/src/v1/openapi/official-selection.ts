import { z } from "zod";
import {
  confirmOfficialSelectionRequestSchema,
  officialSelectionCommandResponseSchema,
  officialSelectionViewSchema,
  openMatchDisputeRequestSchema,
  proposeAlternativeOfficialSelectionRequestSchema,
  proposeOfficialSelectionRequestSchema,
  rejectOfficialSelectionRequestSchema,
} from "../results/schemas.ts";

const BASE = "/organizations/{organizationId}/encounters/{encounterId}/official-selection";

const scopeParameters = [
  { name: "organizationId", in: "path", required: true, schema: { type: "string" } },
  { name: "encounterId", in: "path", required: true, schema: { type: "string" } },
] as const;

const proposalParameter = {
  name: "proposalId",
  in: "path",
  required: true,
  schema: { type: "string" },
} as const;

const errorResponse = { $ref: "#/components/responses/ApiError" } as const;

const failureDescription =
  "Failures carry a stable `code`: 400 `api.validation_error`, `results.invalid_selection`, " +
  "`results.duplicate_provider_match`, `results.reason_required`; 403 " +
  "`results.official_selection_forbidden`, `results.official_result_forbidden`, " +
  "`results.self_confirmation_forbidden`; 404 `results.encounter_not_found`, " +
  "`results.selection_not_found`; 409 `results.candidate_not_associated`, " +
  "`results.provider_match_snapshot_missing`, `results.reference_already_claimed`, " +
  "`results.selection_not_confirmable`, `results.selection_version_conflict`, " +
  "`results.selection_proposal_stale`, `results.selection_state_conflict`, " +
  "`results.selection_already_approved`, `results.command_key_reused`, " +
  "`results.confirmation_window_closed` (the response was evaluated at or after its deadline).";

function teamCommand(
  operationId: string,
  summary: string,
  requestSchema: string,
  withProposal: boolean,
) {
  return {
    post: {
      operationId,
      tags: ["results"],
      summary,
      description:
        "The actor comes from service authentication; `actingTeamId` is verified against the " +
        "Encounter rosters. Repeating `commandKey` with the same payload replays the original " +
        `outcome with \`replayed: true\`. ${failureDescription}`,
      parameters: withProposal ? [...scopeParameters, proposalParameter] : [...scopeParameters],
      requestBody: {
        required: true,
        content: {
          "application/json": { schema: { $ref: `#/components/schemas/${requestSchema}` } },
        },
      },
      responses: {
        "200": {
          description: "Command outcome or its replay",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/OfficialSelectionCommandResponse" },
            },
          },
        },
        "400": errorResponse,
        "401": errorResponse,
        "403": errorResponse,
        "404": errorResponse,
        "409": errorResponse,
      },
    },
  };
}

export const officialSelectionOpenApiPaths = {
  [BASE]: {
    get: {
      operationId: "getTeamOfficialSelection",
      tags: ["results"],
      summary: "Read an Encounter's official selection as one of its Teams",
      description:
        "Proposals, redacted audit history, disputes and the commands the Team can issue. " +
        "Command keys and request fingerprints are never exposed.",
      parameters: [
        ...scopeParameters,
        { name: "actingTeamId", in: "query", required: true, schema: { type: "string" } },
      ],
      responses: {
        "200": {
          description: "Authorized selection view",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/OfficialSelectionView" },
            },
          },
        },
        "400": errorResponse,
        "401": errorResponse,
        "403": errorResponse,
        "404": errorResponse,
      },
    },
  },
  [`${BASE}/proposals`]: teamCommand(
    "proposeOfficialSelection",
    "Propose the provider matches for the Encounter's official slots",
    "ProposeOfficialSelectionRequest",
    false,
  ),
  [`${BASE}/proposals/{proposalId}/confirm`]: teamCommand(
    "confirmOfficialSelection",
    "Confirm the rival Team's exact proposal version, approving the result",
    "ConfirmOfficialSelectionRequest",
    true,
  ),
  [`${BASE}/proposals/{proposalId}/reject`]: teamCommand(
    "rejectOfficialSelection",
    "Reject the rival Team's proposal with a reason; the case moves to dispute",
    "RejectOfficialSelectionRequest",
    true,
  ),
  [`${BASE}/proposals/{proposalId}/alternative`]: teamCommand(
    "proposeAlternativeOfficialSelection",
    "Answer the rival Team's proposal with an alternative selection",
    "ProposeAlternativeOfficialSelectionRequest",
    true,
  ),
  [`${BASE}/disputes`]: teamCommand(
    "openMatchDispute",
    "Open a dispute on the pending proposal",
    "OpenMatchDisputeRequest",
    false,
  ),
} as const;

const toSchema = (schema: z.ZodType, io: "input" | "output") =>
  z.toJSONSchema(schema, { target: "draft-2020-12", io });

export const officialSelectionOpenApiSchemas = {
  OfficialSelectionView: toSchema(officialSelectionViewSchema, "output"),
  OfficialSelectionCommandResponse: toSchema(officialSelectionCommandResponseSchema, "output"),
  ProposeOfficialSelectionRequest: toSchema(proposeOfficialSelectionRequestSchema, "input"),
  ConfirmOfficialSelectionRequest: toSchema(confirmOfficialSelectionRequestSchema, "input"),
  RejectOfficialSelectionRequest: toSchema(rejectOfficialSelectionRequestSchema, "input"),
  ProposeAlternativeOfficialSelectionRequest: toSchema(
    proposeAlternativeOfficialSelectionRequestSchema,
    "input",
  ),
  OpenMatchDisputeRequest: toSchema(openMatchDisputeRequestSchema, "input"),
};
