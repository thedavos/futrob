import { z } from "zod";
import { requestIdSchema } from "./request-correlation.ts";

/** Typed wire props for expected failures (ADR-0011). Keep keys stable for i18n/clients. */
/** Which plan limit stopped an action (HTTP 402, ADR-0025). */
export const planLimitDetailSchema = z.enum([
  "active_competitions",
  "teams_per_competition",
  "staff_members",
  "provider_sync_jobs",
]);

export const apiErrorDetailsSchema = z
  .object({
    anchor: z.enum(["current", "proposed"]).optional(),
    organizationId: z.string().optional(),
    role: z.string().optional(),
    status: z.string().optional(),
    path: z.string().optional(),
    body: z.unknown().optional(),
    issues: z.unknown().optional(),
    externalClubId: z.string().optional(),
    cause: z.unknown().optional(),
    completedPath: z.string().optional(),
    requestedPath: z.string().optional(),
    /** Plan gating (HTTP 402, ADR-0025): which limit stopped the action and its ceiling. */
    planLimit: planLimitDetailSchema.optional(),
    max: z.number().int().nonnegative().optional(),
    used: z.number().int().nonnegative().optional(),
    resetsAt: z.iso.datetime().optional(),
    format: z.string().optional(),
  })
  .strict();

export type ApiErrorDetails = z.infer<typeof apiErrorDetailsSchema>;

export const apiErrorSchema = z.object({
  code: z.string(),
  messageKey: z.string(),
  requestId: requestIdSchema.optional(),
  retryAfterSeconds: z.number().int().positive().optional(),
  details: apiErrorDetailsSchema.optional(),
});

export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
