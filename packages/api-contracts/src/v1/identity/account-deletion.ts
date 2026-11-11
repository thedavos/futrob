import { z } from "zod";

/** Responsibility the account holder must hand over before deleting the account. */
export const accountDeletionBlockerSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("sole-organizer"),
    organizationId: z.string().min(1),
    organizationName: z.string(),
  }),
  z.object({
    kind: z.literal("active-captain"),
    competitionId: z.string().min(1),
    competitionName: z.string(),
    teamId: z.string().min(1),
    teamName: z.string(),
  }),
]);
export type AccountDeletionBlockerDto = z.infer<typeof accountDeletionBlockerSchema>;

export const accountDeletionStateSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("active") }),
  z.object({
    status: z.literal("scheduled"),
    requestedAt: z.iso.datetime(),
    /** After this instant the account is anonymized and can no longer sign in. */
    scheduledFor: z.iso.datetime(),
  }),
]);
export type AccountDeletionStateDto = z.infer<typeof accountDeletionStateSchema>;

export const accountDeletionStatusSchema = z.object({
  deletion: accountDeletionStateSchema,
  blockers: z.array(accountDeletionBlockerSchema),
});
export type AccountDeletionStatusDto = z.infer<typeof accountDeletionStatusSchema>;

export const getAccountDeletionResponseSchema = accountDeletionStatusSchema;
export type GetAccountDeletionResponse = z.infer<typeof getAccountDeletionResponseSchema>;

export const requestAccountDeletionRequestSchema = z.object({
  /** Current password, re-entered to confirm it is the account holder. */
  password: z.string().min(1).max(128),
});
export type RequestAccountDeletionRequest = z.infer<typeof requestAccountDeletionRequestSchema>;

export const requestAccountDeletionResponseSchema = accountDeletionStatusSchema;
export type RequestAccountDeletionResponse = z.infer<typeof requestAccountDeletionResponseSchema>;

export const cancelAccountDeletionResponseSchema = accountDeletionStatusSchema;
export type CancelAccountDeletionResponse = z.infer<typeof cancelAccountDeletionResponseSchema>;

export const runAccountDeletionResponseSchema = z.object({
  deleted: z.number().int().nonnegative(),
  postponed: z.number().int().nonnegative(),
});
export type RunAccountDeletionResponse = z.infer<typeof runAccountDeletionResponseSchema>;
