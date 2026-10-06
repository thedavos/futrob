import { z } from "zod";
import { externalClubSchema } from "../game-data/schemas.ts";
import { requestIdSchema } from "../request-correlation.ts";

export const encounterScheduleSnapshotSchema = z.object({
  encounterId: z.string().min(1),
  organizationId: z.string().min(1),
  competitionId: z.string().min(1),
  stageId: z.string().min(1),
  homeTeamId: z.string().min(1),
  awayTeamId: z.string().min(1),
  scheduledStartAt: z.string().datetime(),
  officialMatchCount: z.union([z.literal(1), z.literal(2)]),
  homeExternalClubId: z.string().min(1).nullable(),
  awayExternalClubId: z.string().min(1).nullable(),
  providerKey: z.string().min(1).nullable(),
  /** Start of every slot the Encounter plays; an `official_match` reschedule moves one. */
  officialMatches: z
    .array(
      z.object({
        officialSlot: z.union([z.literal(1), z.literal(2)]),
        scheduledStartAt: z.string().datetime(),
      }),
    )
    .min(1)
    .max(2),
});

export type EncounterScheduleSnapshotDto = z.infer<typeof encounterScheduleSnapshotSchema>;

export const upsertEncounterScheduleSnapshotRequestSchema = z.object({
  organizationId: z.string().min(1),
  competitionId: z.string().min(1),
  stageId: z.string().min(1),
  homeTeamId: z.string().min(1),
  awayTeamId: z.string().min(1),
  scheduledStartAt: z.string().datetime(),
  officialMatchCount: z.union([z.literal(1), z.literal(2)]),
});

export type UpsertEncounterScheduleSnapshotRequest = z.infer<
  typeof upsertEncounterScheduleSnapshotRequestSchema
>;

export const fixtureParticipantSlotSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("team"), teamId: z.string().min(1) }),
  z.object({ kind: z.literal("bye") }),
  z.object({ kind: z.literal("winner"), encounterId: z.string().min(1) }),
  z.object({
    kind: z.literal("group-rank"),
    stageId: z.string().min(1),
    groupId: z.string().min(1),
    rank: z.number().int().positive(),
  }),
  z.object({
    kind: z.literal("stage-rank"),
    stageId: z.string().min(1),
    rank: z.number().int().positive(),
  }),
]);

export const fixtureSeriesSchema = z.object({
  id: z.string().min(1),
  resolutionMode: z.enum(["independent_matches", "aggregate_score"]),
  officialMatches: z
    .array(
      z.object({
        id: z.string().min(1),
        slot: z.union([z.literal(1), z.literal(2)]),
      }),
    )
    .min(1)
    .max(2),
});

export const fixtureEncounterSchema = z.object({
  id: z.string().min(1),
  stageId: z.string().min(1),
  roundId: z.string().min(1),
  order: z.number().int().positive(),
  groupId: z.string().min(1).optional(),
  home: fixtureParticipantSlotSchema,
  away: fixtureParticipantSlotSchema,
  scheduledStartAt: z.string().datetime(),
  officialMatchCount: z.union([z.literal(1), z.literal(2)]),
  series: fixtureSeriesSchema.nullable(),
});

export const fixtureRoundSchema = z.object({
  id: z.string().min(1),
  stageId: z.string().min(1),
  number: z.number().int().positive(),
  scheduledStartAt: z.string().datetime(),
  encounters: z.array(fixtureEncounterSchema),
});

export const fixtureStageSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["league", "groups", "knockout", "playoffs"]),
  order: z.number().int().positive(),
  rounds: z.array(fixtureRoundSchema),
});

export const fixturePlanSchema = z.object({
  id: z.string().min(1),
  revision: z.number().int().positive(),
  status: z.enum(["active", "superseded"]),
  generationKey: z.string().min(1),
  organizationId: z.string().min(1),
  competitionId: z.string().min(1),
  rulesVersion: z.number().int().positive(),
  generationVersion: z.number().int().positive(),
  format: z.enum(["league", "knockout", "groups-knockout", "league-playoffs"]),
  timeZone: z.string().min(1),
  homeAndAway: z.boolean(),
  seed: z.array(z.string().min(1)).min(2),
  stages: z.array(fixtureStageSchema).min(1),
});

export type FixturePlanDto = z.infer<typeof fixturePlanSchema>;
export type FixtureEncounterDto = z.infer<typeof fixtureEncounterSchema>;

export const generateCompetitionFixtureRequestSchema = z.object({
  generationVersion: z.number().int().positive(),
  startsAt: z.string().datetime(),
  roundIntervalDays: z.number().int().positive(),
  homeAndAway: z.boolean().default(false),
  seed: z.array(z.string().min(1)).min(2).optional(),
  groups: z
    .object({
      count: z.number().int().min(2),
      qualifiersPerGroup: z.number().int().positive(),
    })
    .optional(),
  playoffs: z.object({ teamCount: z.number().int().min(2) }).optional(),
});

export type GenerateCompetitionFixtureRequest = z.infer<
  typeof generateCompetitionFixtureRequestSchema
>;

export const editFixtureEncounterRequestSchema = z
  .object({
    scheduledStartAt: z.string().datetime().optional(),
    homeTeamId: z.string().min(1).optional(),
    awayTeamId: z.string().min(1).optional(),
    reason: z.string().trim().min(1).max(500),
    requestId: requestIdSchema.optional(),
  })
  .superRefine((value, context) => {
    const changesSchedule = value.scheduledStartAt !== undefined;
    const changesPairing = value.homeTeamId !== undefined || value.awayTeamId !== undefined;
    if (!changesSchedule && !changesPairing) {
      context.addIssue({ code: "custom", message: "A schedule or pairing change is required" });
    }
    if ((value.homeTeamId === undefined) !== (value.awayTeamId === undefined)) {
      context.addIssue({ code: "custom", message: "Both Team IDs are required for a pairing" });
    }
    if (value.homeTeamId && value.homeTeamId === value.awayTeamId) {
      context.addIssue({ code: "custom", message: "Fixture Teams must be different" });
    }
  });

export type EditFixtureEncounterRequest = z.infer<typeof editFixtureEncounterRequestSchema>;

export const nextEncounterSideSchema = z.object({
  teamId: z.string().min(1),
  name: z.string().min(1),
  externalClub: externalClubSchema.nullable(),
});

export const nextEncounterSchema = z.object({
  encounterId: z.string().min(1),
  competition: z.object({
    id: z.string().min(1),
    organizationId: z.string().min(1),
    name: z.string().min(1),
    timeZone: z.string().min(1),
  }),
  round: z
    .object({
      number: z.number().int().positive(),
      total: z.number().int().positive().nullable(),
    })
    .nullable(),
  scheduledStartAt: z.string().datetime(),
  officialMatchCount: z.union([z.literal(1), z.literal(2)]),
  home: nextEncounterSideSchema,
  away: nextEncounterSideSchema,
});

export type NextEncounterDto = z.infer<typeof nextEncounterSchema>;

export const getMyNextEncounterResponseSchema = z.object({
  encounter: nextEncounterSchema.nullable(),
});

export type GetMyNextEncounterResponse = z.infer<typeof getMyNextEncounterResponseSchema>;

const encounterCandidateTeamSchema = z.object({
  externalClubId: z.string().min(1),
  name: z.string().min(1),
  goals: z.number().int().nonnegative(),
  imageUrl: z.string().nullable(),
});

export const encounterCandidateSchema = z.object({
  reference: z.object({
    providerKey: z.string().min(1),
    externalId: z.string().min(1),
  }),
  occurredAt: z.string().datetime(),
  home: encounterCandidateTeamSchema,
  away: encounterCandidateTeamSchema,
  game: z.object({
    edition: z.string().min(1),
    platform: z.string().min(1),
    mode: z.string().min(1),
  }),
  metadata: z.object({
    durationSeconds: z.number().int().nonnegative().nullable(),
    wasDisconnected: z.boolean(),
    winnerByForfeit: z.boolean(),
    completeness: z.enum(["complete", "partial", "unknown"]),
  }),
  playerObservationCount: z.number().int().nonnegative(),
});

export const listEncounterCandidatesResponseSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ready"),
    window: z.object({
      from: z.string().datetime(),
      to: z.string().datetime(),
    }),
    candidates: z.array(encounterCandidateSchema),
  }),
  z.object({
    status: z.literal("clubs_not_connected"),
    sides: z
      .array(z.enum(["home", "away"]))
      .min(1)
      .max(2),
  }),
  z.object({
    status: z.literal("provider_mismatch"),
  }),
]);

export type EncounterCandidateDto = z.infer<typeof encounterCandidateSchema>;
export type ListEncounterCandidatesResponse = z.infer<typeof listEncounterCandidatesResponseSchema>;

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

export const scheduleChangeRequestSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  competitionId: z.string().min(1),
  encounterId: z.string().min(1),
  requestingTeamId: z.string().min(1),
  initiatedByActorId: z.string().min(1),
  scope: rescheduleScopeSchema,
  status: z.enum(["open", "accepted", "rejected", "cancelled", "expired", "escalated"]),
  /** Commands send it back as `expectedVersion`. */
  version: z.number().int().positive(),
  /** The only proposal commands may answer: the last one in `proposals`. */
  currentProposalId: z.string().min(1),
  proposals: z.array(scheduleChangeProposalSchema).min(1),
  decisions: z.array(scheduleChangeDecisionSchema),
  /** The schedule applied when the request became `accepted`; null otherwise. */
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

export const listScheduleChangeRequestsResponseSchema = z.object({
  requests: z.array(scheduleChangeRequestSchema),
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
