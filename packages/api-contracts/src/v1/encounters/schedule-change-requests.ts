import { z } from "zod";

export const competitionWallTimeSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  second: z.number().int().min(0).max(59),
});

export const rescheduleScopeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("entire_encounter") }),
  z.object({
    type: z.literal("official_match"),
    officialSlot: z.union([z.literal(1), z.literal(2)]),
  }),
]);

export const scheduleChangeProposalSchema = z.object({
  id: z.string().min(1),
  proposedStartAt: z.string().datetime(),
  proposedByActorId: z.string().min(1),
  proposedByTeamId: z.string().min(1),
  reason: z.string().min(1),
  createdAt: z.string().datetime(),
  responseDeadline: z.string().datetime(),
});

/** The capacity an actor claims; the server authorizes it, so claiming grants nothing. */
export const scheduleChangeResponderSchema = z.discriminatedUnion("authority", [
  z.object({ authority: z.literal("rival_team"), teamId: z.string().min(1) }),
  z.object({ authority: z.literal("organizer") }),
]);

export const scheduleChangeDecisionSchema = z.object({
  id: z.string().min(1),
  proposalId: z.string().min(1),
  /** Request version the responder answered. */
  requestVersion: z.number().int().positive(),
  kind: z.enum(["consent", "rejection"]),
  responder: scheduleChangeResponderSchema,
  actorId: z.string().min(1),
  reason: z.string().min(1).nullable(),
  createdAt: z.string().datetime(),
});

export const scheduleChangeApplicationSchema = z.object({
  id: z.string().min(1),
  proposalId: z.string().min(1),
  requestVersion: z.number().int().positive(),
  appliedByActorId: z.string().min(1),
  previousEncounterStartAt: z.string().datetime(),
  appliedEncounterStartAt: z.string().datetime(),
  /** Only the slots whose start moved. */
  slots: z
    .array(
      z.object({
        officialSlot: z.union([z.literal(1), z.literal(2)]),
        previousStartAt: z.string().datetime(),
        appliedStartAt: z.string().datetime(),
      }),
    )
    .min(1)
    .max(2),
  appliedAt: z.string().datetime(),
});

export const scheduleChangeResolutionSchema = z.discriminatedUnion("outcome", [
  z.object({
    outcome: z.literal("schedule_set"),
    reason: z.string().trim().min(1).max(500),
    proposedStartAt: z.string().datetime(),
  }),
  z.object({ outcome: z.literal("schedule_kept"), reason: z.string().trim().min(1).max(500) }),
  z.object({
    outcome: z.literal("walkover_intended"),
    reason: z.string().trim().min(1).max(500),
    winningTeamId: z.string().min(1),
  }),
]);

export type ScheduleChangeResolutionDto = z.infer<typeof scheduleChangeResolutionSchema>;

export const scheduleChangeActionSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["schedule_change_expired", "schedule_change_resolved"]),
  actorId: z.string().min(1),
  authority: z.enum(["system", "organizer"]),
  proposalId: z.string().min(1),
  fromVersion: z.number().int().positive(),
  toVersion: z.number().int().positive(),
  responseDeadline: z.string().datetime(),
  processedAt: z.string().datetime(),
  resolution: scheduleChangeResolutionSchema.nullable(),
});

export const scheduleChangeRequestSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  competitionId: z.string().min(1),
  encounterId: z.string().min(1),
  requestingTeamId: z.string().min(1),
  initiatedByActorId: z.string().min(1),
  scope: rescheduleScopeSchema,
  status: z.enum([
    "open",
    "accepted",
    "rejected",
    "cancelled",
    "expired",
    "escalated",
    "resolved_by_organizer",
  ]),
  /** Commands send it back as `expectedVersion`. */
  version: z.number().int().positive(),
  /** The only proposal commands may answer: the last one in `proposals`. */
  currentProposalId: z.string().min(1),
  proposals: z.array(scheduleChangeProposalSchema).min(1),
  decisions: z.array(scheduleChangeDecisionSchema),
  actions: z.array(scheduleChangeActionSchema),
  /**
   * What the reading actor may do now, by server time. Create and command responses carry
   * the request as the command left it, with empty capabilities: refetch the list.
   */
  allowedActions: z.array(z.enum(["accept", "reject", "counter", "resolve"])),
  /** The `responder` accept and reject send; counter always answers as the rival Team. */
  respondAs: scheduleChangeResponderSchema.nullable(),
  /** Each response action is either allowed or blocked here, never both. */
  blockedActions: z.array(
    z.object({
      action: z.enum(["accept", "reject", "counter"]),
      reason: z.enum([
        "request_closed",
        "response_window_closed",
        "own_proposal",
        "permission",
        "already_consented",
        "rescheduling_disabled",
        "result_protected",
      ]),
    }),
  ),
  /** The schedule applied by consent or organizer resolution; null for outcomes that keep it. */
  application: scheduleChangeApplicationSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ScheduleChangeRequestDto = z.infer<typeof scheduleChangeRequestSchema>;

export const createScheduleChangeRequestSchema = z.object({
  requestingTeamId: z.string().min(1),
  scope: rescheduleScopeSchema,
  proposedWallTime: competitionWallTimeSchema,
  reason: z.string().min(1),
  idempotencyKey: z.string().trim().min(1),
  timeZone: z.string().trim().min(1).optional(),
});

export type CreateScheduleChangeRequestBody = z.infer<typeof createScheduleChangeRequestSchema>;

/** What a new request by the reading actor may name; minimum notice is checked on submit. */
export const scheduleChangeCreationOptionsSchema = z.object({
  blockedReason: z.enum(["permission", "rescheduling_disabled"]).nullable(),
  /** Encounter Teams the actor may request for. */
  teams: z.array(
    z.object({
      teamId: z.string().min(1),
      blockedReason: z.enum(["limit_reached"]).nullable(),
    }),
  ),
  scopes: z.array(
    z.object({
      scope: rescheduleScopeSchema,
      currentStartAt: z.string().datetime(),
      blockedReason: z.enum(["active_request_exists", "result_protected"]).nullable(),
    }),
  ),
});

export type ScheduleChangeCreationOptionsDto = z.infer<typeof scheduleChangeCreationOptionsSchema>;

export const listScheduleChangeRequestsResponseSchema = z.object({
  requests: z.array(scheduleChangeRequestSchema),
  creation: scheduleChangeCreationOptionsSchema,
});

export type ListScheduleChangeRequestsResponse = z.infer<
  typeof listScheduleChangeRequestsResponseSchema
>;

export const scheduleChangeCommandResponseSchema = z.object({
  /** The request as this command left it; a replay returns that state, not a later one. */
  request: scheduleChangeRequestSchema,
  /** True when the command key had already produced this outcome. */
  replayed: z.boolean(),
});

export type ScheduleChangeCommandResponse = z.infer<typeof scheduleChangeCommandResponseSchema>;

const scheduleChangeCommandSchema = z.object({
  /** Request `version` the caller read. */
  expectedVersion: z.number().int().positive(),
  /** Client-chosen key; repeating it with the same payload returns the original outcome. */
  commandKey: z.string().trim().min(1).max(200),
});

export const acceptScheduleChangeProposalRequestSchema = scheduleChangeCommandSchema.extend({
  responder: scheduleChangeResponderSchema,
});

export const rejectScheduleChangeProposalRequestSchema = scheduleChangeCommandSchema.extend({
  responder: scheduleChangeResponderSchema,
  reason: z.string().optional(),
});

export const counterScheduleChangeProposalRequestSchema = scheduleChangeCommandSchema.extend({
  /** The rival Team of the current proposal, answering with a new date. */
  teamId: z.string().min(1),
  proposedWallTime: competitionWallTimeSchema,
  reason: z.string().min(1),
  timeZone: z.string().trim().min(1).optional(),
});

export type AcceptScheduleChangeProposalRequest = z.infer<
  typeof acceptScheduleChangeProposalRequestSchema
>;
export type RejectScheduleChangeProposalRequest = z.infer<
  typeof rejectScheduleChangeProposalRequestSchema
>;
export type CounterScheduleChangeProposalRequest = z.infer<
  typeof counterScheduleChangeProposalRequestSchema
>;

export const resolveScheduleChangeRequestSchema = scheduleChangeCommandSchema.extend({
  proposalId: z.string().min(1),
  resolution: scheduleChangeResolutionSchema,
});

export type ResolveScheduleChangeRequestBody = z.infer<typeof resolveScheduleChangeRequestSchema>;

export const runScheduleChangeExpiryResponseSchema = z.object({
  escalated: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
});
export type RunScheduleChangeExpiryResponse = z.infer<typeof runScheduleChangeExpiryResponseSchema>;
