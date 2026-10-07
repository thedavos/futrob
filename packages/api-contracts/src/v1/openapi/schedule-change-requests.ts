import { z } from "zod";
import {
  acceptScheduleChangeProposalRequestSchema,
  counterScheduleChangeProposalRequestSchema,
  createScheduleChangeRequestSchema,
  listScheduleChangeRequestsResponseSchema,
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
  "`scheduling.schedule_change_request_closed`, " +
  "`scheduling.schedule_change_consent_already_recorded`, " +
  "`scheduling.schedule_change_idempotency_conflict`, " +
  "`scheduling.schedule_change_approval_not_configured`, `scheduling.rescheduling_disabled`, " +
  "`scheduling.encounter_not_editable_for_schedule_change`, " +
  "`scheduling.reschedule_limit_reached`, `scheduling.fixture_update_conflict`.";

function responseCommand(operationId: string, summary: string, requestSchema: string) {
  return {
    post: {
      operationId,
      tags: ["encounters"],
      summary,
      description:
        "Answers the current proposal of an open request at `expectedVersion`. The actor comes " +
        "from service authentication; `responder` (or `teamId`) is only the capacity claimed, " +
        "and the server authorizes it. Repeating `commandKey` with the same payload replays " +
        `the original outcome with \`replayed: true\` and no new effect. ${commandFailures}`,
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
      summary: "Read one schedule-change request with its proposals, decisions and application",
      description:
        "Readable by actors who can read the Encounter; anyone else gets 404 " +
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
} as const;

const toSchema = (schema: z.ZodType, io: "input" | "output") =>
  z.toJSONSchema(schema, { target: "draft-2020-12", io });

export const scheduleChangeRequestOpenApiSchemas = {
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
