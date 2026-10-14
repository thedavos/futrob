import { getMyGameProfileResponseSchema } from "../game-data/schemas.ts";
import {
  getMyTeamsResponseSchema,
  setActiveTeamRequestSchema,
  setActiveTeamResponseSchema,
} from "../teams/schemas.ts";
import { API_ERROR_RESPONSE, jsonContent, zodOpenApiSchema } from "./openapi-fragments.ts";

export const playerMeSurfaceOpenApiPaths = {
  "/players/me/game-profile": {
    get: {
      operationId: "getMyGameProfile",
      tags: ["players"],
      summary: "Read the authenticated player's provider game profile",
      parameters: [
        { name: "externalClubId", in: "query", required: false, schema: { type: "string" } },
        {
          name: "from",
          in: "query",
          required: false,
          schema: { type: "string", format: "date-time" },
        },
        {
          name: "to",
          in: "query",
          required: false,
          schema: { type: "string", format: "date-time" },
        },
      ],
      responses: {
        "200": {
          description: "Ready profile or a missing-club/account state",
          content: jsonContent("GetMyGameProfileResponse"),
        },
        "400": API_ERROR_RESPONSE,
        "401": API_ERROR_RESPONSE,
        "503": API_ERROR_RESPONSE,
      },
    },
  },
  "/players/me/teams": {
    get: {
      operationId: "getMyTeams",
      tags: ["teams"],
      summary: "List roster memberships of the authenticated player",
      responses: {
        "200": {
          description: "Memberships and the active roster id",
          content: jsonContent("GetMyTeamsResponse"),
        },
        "401": API_ERROR_RESPONSE,
      },
    },
  },
  "/players/me/active-team": {
    put: {
      operationId: "setMyActiveTeam",
      tags: ["teams"],
      summary: "Select the authenticated player's active roster membership",
      requestBody: { required: true, content: jsonContent("SetActiveTeamRequest") },
      responses: {
        "200": {
          description: "Persisted active roster membership",
          content: jsonContent("SetActiveTeamResponse"),
        },
        "400": API_ERROR_RESPONSE,
        "401": API_ERROR_RESPONSE,
        "403": API_ERROR_RESPONSE,
        "404": API_ERROR_RESPONSE,
      },
    },
  },
} as const;

export const playerMeSurfaceOpenApiSchemas = {
  GetMyGameProfileResponse: zodOpenApiSchema(getMyGameProfileResponseSchema, "output"),
  GetMyTeamsResponse: zodOpenApiSchema(getMyTeamsResponseSchema, "output"),
  SetActiveTeamRequest: zodOpenApiSchema(setActiveTeamRequestSchema, "input"),
  SetActiveTeamResponse: zodOpenApiSchema(setActiveTeamResponseSchema, "output"),
};
