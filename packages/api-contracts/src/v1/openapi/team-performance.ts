import { z } from "zod";
import { teamPerformanceRankingSnapshotSchema } from "../statistics/team-performance.schemas.ts";

export const teamPerformanceOpenApiPaths = {
  "/organizations/{organizationId}/competitions/{competitionId}/team-performance-ranking": {
    get: {
      operationId: "getTeamPerformanceRanking",
      tags: ["statistics"],
      summary: "Read the versioned official team performance ranking, separate from standings",
      parameters: [
        { name: "organizationId", in: "path", required: true, schema: { type: "string" } },
        { name: "competitionId", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: {
        "200": {
          description:
            "Ranking with component coverage, or null before the first rebuild. Incomplete rows have no score or position.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GetTeamPerformanceRankingResponse" },
            },
          },
        },
        "401": { $ref: "#/components/responses/ApiError" },
        "403": { $ref: "#/components/responses/ApiError" },
      },
    },
  },
} as const;

export const teamPerformanceOpenApiSchemas = {
  TeamPerformanceRankingSnapshot: z.toJSONSchema(teamPerformanceRankingSnapshotSchema, {
    target: "draft-2020-12",
  }),
  GetTeamPerformanceRankingResponse: {
    type: "object",
    required: ["ranking"],
    properties: {
      ranking: {
        anyOf: [{ $ref: "#/components/schemas/TeamPerformanceRankingSnapshot" }, { type: "null" }],
      },
    },
  },
};
