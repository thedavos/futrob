import { z } from "zod";

export const encounterScheduleSnapshotSchema = z.object({
  encounterId: z.string().min(1),
  organizationId: z.string().min(1),
  competitionId: z.string().min(1),
  homeTeamId: z.string().min(1),
  awayTeamId: z.string().min(1),
  scheduledStartAt: z.string().datetime(),
  officialMatchCount: z.union([z.literal(1), z.literal(2)]),
  homeExternalClubId: z.string().min(1).nullable(),
  awayExternalClubId: z.string().min(1).nullable(),
  providerKey: z.string().min(1).nullable(),
});

export type EncounterScheduleSnapshotDto = z.infer<typeof encounterScheduleSnapshotSchema>;

export const upsertEncounterScheduleSnapshotRequestSchema = z.object({
  organizationId: z.string().min(1),
  competitionId: z.string().min(1),
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
  generationKey: z.string().min(1),
  organizationId: z.string().min(1),
  competitionId: z.string().min(1),
  rulesVersion: z.number().int().positive(),
  generationVersion: z.number().int().positive(),
  format: z.enum(["league", "knockout", "groups-knockout", "league-playoffs"]),
  timeZone: z.string().min(1),
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
