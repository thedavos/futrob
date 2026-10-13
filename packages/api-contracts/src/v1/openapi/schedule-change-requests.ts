import { z } from "zod";
import {
  acceptScheduleChangeProposalRequestSchema,
  counterScheduleChangeProposalRequestSchema,
  createScheduleChangeRequestSchema,
  listScheduleChangeRequestsResponseSchema,
  resolveScheduleChangeRequestSchema,
  runScheduleChangeExpiryResponseSchema,
  rejectScheduleChangeProposalRequestSchema,
  scheduleChangeCommandResponseSchema,
  scheduleChangeRequestSchema,
} from "../encounters/schemas.ts";

const BASE = "/encounters/{encounterId}/schedule-change-requests";
const PROPOSAL = `${BASE}/{requestId}/proposals/{proposalId}`;

const encounterParameter = {
  name: "encounterId",
  in: "path",
  required: true,
  schema: { type: "string" },
} as const;
const requestParameter = {
  name: "requestId",
  in: "path",
  required: true,
  schema: { type: "string" },
} as const;
const proposalParameter = {
  name: "proposalId",
  in: "path",
  required: true,
  schema: { type: "string" },
} as const;

const errorResponse = { $ref: "#/components/responses/ApiError" } as const;

const jsonContent = (schema: string) => ({
  "application/json": { schema: { $ref: `#/components/schemas/${schema}` } },
});

const commandFailures =
  "Failures carry a stable `code`: 400 `api.validation_error`, " +
  "`scheduling.invalid_schedule_change_request`, `scheduling.invalid_schedule_change_date` " +
  "(also a `timeZone` other than the competition's), `scheduling.invalid_schedule_change_reason`, " +
  "`scheduling.invalid_schedule_change_scope`; 403 `authorization.forbidden`, " +
  "`scheduling.schedule_change_self_response_forbidden`, " +
  "`scheduling.schedule_change_authority_not_required`; 404 " +
  "`scheduling.schedule_change_encounter_not_found`, " +
  "`scheduling.schedule_change_request_not_found`; 409 " +
  "`scheduling.schedule_change_version_conflict`, `scheduling.schedule_change_proposal_stale`, " +
  "`scheduling.schedule_change_request_closed`, `scheduling.schedule_change_response_window_closed`, " +
  "`scheduling.schedule_change_consent_already_recorded`, " +
  "`scheduling.schedule_change_idempotency_conflict`, " +
  "`scheduling.schedule_change_approval_not_configured`, `scheduling.rescheduling_disabled`, " +
  "`scheduling.encounter_not_editable_for_schedule_change`, " +
  "`scheduling.reschedule_limit_reached`, `scheduling.fixture_update_conflict`.";

const minimumNoticeRule =
  "Create, counter and accept revalidate the stage's current minimum notice against the " +
  "current and proposed times of every affected slot, including organizer consent. " +
  "The exact boundary is inclusive; current times at or before now are exempt. " +
  "Zero disables notice only: proposed dates must still be strictly future. " +
  "A violation is 409 `scheduling.reschedule_notice_not_met`, with " +
  "`details.anchor` equal to `current` or `proposed` (current takes priority). " +
  "No request, consent, schedule or quota changes persist on denial. " +
  "Recorded replays do not revalidate notice. ";

function responseCommand(operationId: string, summary: string, requestSchema: string) {
  return {
    post: {
      operationId,
      tags: ["encounters"],
      summary,
      description:
        "Answers the current proposal of an open request at `expectedVersion` only while API time is " +
        "strictly before its persisted UTC responseDeadline. At the deadline or later it fails with " +
        "409 scheduling.schedule_change_response_window_closed even if the expiry runner is delayed. " +
        "The actor comes " +
        "from service authentication; `responder` (or `teamId`) is only the capacity claimed, " +
        "and the server authorizes it. Repeating `commandKey` with the same payload replays " +
        `the original outcome with \`replayed: true\` and no new effect. ` +
        (operationId === "rejectScheduleChangeProposal"
          ? "Reject does not enforce minimum reschedule notice. "
          : minimumNoticeRule) +
        commandFailures,
      parameters: [encounterParameter, requestParameter, proposalParameter],
      requestBody: { required: true, content: jsonContent(requestSchema) },
      responses: {
        "200": {
          description: "The request as the command left it, or its replay",
          content: jsonContent("ScheduleChangeCommandResponse"),
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

export const scheduleChangeRequestOpenApiPaths = {
  "/internal/scheduling/reschedule-expiry/run": {
    post: {
      operationId: "runScheduleChangeExpiry",
      tags: ["encounters"],
      summary: "Recover expired schedule-change proposals and escalate pending requests",
      description:
        "Service-only runner authenticated with the internal bearer secret. Uses API time and the " +
        "existing provisioned SCHEDULING_SYSTEM_ACTOR_ID; accepts no caller actor or timestamp. " +
        "Processes durable pending work idempotently. The request remains active when escalated; " +
        "silence never changes the fixture, consumes quota or approves a result.",
      responses: {
        "200": {
          description: "Escalated and concurrently skipped requests in the batch",
          content: jsonContent("RunScheduleChangeExpiryResponse"),
        },
        "401": errorResponse,
        "409": errorResponse,
        "503": {
          description: "Provisioned system actor unavailable",
          content: jsonContent("ApiError"),
        },
      },
    },
  },
  [BASE]: {
    get: {
      operationId: "listScheduleChangeRequests",
      tags: ["encounters"],
      summary:
        "List authorized schedule-change requests for an encounter, including closed history",
      parameters: [encounterParameter],
      responses: {
        "200": {
          description: "Schedule-change requests in deterministic order",
          content: jsonContent("ListScheduleChangeRequestsResponse"),
        },
        "401": errorResponse,
        "404": errorResponse,
      },
    },
    post: {
      operationId: "createScheduleChangeRequest",
      tags: ["encounters"],
      summary: "Create a schedule-change request without changing the fixture",
      description:
        "The proposal stores its UTC responseDeadline anchored to API createdAt plus the stage's " +
        "rescheduleProposalExpiryHours (integer 1–72, default 12). It differs from minimum notice. " +
        "An escalated request remains active and blocks incompatible requests. " +
        minimumNoticeRule,
      parameters: [encounterParameter],
      requestBody: { required: true, content: jsonContent("CreateScheduleChangeRequest") },
      responses: {
        "200": {
          description: "Created or replayed request",
          content: jsonContent("ScheduleChangeRequest"),
        },
        "400": errorResponse,
        "401": errorResponse,
        "403": errorResponse,
        "404": errorResponse,
        "409": errorResponse,
      },
    },
  },
  [`${BASE}/{requestId}`]: {
    get: {
      operationId: "getScheduleChangeRequest",
      tags: ["encounters"],
      summary:
        "Read one schedule-change request with proposals, decisions, application and operator audit",
      description:
        "Includes allowedActions: resolve only for an escalated request when the authenticated actor " +
        "has encounters.reschedule.resolve. Readable by actors who can read the Encounter; anyone else gets 404 " +
        "`scheduling.schedule_change_encounter_not_found`. An unknown request, or one of another " +
        "Encounter, is 404 `scheduling.schedule_change_request_not_found`.",
      parameters: [encounterParameter, requestParameter],
      responses: {
        "200": {
          description: "The request and its full history",
          content: jsonContent("ScheduleChangeRequest"),
        },
        "401": errorResponse,
        "404": errorResponse,
      },
    },
  },
  [`${PROPOSAL}/accept`]: responseCommand(
    "acceptScheduleChangeProposal",
    "Consent to the current proposal; the last required consent applies the new schedule",
    "AcceptScheduleChangeProposalRequest",
  ),
  [`${PROPOSAL}/reject`]: responseCommand(
    "rejectScheduleChangeProposal",
    "Reject the current proposal and close the request without changing the schedule",
    "RejectScheduleChangeProposalRequest",
  ),
  [`${PROPOSAL}/counter`]: responseCommand(
    "counterScheduleChangeProposal",
    "Answer the current proposal with a new date in the competition time zone",
    "CounterScheduleChangeProposalRequest",
  ),
  [`${BASE}/{requestId}/resolve`]: {
    post: {
      operationId: "resolveScheduleChangeRequest",
      tags: ["encounters"],
      summary:
        "Resolve an escalated request by setting a date, keeping it or recording walkover intent",
      description:
        "Requires encounters.reschedule.resolve for the Encounter scope. Only escalated requests " +
        "can be resolved. schedule_set applies the request scope atomically and consumes the opening " +
        "Team's quota; minimum notice does not block it. schedule_kept and walkover_intended keep " +
        "the schedule and quota. Walkover is Scheduling intent only: no OfficialResult or official " +
        "statistics are created. A nonempty reason, current proposal, expectedVersion and commandKey " +
        "are required; identical retries replay the original outcome. Invalid outcomes produce 400 " +
        "scheduling.invalid_schedule_change_resolution. " +
        commandFailures,
      parameters: [encounterParameter, requestParameter],
      requestBody: { required: true, content: jsonContent("ResolveScheduleChangeRequest") },
      responses: {
        "200": {
          description: "Resolved request and audit, or replay",
          content: jsonContent("ScheduleChangeCommandResponse"),
        },
        "400": errorResponse,
        "401": errorResponse,
        "403": errorResponse,
        "404": errorResponse,
        "409": errorResponse,
      },
    },
  },
} as const;

const toSchema = (schema: z.ZodType, io: "input" | "output") =>
  z.toJSONSchema(schema, { target: "draft-2020-12", io });

export const scheduleChangeRequestOpenApiSchemas = {
  RunScheduleChangeExpiryResponse: toSchema(runScheduleChangeExpiryResponseSchema, "output"),
  ResolveScheduleChangeRequest: toSchema(resolveScheduleChangeRequestSchema, "input"),
  ScheduleChangeRequest: toSchema(scheduleChangeRequestSchema, "output"),
  ListScheduleChangeRequestsResponse: toSchema(listScheduleChangeRequestsResponseSchema, "output"),
  ScheduleChangeCommandResponse: toSchema(scheduleChangeCommandResponseSchema, "output"),
  CreateScheduleChangeRequest: toSchema(createScheduleChangeRequestSchema, "input"),
  AcceptScheduleChangeProposalRequest: toSchema(acceptScheduleChangeProposalRequestSchema, "input"),
  RejectScheduleChangeProposalRequest: toSchema(rejectScheduleChangeProposalRequestSchema, "input"),
  CounterScheduleChangeProposalRequest: toSchema(
    counterScheduleChangeProposalRequestSchema,
    "input",
  ),
};
