import { z } from "zod";

export const emailLocaleSchema = z.enum(["es", "en"]);
export type EmailLocaleDto = z.infer<typeof emailLocaleSchema>;

/**
 * The actor's email settings. `nonCriticalEmail: false` stops reminders and updates;
 * email that asks the actor to act or tells them about a decision still arrives.
 */
export const emailPreferencesSchema = z.object({
  locale: emailLocaleSchema,
  nonCriticalEmail: z.boolean(),
});
export type EmailPreferencesDto = z.infer<typeof emailPreferencesSchema>;

export const getEmailPreferencesResponseSchema = emailPreferencesSchema;
export type GetEmailPreferencesResponse = z.infer<typeof getEmailPreferencesResponseSchema>;

export const saveEmailPreferencesRequestSchema = emailPreferencesSchema;
export type SaveEmailPreferencesRequest = z.infer<typeof saveEmailPreferencesRequestSchema>;

export const saveEmailPreferencesResponseSchema = emailPreferencesSchema;
export type SaveEmailPreferencesResponse = z.infer<typeof saveEmailPreferencesResponseSchema>;

/** The opaque token of an unsubscribe link; it only turns non-critical email off. */
export const unsubscribeEmailRequestSchema = z.object({
  token: z.string().min(1).max(200),
});
export type UnsubscribeEmailRequest = z.infer<typeof unsubscribeEmailRequestSchema>;

export const unsubscribeEmailResponseSchema = z.object({
  nonCriticalEmail: z.literal(false),
});
export type UnsubscribeEmailResponse = z.infer<typeof unsubscribeEmailResponseSchema>;

export const runEmailDispatchResponseSchema = z.object({
  sent: z.number().int().nonnegative(),
  retried: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
});
export type RunEmailDispatchResponse = z.infer<typeof runEmailDispatchResponseSchema>;
