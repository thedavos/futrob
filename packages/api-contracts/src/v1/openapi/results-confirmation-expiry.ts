import { z } from "zod";
import { runConfirmationExpiryResponseSchema } from "../results-confirmation-expiry.ts";

export const confirmationExpiryOpenApiPaths = {
  "/internal/results/confirmation-expiry/run": {
    post: {
      operationId: "runConfirmationExpiry",
      tags: ["results"],
      summary: "Recover up to 50 expired opponent confirmation windows",
      description:
        "Service-only Cron target authenticated with the internal bearer secret. Uses the API clock and configured provisioned RESULTS_SYSTEM_ACTOR_ID; accepts no actor or timestamp from callers. Silence moves the selection to organizer_review and never approves a result. Retry discovers durable pending work.",
      responses: {
        "200": {
          description: "Expired and concurrently skipped selections in this batch",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RunConfirmationExpiryResponse" },
            },
          },
        },
        "401": { $ref: "#/components/responses/ApiError" },
        "409": { $ref: "#/components/responses/ApiError" },
        "503": {
          description: "Service authentication or the provisioned system actor is unavailable",
          content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } },
        },
      },
    },
  },
} as const;

export const confirmationExpiryOpenApiSchemas = {
  RunConfirmationExpiryResponse: z.toJSONSchema(runConfirmationExpiryResponseSchema, {
    target: "draft-2020-12",
  }),
};
