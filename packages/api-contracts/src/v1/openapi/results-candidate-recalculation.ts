import { z } from "zod";
import { runCandidateRecalculationResponseSchema } from "../results-candidate-recalculation.ts";

export const candidateRecalculationOpenApiPaths = {
  "/internal/results/candidate-recalculation/run": {
    post: {
      operationId: "runCandidateRecalculation",
      tags: ["results"],
      summary: "Recalculate candidates of Encounters whose schedule change was applied",
      description:
        "Service-only Cron target authenticated with the internal bearer secret. Consumes the durable schedule change handoff, acknowledging each application after it converges, and recalculates candidate eligibility from the stored slot starts. Earlier references stay as ineligible evidence. It never applies a schedule, selects, approves or projects statistics. Retry delivers every unacknowledged application, including one whose transaction committed late.",
      responses: {
        "200": {
          description: "Applications recalculated in this run",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RunCandidateRecalculationResponse" },
            },
          },
        },
        "401": { $ref: "#/components/responses/ApiError" },
        "503": {
          description: "Service authentication or candidate data is unavailable",
          content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } },
        },
      },
    },
  },
} as const;

export const candidateRecalculationOpenApiSchemas = {
  RunCandidateRecalculationResponse: z.toJSONSchema(runCandidateRecalculationResponseSchema, {
    target: "draft-2020-12",
  }),
};
