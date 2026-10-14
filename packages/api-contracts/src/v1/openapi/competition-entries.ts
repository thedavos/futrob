import { registerTeamEntryRequestSchema } from "../competitions/schemas.ts";
import {
  API_ERROR_RESPONSE,
  competitionIdParam,
  entryIdParam,
  jsonContent,
  organizationIdParam,
  zodOpenApiSchema,
} from "./openapi-fragments.ts";

const ENTRY_BASE = "/organizations/{organizationId}/competitions/{competitionId}/entries";

const scopeParameters = [organizationIdParam, competitionIdParam];

export const competitionEntriesOpenApiPaths = {
  [ENTRY_BASE]: {
    post: {
      operationId: "registerTeamEntry",
      tags: ["competitions"],
      summary: "Register an existing organization team as a competition entry",
      parameters: [...scopeParameters],
      requestBody: { required: true, content: jsonContent("RegisterTeamEntryRequest") },
      responses: {
        "201": {
          description: "Created entry",
          content: jsonContent("CompetitionEntry"),
        },
        "400": API_ERROR_RESPONSE,
        "401": API_ERROR_RESPONSE,
        "403": API_ERROR_RESPONSE,
        "404": API_ERROR_RESPONSE,
        "409": API_ERROR_RESPONSE,
      },
    },
  },
  [`${ENTRY_BASE}/{entryId}/approve`]: {
    post: {
      operationId: "approveTeamEntry",
      tags: ["competitions"],
      summary: "Approve a pending competition team entry",
      parameters: [...scopeParameters, entryIdParam],
      responses: {
        "200": {
          description: "Approved entry",
          content: jsonContent("CompetitionEntry"),
        },
        "401": API_ERROR_RESPONSE,
        "403": API_ERROR_RESPONSE,
        "404": API_ERROR_RESPONSE,
        "409": API_ERROR_RESPONSE,
      },
    },
  },
  [`${ENTRY_BASE}/{entryId}/reject`]: {
    post: {
      operationId: "rejectTeamEntry",
      tags: ["competitions"],
      summary: "Reject a pending competition team entry",
      parameters: [...scopeParameters, entryIdParam],
      responses: {
        "200": {
          description: "Rejected entry",
          content: jsonContent("CompetitionEntry"),
        },
        "401": API_ERROR_RESPONSE,
        "403": API_ERROR_RESPONSE,
        "404": API_ERROR_RESPONSE,
        "409": API_ERROR_RESPONSE,
      },
    },
  },
} as const;

export const competitionEntriesOpenApiSchemas = {
  RegisterTeamEntryRequest: zodOpenApiSchema(registerTeamEntryRequestSchema, "input"),
};
