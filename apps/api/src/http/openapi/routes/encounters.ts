import { defineRoute } from "@/http/openapi/define-route.ts";
import { pathParams } from "@/http/openapi/path-params.ts";
import {
  AcceptScheduleChangeProposalRequest,
  CounterScheduleChangeProposalRequest,
  CreateScheduleChangeRequest,
  EncounterScheduleSnapshot,
  EncounterView,
  ListCompetitionEncountersResponse,
  ListEncounterCandidatesResponse,
  ListScheduleChangeRequestsResponse,
  RejectScheduleChangeProposalRequest,
  ResolveScheduleChangeRequest,
  RunScheduleChangeExpiryResponse,
  ScheduleChangeCommandResponse,
  ScheduleChangeRequest,
} from "@/http/openapi/components.ts";
import { upsertEncounterScheduleSnapshotRequestSchema } from "@futrob/api-contracts";

export const listEncounterCandidatesRoute = defineRoute({
  method: "get",
  path: "/encounters/{encounterId}/candidates",
  operationId: "listEncounterCandidates",
  tags: ["encounters"],
  summary: "List authorized persisted provider-match candidates for an encounter",
  params: pathParams(["encounterId"]),
  success: {
    status: 200,
    description: "Candidate list or a safe connection state",
    schema: ListEncounterCandidatesResponse,
  },
  errors: [401, 404, 503],
});

export const getEncounterViewRoute = defineRoute({
  method: "get",
  path: "/organizations/{organizationId}/encounters/{encounterId}",
  operationId: "getEncounterView",
  tags: ["encounters"],
  summary: "Get an Encounter with both Teams, its competition time zone and every slot start",
  params: pathParams(["organizationId", "encounterId"]),
  success: {
    status: 200,
    description: "The Encounter as an actor with `encounters.read` sees it",
    schema: EncounterView,
  },
  errors: [401, 404],
});

export const listCompetitionEncountersRoute = defineRoute({
  method: "get",
  path: "/organizations/{organizationId}/competitions/{competitionId}/encounters",
  operationId: "listCompetitionEncounters",
  tags: ["encounters"],
  summary: "List the active fixture's Encounters the actor may read, with both Teams and status",
  params: pathParams(["organizationId", "competitionId"]),
  success: {
    status: 200,
    description: "Encounters earliest first, in the competition time zone's frame",
    schema: ListCompetitionEncountersResponse,
  },
  errors: [401, 404],
});

export const getEncounterScheduleSnapshotRoute = defineRoute({
  method: "get",
  path: "/encounters/{encounterId}/schedule-snapshot",
  operationId: "getEncounterScheduleSnapshot",
  tags: ["encounters"],
  summary: "Get the authorized persisted scheduling snapshot for an encounter",
  params: pathParams(["encounterId"]),
  success: {
    status: 200,
    description: "Encounter scope and participating teams",
    schema: EncounterScheduleSnapshot,
  },
  errors: [401, 404],
});

export const upsertEncounterScheduleSnapshotRoute = defineRoute({
  method: "put",
  path: "/encounters/{encounterId}/schedule-snapshot",
  operationId: "upsertEncounterScheduleSnapshot",
  tags: ["encounters"],
  summary: "Create or update the persisted scheduling projection",
  params: pathParams(["encounterId"]),
  body: upsertEncounterScheduleSnapshotRequestSchema,
  success: {
    status: 200,
    description: "Persisted scheduling projection",
    schema: EncounterScheduleSnapshot,
  },
  errors: [400, 401, 403, 409],
});

export const runScheduleChangeExpiryRoute = defineRoute({
  method: "post",
  path: "/internal/scheduling/reschedule-expiry/run",
  operationId: "runScheduleChangeExpiry",
  tags: ["encounters"],
  summary: "Recover expired schedule-change proposals and escalate pending requests",
  description:
    "Service-only runner authenticated with the internal bearer secret. Uses API time and the existing provisioned SCHEDULING_SYSTEM_ACTOR_ID; accepts no caller actor or timestamp. Processes durable pending work idempotently. The request remains active when escalated; silence never changes the fixture, consumes quota or approves a result.",
  success: {
    status: 200,
    description: "Escalated and concurrently skipped requests in the batch",
    schema: RunScheduleChangeExpiryResponse,
  },
  errors: [401, 409, 503],
  errorDescriptions: { 503: "Provisioned system actor unavailable" },
});

export const listScheduleChangeRequestsRoute = defineRoute({
  method: "get",
  path: "/encounters/{encounterId}/schedule-change-requests",
  operationId: "listScheduleChangeRequests",
  tags: ["encounters"],
  summary: "List authorized schedule-change requests for an encounter, including closed history",
  description:
    "Computed for the authenticated actor at API time. Each request lists `allowedActions` and `blockedActions` (accept, reject and counter each appear in exactly one) plus `respondAs`, the responder accept and reject must send. `resolve` is allowed only on an escalated request for an actor with encounters.reschedule.resolve. A response is blocked once API time reaches the current proposal's `responseDeadline`, even before the expiry runner escalates it. `creation` lists the Teams the actor may request for and every scope with its current start, each with a `blockedReason`. Minimum notice and version races are not predicted; the commands still return them as errors.",
  params: pathParams(["encounterId"]),
  success: {
    status: 200,
    description: "Schedule-change requests in deterministic order",
    schema: ListScheduleChangeRequestsResponse,
  },
  errors: [401, 404],
});

export const createScheduleChangeRequestRoute = defineRoute({
  method: "post",
  path: "/encounters/{encounterId}/schedule-change-requests",
  operationId: "createScheduleChangeRequest",
  tags: ["encounters"],
  summary: "Create a schedule-change request without changing the fixture",
  description:
    "The proposal stores its UTC responseDeadline anchored to API createdAt plus the stage's rescheduleProposalExpiryHours (integer 1–72, default 12). It differs from minimum notice. An escalated request remains active and blocks incompatible requests. Create, counter and accept revalidate the stage's current minimum notice against the current and proposed times of every affected slot, including organizer consent. The exact boundary is inclusive; current times at or before now are exempt. Zero disables notice only: proposed dates must still be strictly future. A violation is 409 `scheduling.reschedule_notice_not_met`, with `details.anchor` equal to `current` or `proposed` (current takes priority). No request, consent, schedule or quota changes persist on denial. Recorded replays do not revalidate notice. The response carries empty capabilities; read the list for them.",
  params: pathParams(["encounterId"]),
  body: CreateScheduleChangeRequest,
  success: {
    status: 200,
    description: "Created or replayed request",
    schema: ScheduleChangeRequest,
  },
  errors: [400, 401, 403, 404, 409],
});

export const getScheduleChangeRequestRoute = defineRoute({
  method: "get",
  path: "/encounters/{encounterId}/schedule-change-requests/{requestId}",
  operationId: "getScheduleChangeRequest",
  tags: ["encounters"],
  summary:
    "Read one schedule-change request with proposals, decisions, application and operator audit",
  description:
    "Includes `allowedActions`, `respondAs` and `blockedActions` for the authenticated actor, computed as in the list. Readable by actors who can read the Encounter; anyone else gets 404 `scheduling.schedule_change_encounter_not_found`. An unknown request, or one of another Encounter, is 404 `scheduling.schedule_change_request_not_found`.",
  params: pathParams(["encounterId", "requestId"]),
  success: {
    status: 200,
    description: "The request and its full history",
    schema: ScheduleChangeRequest,
  },
  errors: [401, 404],
});

export const acceptScheduleChangeProposalRoute = defineRoute({
  method: "post",
  path: "/encounters/{encounterId}/schedule-change-requests/{requestId}/proposals/{proposalId}/accept",
  operationId: "acceptScheduleChangeProposal",
  tags: ["encounters"],
  summary: "Consent to the current proposal; the last required consent applies the new schedule",
  description:
    "Answers the current proposal of an open request at `expectedVersion` only while API time is strictly before its persisted UTC responseDeadline. At the deadline or later it fails with 409 scheduling.schedule_change_response_window_closed even if the expiry runner is delayed. The actor comes from service authentication; `responder` (or `teamId`) is only the capacity claimed, and the server authorizes it. Repeating `commandKey` with the same payload replays the original outcome with `replayed: true` and no new effect. Create, counter and accept revalidate the stage's current minimum notice against the current and proposed times of every affected slot, including organizer consent. The exact boundary is inclusive; current times at or before now are exempt. Zero disables notice only: proposed dates must still be strictly future. A violation is 409 `scheduling.reschedule_notice_not_met`, with `details.anchor` equal to `current` or `proposed` (current takes priority). No request, consent, schedule or quota changes persist on denial. Recorded replays do not revalidate notice. Failures carry a stable `code`: 400 `api.validation_error`, `scheduling.invalid_schedule_change_request`, `scheduling.invalid_schedule_change_date` (also a `timeZone` other than the competition's), `scheduling.invalid_schedule_change_reason`, `scheduling.invalid_schedule_change_scope`; 403 `authorization.forbidden`, `scheduling.schedule_change_self_response_forbidden`, `scheduling.schedule_change_authority_not_required`; 404 `scheduling.schedule_change_encounter_not_found`, `scheduling.schedule_change_request_not_found`; 409 `scheduling.schedule_change_version_conflict`, `scheduling.schedule_change_proposal_stale`, `scheduling.schedule_change_request_closed`, `scheduling.schedule_change_response_window_closed`, `scheduling.schedule_change_consent_already_recorded`, `scheduling.schedule_change_idempotency_conflict`, `scheduling.schedule_change_approval_not_configured`, `scheduling.rescheduling_disabled`, `scheduling.encounter_not_editable_for_schedule_change`, `scheduling.reschedule_limit_reached`, `scheduling.fixture_update_conflict`.",
  params: pathParams(["encounterId", "requestId", "proposalId"]),
  body: AcceptScheduleChangeProposalRequest,
  success: {
    status: 200,
    description: "The request as the command left it, or its replay",
    schema: ScheduleChangeCommandResponse,
  },
  errors: [400, 401, 403, 404, 409],
});

export const rejectScheduleChangeProposalRoute = defineRoute({
  method: "post",
  path: "/encounters/{encounterId}/schedule-change-requests/{requestId}/proposals/{proposalId}/reject",
  operationId: "rejectScheduleChangeProposal",
  tags: ["encounters"],
  summary: "Reject the current proposal and close the request without changing the schedule",
  description:
    "Answers the current proposal of an open request at `expectedVersion` only while API time is strictly before its persisted UTC responseDeadline. At the deadline or later it fails with 409 scheduling.schedule_change_response_window_closed even if the expiry runner is delayed. The actor comes from service authentication; `responder` (or `teamId`) is only the capacity claimed, and the server authorizes it. Repeating `commandKey` with the same payload replays the original outcome with `replayed: true` and no new effect. Reject does not enforce minimum reschedule notice. Failures carry a stable `code`: 400 `api.validation_error`, `scheduling.invalid_schedule_change_request`, `scheduling.invalid_schedule_change_date` (also a `timeZone` other than the competition's), `scheduling.invalid_schedule_change_reason`, `scheduling.invalid_schedule_change_scope`; 403 `authorization.forbidden`, `scheduling.schedule_change_self_response_forbidden`, `scheduling.schedule_change_authority_not_required`; 404 `scheduling.schedule_change_encounter_not_found`, `scheduling.schedule_change_request_not_found`; 409 `scheduling.schedule_change_version_conflict`, `scheduling.schedule_change_proposal_stale`, `scheduling.schedule_change_request_closed`, `scheduling.schedule_change_response_window_closed`, `scheduling.schedule_change_consent_already_recorded`, `scheduling.schedule_change_idempotency_conflict`, `scheduling.schedule_change_approval_not_configured`, `scheduling.rescheduling_disabled`, `scheduling.encounter_not_editable_for_schedule_change`, `scheduling.reschedule_limit_reached`, `scheduling.fixture_update_conflict`.",
  params: pathParams(["encounterId", "requestId", "proposalId"]),
  body: RejectScheduleChangeProposalRequest,
  success: {
    status: 200,
    description: "The request as the command left it, or its replay",
    schema: ScheduleChangeCommandResponse,
  },
  errors: [400, 401, 403, 404, 409],
});

export const counterScheduleChangeProposalRoute = defineRoute({
  method: "post",
  path: "/encounters/{encounterId}/schedule-change-requests/{requestId}/proposals/{proposalId}/counter",
  operationId: "counterScheduleChangeProposal",
  tags: ["encounters"],
  summary: "Answer the current proposal with a new date in the competition time zone",
  description:
    "Answers the current proposal of an open request at `expectedVersion` only while API time is strictly before its persisted UTC responseDeadline. At the deadline or later it fails with 409 scheduling.schedule_change_response_window_closed even if the expiry runner is delayed. The actor comes from service authentication; `responder` (or `teamId`) is only the capacity claimed, and the server authorizes it. Repeating `commandKey` with the same payload replays the original outcome with `replayed: true` and no new effect. Create, counter and accept revalidate the stage's current minimum notice against the current and proposed times of every affected slot, including organizer consent. The exact boundary is inclusive; current times at or before now are exempt. Zero disables notice only: proposed dates must still be strictly future. A violation is 409 `scheduling.reschedule_notice_not_met`, with `details.anchor` equal to `current` or `proposed` (current takes priority). No request, consent, schedule or quota changes persist on denial. Recorded replays do not revalidate notice. Failures carry a stable `code`: 400 `api.validation_error`, `scheduling.invalid_schedule_change_request`, `scheduling.invalid_schedule_change_date` (also a `timeZone` other than the competition's), `scheduling.invalid_schedule_change_reason`, `scheduling.invalid_schedule_change_scope`; 403 `authorization.forbidden`, `scheduling.schedule_change_self_response_forbidden`, `scheduling.schedule_change_authority_not_required`; 404 `scheduling.schedule_change_encounter_not_found`, `scheduling.schedule_change_request_not_found`; 409 `scheduling.schedule_change_version_conflict`, `scheduling.schedule_change_proposal_stale`, `scheduling.schedule_change_request_closed`, `scheduling.schedule_change_response_window_closed`, `scheduling.schedule_change_consent_already_recorded`, `scheduling.schedule_change_idempotency_conflict`, `scheduling.schedule_change_approval_not_configured`, `scheduling.rescheduling_disabled`, `scheduling.encounter_not_editable_for_schedule_change`, `scheduling.reschedule_limit_reached`, `scheduling.fixture_update_conflict`.",
  params: pathParams(["encounterId", "requestId", "proposalId"]),
  body: CounterScheduleChangeProposalRequest,
  success: {
    status: 200,
    description: "The request as the command left it, or its replay",
    schema: ScheduleChangeCommandResponse,
  },
  errors: [400, 401, 403, 404, 409],
});

export const resolveScheduleChangeRequestRoute = defineRoute({
  method: "post",
  path: "/encounters/{encounterId}/schedule-change-requests/{requestId}/resolve",
  operationId: "resolveScheduleChangeRequest",
  tags: ["encounters"],
  summary:
    "Resolve an escalated request by setting a date, keeping it or recording walkover intent",
  description:
    "Requires encounters.reschedule.resolve for the Encounter scope. Only escalated requests can be resolved. schedule_set applies the request scope atomically and consumes the opening Team's quota; minimum notice does not block it. schedule_kept and walkover_intended keep the schedule and quota. Walkover is Scheduling intent only: no OfficialResult or official statistics are created. A nonempty reason, current proposal, expectedVersion and commandKey are required; identical retries replay the original outcome. Invalid outcomes produce 400 scheduling.invalid_schedule_change_resolution. Failures carry a stable `code`: 400 `api.validation_error`, `scheduling.invalid_schedule_change_request`, `scheduling.invalid_schedule_change_date` (also a `timeZone` other than the competition's), `scheduling.invalid_schedule_change_reason`, `scheduling.invalid_schedule_change_scope`; 403 `authorization.forbidden`, `scheduling.schedule_change_self_response_forbidden`, `scheduling.schedule_change_authority_not_required`; 404 `scheduling.schedule_change_encounter_not_found`, `scheduling.schedule_change_request_not_found`; 409 `scheduling.schedule_change_version_conflict`, `scheduling.schedule_change_proposal_stale`, `scheduling.schedule_change_request_closed`, `scheduling.schedule_change_response_window_closed`, `scheduling.schedule_change_consent_already_recorded`, `scheduling.schedule_change_idempotency_conflict`, `scheduling.schedule_change_approval_not_configured`, `scheduling.rescheduling_disabled`, `scheduling.encounter_not_editable_for_schedule_change`, `scheduling.reschedule_limit_reached`, `scheduling.fixture_update_conflict`.",
  params: pathParams(["encounterId", "requestId"]),
  body: ResolveScheduleChangeRequest,
  success: {
    status: 200,
    description: "Resolved request and audit, or replay",
    schema: ScheduleChangeCommandResponse,
  },
  errors: [400, 401, 403, 404, 409],
});
