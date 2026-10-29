import { z } from "zod";

export const ACTIVITY_PAGE_LIMIT = { default: 25, max: 50 } as const;

export const activityKindSchema = z.enum([
  "match_dispute",
  "selection_confirmation",
  "roster_invitation",
  "competition_published",
  "entry_invitation",
  "schedule_change",
  "organizer_decision",
  "competition_entry",
]);
export type ActivityKindDto = z.infer<typeof activityKindSchema>;

export const activityOutcomeSchema = z.enum([
  "entry_approved",
  "entry_rejected",
  "schedule_set",
  "schedule_kept",
  "walkover_intended",
]);
export type ActivityOutcomeDto = z.infer<typeof activityOutcomeSchema>;

export const activityStatusSchema = z.enum(["open", "closed"]);
export type ActivityStatusDto = z.infer<typeof activityStatusSchema>;

/** One fact for the requesting audience. `subject` only names things, never reasons. */
export const activityEntrySchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  competitionId: z.string().nullable(),
  audience: z.enum(["organization", "team", "actor"]),
  kind: activityKindSchema,
  status: activityStatusSchema,
  requiresAction: z.boolean(),
  resourceType: z.enum(["encounter", "roster_invitation", "competition", "entry_invitation"]),
  resourceId: z.string(),
  subject: z.object({
    competitionName: z.string().nullable(),
    encounterLabel: z.string().nullable(),
    teamName: z.string().nullable(),
    /** What an organizer decided; only `organizer_decision` rows carry it. */
    outcome: activityOutcomeSchema.nullable(),
  }),
  openedAt: z.string().datetime(),
  closedAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime().nullable(),
  lastEventAt: z.string().datetime(),
});
export type ActivityEntryDto = z.infer<typeof activityEntrySchema>;

const booleanQuerySchema = z.enum(["true", "false"]).transform((value) => value === "true");

/**
 * Query of both activity listings. Omit `status`/`requiresAction` for the full feed.
 * `organizationId` (personal feed only) and `competitionId` narrow the page to one space
 * before the limit applies.
 */
export const listActivitiesQuerySchema = z.object({
  organizationId: z.string().min(1).optional(),
  competitionId: z.string().min(1).optional(),
  status: activityStatusSchema.optional(),
  requiresAction: booleanQuerySchema.optional(),
  limit: z.coerce.number().int().min(1).max(ACTIVITY_PAGE_LIMIT.max).optional(),
  cursor: z.string().min(1).max(200).optional(),
});
export type ListActivitiesQuery = z.input<typeof listActivitiesQuerySchema>;

export const listActivitiesResponseSchema = z.object({
  activities: z.array(activityEntrySchema),
  /** Pass back as `cursor` for the next page; null on the last page. */
  nextCursor: z.string().nullable(),
});
export type ListActivitiesResponse = z.infer<typeof listActivitiesResponseSchema>;
