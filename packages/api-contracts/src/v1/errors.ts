import { z } from "zod";
import { requestIdSchema } from "./request-correlation.ts";

/** Typed wire props for expected failures (ADR-0011). Keep keys stable for i18n/clients. */
export const apiErrorDetailsSchema = z
  .object({
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
