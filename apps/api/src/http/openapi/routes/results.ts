import { defineRoute } from "@/http/openapi/define-route.ts";
import { pathParams } from "@/http/openapi/path-params.ts";
import {
  VoidOfficialResultRequest,
  VoidOfficialResultResponse,
  ConfirmOfficialSelectionRequest,
  OfficialSelectionCommandResponse,
  OfficialSelectionView,
  OpenMatchDisputeRequest,
  ProposeAlternativeOfficialSelectionRequest,
  ProposeOfficialSelectionRequest,
  RejectOfficialSelectionRequest,
  ResolveMatchDisputeRequest,
  ReviewMatchDisputeRequest,
  RunCandidateRecalculationResponse,
  RunConfirmationExpiryResponse,
} from "@/http/openapi/components.ts";
import { getTeamOfficialSelectionQuerySchema } from "@futrob/api-contracts";

export const runConfirmationExpiryRoute = defineRoute({
  method: "post",
  path: "/internal/results/confirmation-expiry/run",
  operationId: "runConfirmationExpiry",
  tags: ["results"],
  summary: "Recover up to 50 expired opponent confirmation windows",
  description:
    "Service-only Cron target authenticated with the internal bearer secret. Uses the API clock and configured provisioned RESULTS_SYSTEM_ACTOR_ID; accepts no actor or timestamp from callers. Silence moves the selection to organizer_review and never approves a result. Retry discovers durable pending work.",
  success: {
    status: 200,
    description: "Expired and concurrently skipped selections in this batch",
    schema: RunConfirmationExpiryResponse,
  },
  errors: [401, 409, 503],
  errorDescriptions: {
    503: "Service authentication or the provisioned system actor is unavailable",
  },
});

export const runCandidateRecalculationRoute = defineRoute({
  method: "post",
  path: "/internal/results/candidate-recalculation/run",
  operationId: "runCandidateRecalculation",
  tags: ["results"],
  summary: "Recalculate candidates of Encounters whose schedule change was applied",
  description:
    "Service-only Cron target authenticated with the internal bearer secret. Consumes the durable schedule change handoff, acknowledging each application after it converges, and recalculates candidate eligibility from the stored slot starts. Earlier references stay as ineligible evidence. It never applies a schedule, selects, approves or projects statistics. Retry delivers every unacknowledged application, including one whose transaction committed late.",
  success: {
    status: 200,
    description: "Applications recalculated in this run",
    schema: RunCandidateRecalculationResponse,
  },
  errors: [401, 503],
  errorDescriptions: { 503: "Service authentication or candidate data is unavailable" },
});

export const getTeamOfficialSelectionRoute = defineRoute({
  method: "get",
  path: "/organizations/{organizationId}/encounters/{encounterId}/official-selection",
  operationId: "getTeamOfficialSelection",
  tags: ["results"],
  summary: "Read an Encounter's official selection as one of its Teams",
  description:
    "Proposals, redacted audit history, disputes and the commands the Team can issue. Command keys and request fingerprints are never exposed.",
  params: pathParams(["organizationId", "encounterId"]),
  query: getTeamOfficialSelectionQuerySchema,
  success: { status: 200, description: "Authorized selection view", schema: OfficialSelectionView },
  errors: [400, 401, 403, 404],
});

export const proposeOfficialSelectionRoute = defineRoute({
  method: "post",
  path: "/organizations/{organizationId}/encounters/{encounterId}/official-selection/proposals",
  operationId: "proposeOfficialSelection",
  tags: ["results"],
  summary: "Propose the provider matches for the Encounter's official slots",
  description:
    "The actor comes from service authentication; `actingTeamId` is verified against the Encounter rosters. Repeating `commandKey` with the same payload replays the original outcome with `replayed: true`. Failures carry a stable `code`: 400 `api.validation_error`, `results.invalid_selection`, `results.duplicate_provider_match`, `results.reason_required`; 403 `results.official_selection_forbidden`, `results.official_result_forbidden`, `results.self_confirmation_forbidden`; 404 `results.encounter_not_found`, `results.selection_not_found`; 409 `results.candidate_not_associated`, `results.provider_match_snapshot_missing`, `results.reference_already_claimed`, `results.selection_not_confirmable`, `results.selection_version_conflict`, `results.selection_proposal_stale`, `results.selection_state_conflict`, `results.selection_already_approved`, `results.command_key_reused`, `results.confirmation_window_closed` (the response was evaluated at or after its deadline).",
  params: pathParams(["organizationId", "encounterId"]),
  body: ProposeOfficialSelectionRequest,
  success: {
    status: 200,
    description: "Command outcome or its replay",
    schema: OfficialSelectionCommandResponse,
  },
  errors: [400, 401, 403, 404, 409],
});

export const confirmOfficialSelectionRoute = defineRoute({
  method: "post",
  path: "/organizations/{organizationId}/encounters/{encounterId}/official-selection/proposals/{proposalId}/confirm",
  operationId: "confirmOfficialSelection",
  tags: ["results"],
  summary: "Confirm the rival Team's exact proposal version, approving the result",
  description:
    "The actor comes from service authentication; `actingTeamId` is verified against the Encounter rosters. Repeating `commandKey` with the same payload replays the original outcome with `replayed: true`. Failures carry a stable `code`: 400 `api.validation_error`, `results.invalid_selection`, `results.duplicate_provider_match`, `results.reason_required`; 403 `results.official_selection_forbidden`, `results.official_result_forbidden`, `results.self_confirmation_forbidden`; 404 `results.encounter_not_found`, `results.selection_not_found`; 409 `results.candidate_not_associated`, `results.provider_match_snapshot_missing`, `results.reference_already_claimed`, `results.selection_not_confirmable`, `results.selection_version_conflict`, `results.selection_proposal_stale`, `results.selection_state_conflict`, `results.selection_already_approved`, `results.command_key_reused`, `results.confirmation_window_closed` (the response was evaluated at or after its deadline).",
  params: pathParams(["organizationId", "encounterId", "proposalId"]),
  body: ConfirmOfficialSelectionRequest,
  success: {
    status: 200,
    description: "Command outcome or its replay",
    schema: OfficialSelectionCommandResponse,
  },
  errors: [400, 401, 403, 404, 409],
});

export const rejectOfficialSelectionRoute = defineRoute({
  method: "post",
  path: "/organizations/{organizationId}/encounters/{encounterId}/official-selection/proposals/{proposalId}/reject",
  operationId: "rejectOfficialSelection",
  tags: ["results"],
  summary: "Reject the rival Team's proposal with a reason; the case moves to dispute",
  description:
    "The actor comes from service authentication; `actingTeamId` is verified against the Encounter rosters. Repeating `commandKey` with the same payload replays the original outcome with `replayed: true`. Failures carry a stable `code`: 400 `api.validation_error`, `results.invalid_selection`, `results.duplicate_provider_match`, `results.reason_required`; 403 `results.official_selection_forbidden`, `results.official_result_forbidden`, `results.self_confirmation_forbidden`; 404 `results.encounter_not_found`, `results.selection_not_found`; 409 `results.candidate_not_associated`, `results.provider_match_snapshot_missing`, `results.reference_already_claimed`, `results.selection_not_confirmable`, `results.selection_version_conflict`, `results.selection_proposal_stale`, `results.selection_state_conflict`, `results.selection_already_approved`, `results.command_key_reused`, `results.confirmation_window_closed` (the response was evaluated at or after its deadline).",
  params: pathParams(["organizationId", "encounterId", "proposalId"]),
  body: RejectOfficialSelectionRequest,
  success: {
    status: 200,
    description: "Command outcome or its replay",
    schema: OfficialSelectionCommandResponse,
  },
  errors: [400, 401, 403, 404, 409],
});

export const proposeAlternativeOfficialSelectionRoute = defineRoute({
  method: "post",
  path: "/organizations/{organizationId}/encounters/{encounterId}/official-selection/proposals/{proposalId}/alternative",
  operationId: "proposeAlternativeOfficialSelection",
  tags: ["results"],
  summary: "Answer the rival Team's proposal with an alternative selection",
  description:
    "The actor comes from service authentication; `actingTeamId` is verified against the Encounter rosters. Repeating `commandKey` with the same payload replays the original outcome with `replayed: true`. Failures carry a stable `code`: 400 `api.validation_error`, `results.invalid_selection`, `results.duplicate_provider_match`, `results.reason_required`; 403 `results.official_selection_forbidden`, `results.official_result_forbidden`, `results.self_confirmation_forbidden`; 404 `results.encounter_not_found`, `results.selection_not_found`; 409 `results.candidate_not_associated`, `results.provider_match_snapshot_missing`, `results.reference_already_claimed`, `results.selection_not_confirmable`, `results.selection_version_conflict`, `results.selection_proposal_stale`, `results.selection_state_conflict`, `results.selection_already_approved`, `results.command_key_reused`, `results.confirmation_window_closed` (the response was evaluated at or after its deadline).",
  params: pathParams(["organizationId", "encounterId", "proposalId"]),
  body: ProposeAlternativeOfficialSelectionRequest,
  success: {
    status: 200,
    description: "Command outcome or its replay",
    schema: OfficialSelectionCommandResponse,
  },
  errors: [400, 401, 403, 404, 409],
});

export const getOperatorOfficialSelectionRoute = defineRoute({
  method: "get",
  path: "/organizations/{organizationId}/encounters/{encounterId}/official-selection/disputes",
  operationId: "getOperatorOfficialSelection",
  tags: ["results"],
  summary: "Read the operational selection and dispute history as an operator",
  description:
    "Requires `encounters.results.approve` on the authenticated actor and Encounter scope. Returns the shared OfficialSelectionView, including redacted audit reasons, proposal deadlines and allowed operator actions. Command keys, fingerprints and raw provider payloads are never exposed. Reading does not process expiration.",
  params: pathParams(["organizationId", "encounterId"]),
  success: {
    status: 200,
    description: "Authorized operational selection view",
    schema: OfficialSelectionView,
  },
  errors: [401, 403, 404],
});

export const openMatchDisputeRoute = defineRoute({
  method: "post",
  path: "/organizations/{organizationId}/encounters/{encounterId}/official-selection/disputes",
  operationId: "openMatchDispute",
  tags: ["results"],
  summary: "Open a dispute on the pending proposal",
  description:
    "The actor comes from service authentication; `actingTeamId` is verified against the Encounter rosters. Repeating `commandKey` with the same payload replays the original outcome with `replayed: true`. Failures carry a stable `code`: 400 `api.validation_error`, `results.invalid_selection`, `results.duplicate_provider_match`, `results.reason_required`; 403 `results.official_selection_forbidden`, `results.official_result_forbidden`, `results.self_confirmation_forbidden`; 404 `results.encounter_not_found`, `results.selection_not_found`; 409 `results.candidate_not_associated`, `results.provider_match_snapshot_missing`, `results.reference_already_claimed`, `results.selection_not_confirmable`, `results.selection_version_conflict`, `results.selection_proposal_stale`, `results.selection_state_conflict`, `results.selection_already_approved`, `results.command_key_reused`, `results.confirmation_window_closed` (the response was evaluated at or after its deadline).",
  params: pathParams(["organizationId", "encounterId"]),
  body: OpenMatchDisputeRequest,
  success: {
    status: 200,
    description: "Command outcome or its replay",
    schema: OfficialSelectionCommandResponse,
  },
  errors: [400, 401, 403, 404, 409],
});

export const reviewMatchDisputeRoute = defineRoute({
  method: "post",
  path: "/organizations/{organizationId}/encounters/{encounterId}/official-selection/disputes/review",
  operationId: "reviewMatchDispute",
  tags: ["results"],
  summary: "Take a disputed case into organizer review without approving a result",
  description:
    "Requires `encounters.results.approve` on the authenticated actor and Encounter scope. Actor, role and permissions in the body grant no authority. A nonblank reason is required. Repeating `commandKey` with the same payload returns the original outcome with `replayed: true` and no duplicate projection. Resolution approves the exact `proposalId` in the current round at `expectedVersion`, with `acknowledgeIntegrityFlags: true` when blocking flags exist, or returns to selection, releasing references and requiring a new proposal and consent. Only approval creates an official result, atomically with statistics. 404 `results.proposal_not_found`; 409 `results.integrity_flags_not_acknowledged`. Failures carry a stable `code`: 400 `api.validation_error`, `results.invalid_selection`, `results.duplicate_provider_match`, `results.reason_required`; 403 `results.official_selection_forbidden`, `results.official_result_forbidden`, `results.self_confirmation_forbidden`; 404 `results.encounter_not_found`, `results.selection_not_found`; 409 `results.candidate_not_associated`, `results.provider_match_snapshot_missing`, `results.reference_already_claimed`, `results.selection_not_confirmable`, `results.selection_version_conflict`, `results.selection_proposal_stale`, `results.selection_state_conflict`, `results.selection_already_approved`, `results.command_key_reused`, `results.confirmation_window_closed` (the response was evaluated at or after its deadline).",
  params: pathParams(["organizationId", "encounterId"]),
  body: ReviewMatchDisputeRequest,
  success: {
    status: 200,
    description: "Command outcome or its replay",
    schema: OfficialSelectionCommandResponse,
  },
  errors: [400, 401, 403, 404, 409],
});

export const resolveMatchDisputeRoute = defineRoute({
  method: "post",
  path: "/organizations/{organizationId}/encounters/{encounterId}/official-selection/disputes/resolve",
  operationId: "resolveMatchDispute",
  tags: ["results"],
  summary: "Resolve organizer review by approving an exact proposal or returning to selection",
  description:
    "Requires `encounters.results.approve` on the authenticated actor and Encounter scope. Actor, role and permissions in the body grant no authority. A nonblank reason is required. Repeating `commandKey` with the same payload returns the original outcome with `replayed: true` and no duplicate projection. Resolution approves the exact `proposalId` in the current round at `expectedVersion`, with `acknowledgeIntegrityFlags: true` when blocking flags exist, or returns to selection, releasing references and requiring a new proposal and consent. Only approval creates an official result, atomically with statistics. 404 `results.proposal_not_found`; 409 `results.integrity_flags_not_acknowledged`. Failures carry a stable `code`: 400 `api.validation_error`, `results.invalid_selection`, `results.duplicate_provider_match`, `results.reason_required`; 403 `results.official_selection_forbidden`, `results.official_result_forbidden`, `results.self_confirmation_forbidden`; 404 `results.encounter_not_found`, `results.selection_not_found`; 409 `results.candidate_not_associated`, `results.provider_match_snapshot_missing`, `results.reference_already_claimed`, `results.selection_not_confirmable`, `results.selection_version_conflict`, `results.selection_proposal_stale`, `results.selection_state_conflict`, `results.selection_already_approved`, `results.command_key_reused`, `results.confirmation_window_closed` (the response was evaluated at or after its deadline).",
  params: pathParams(["organizationId", "encounterId"]),
  body: ResolveMatchDisputeRequest,
  success: {
    status: 200,
    description: "Command outcome or its replay",
    schema: OfficialSelectionCommandResponse,
  },
  errors: [400, 401, 403, 404, 409],
});

export const voidOfficialResultRoute = defineRoute({
  method: "post",
  path: "/official-results/{officialResultId}/void",
  operationId: "voidOfficialResult",
  tags: ["results"],
  summary: "Void an approved result and remove its official statistics",
  description:
    "Requires encounters.results.approve on the stored result scope. Uses the trusted service actor. Repeated calls converge without duplicate audit entries. Preserves approval history and releases provider references.",
  params: pathParams(["officialResultId"]),
  body: VoidOfficialResultRequest,
  success: {
    status: 200,
    description: "Voided official result",
    schema: VoidOfficialResultResponse,
  },
  errors: [400, 401, 403, 404, 409],
});
