import { z } from "zod";
import {
  confirmOfficialSelectionRequestSchema,
  officialSelectionCommandResponseSchema,
  officialSelectionViewSchema,
  openMatchDisputeRequestSchema,
  proposeAlternativeOfficialSelectionRequestSchema,
  proposeOfficialSelectionRequestSchema,
  rejectOfficialSelectionRequestSchema,
  resolveMatchDisputeRequestSchema,
  reviewMatchDisputeRequestSchema,
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

function operatorCommand(operationId: string, summary: string, requestSchema: string) {
  const command = teamCommand(operationId, summary, requestSchema, false);
  return {
    post: {
      ...command.post,
      description:
        "Requires `encounters.results.approve` on the authenticated actor and Encounter scope. " +
        "Actor, role and permissions in the body grant no authority. A nonblank reason is required. " +
        "Repeating `commandKey` with the same payload returns the original outcome with " +
        "`replayed: true` and no duplicate projection. Resolution approves the exact `proposalId` " +
        "in the current round at `expectedVersion`, with `acknowledgeIntegrityFlags: true` when " +
        "blocking flags exist, or returns to selection, releasing references and requiring " +
        "a new proposal and consent. Only approval creates an official result, atomically with " +
        "statistics. 404 `results.proposal_not_found`; 409 " +
        `\`results.integrity_flags_not_acknowledged\`. ${failureDescription}`,
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
  [`${BASE}/disputes`]: {
    ...teamCommand(
      "openMatchDispute",
      "Open a dispute on the pending proposal",
      "OpenMatchDisputeRequest",
      false,
    ),
    get: {
      operationId: "getOperatorOfficialSelection",
      tags: ["results"],
      summary: "Read the operational selection and dispute history as an operator",
      description:
        "Requires `encounters.results.approve` on the authenticated actor and Encounter scope. " +
        "Returns the shared OfficialSelectionView, including redacted audit reasons, " +
        "proposal deadlines and allowed operator actions. Command keys, fingerprints and " +
        "raw provider payloads are never exposed. Reading does not process expiration.",
      parameters: [...scopeParameters],
      responses: {
        "200": {
          description: "Authorized operational selection view",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/OfficialSelectionView" },
            },
          },
        },
        "401": errorResponse,
        "403": errorResponse,
        "404": errorResponse,
      },
    },
  },
  [`${BASE}/disputes/review`]: operatorCommand(
    "reviewMatchDispute",
    "Take a disputed case into organizer review without approving a result",
    "ReviewMatchDisputeRequest",
  ),
  [`${BASE}/disputes/resolve`]: operatorCommand(
    "resolveMatchDispute",
    "Resolve organizer review by approving an exact proposal or returning to selection",
    "ResolveMatchDisputeRequest",
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
  ReviewMatchDisputeRequest: toSchema(reviewMatchDisputeRequestSchema, "input"),
  ResolveMatchDisputeRequest: toSchema(resolveMatchDisputeRequestSchema, "input"),
};
